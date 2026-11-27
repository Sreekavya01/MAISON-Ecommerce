const MAX_REQUEST_BYTES = 120000;
const MAX_HTML_LENGTH = 100000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

const parseAllowedOrigins = (value) =>
  new Set(
    String(value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

const getCorsHeaders = (origin, allowedOrigins) => {
  if (!origin || !allowedOrigins.has(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, Idempotency-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const jsonResponse = (
  body,
  status,
  origin,
  allowedOrigins
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(origin, allowedOrigins),
    },
  });

const safeEqual = (first, second) => {
  const firstValue = String(first || '');
  const secondValue = String(second || '');
  const maximumLength = Math.max(
    firstValue.length,
    secondValue.length
  );
  let difference = firstValue.length ^ secondValue.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |=
      (firstValue.charCodeAt(index) || 0) ^
      (secondValue.charCodeAt(index) || 0);
  }

  return difference === 0;
};

const getBearerToken = (request) => {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : '';
};

const isValidEmail = (value) =>
  value.length <= 320 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidSender = (value) => {
  const addressMatch = value.match(/<([^<>]+)>$/);
  const address = addressMatch ? addressMatch[1] : value;

  return isValidEmail(address.trim());
};

const validateEmailRequest = (body) => {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return 'The request body must be a JSON object.';
  }

  const allowedKeys = new Set([
    'to',
    'subject',
    'html',
    'idempotencyKey',
  ]);

  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return 'The request contains unsupported fields.';
  }

  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const html = String(body.html || '').trim();
  const idempotencyKey = String(
    body.idempotencyKey || ''
  ).trim();

  if (!isValidEmail(to)) {
    return 'A valid recipient email is required.';
  }

  if (
    !subject ||
    subject.length > MAX_SUBJECT_LENGTH
  ) {
    return 'The email subject is invalid.';
  }

  if (!html || html.length > MAX_HTML_LENGTH) {
    return 'The email HTML is invalid.';
  }

  if (
    idempotencyKey &&
    (
      idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH ||
      !/^[a-zA-Z0-9._:-]+$/.test(idempotencyKey)
    )
  ) {
    return 'The idempotency key is invalid.';
  }

  return null;
};

const handleRequest = async (request, env) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = parseAllowedOrigins(
    env.ALLOWED_ORIGINS
  );

  if (request.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin)) {
      return jsonResponse(
        {
          success: false,
          message: 'Origin not allowed.',
        },
        403,
        origin,
        allowedOrigins
      );
    }

    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin, allowedOrigins),
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        message: 'Method not allowed.',
      },
      405,
      origin,
      allowedOrigins
    );
  }

  const serviceToken = String(
    env.EMAIL_SERVICE_TOKEN || ''
  ).trim();
  const resendApiKey = String(
    env.RESEND_API_KEY || ''
  ).trim();
  const sender = String(
    env.RESEND_FROM_EMAIL || ''
  ).trim();

  if (!serviceToken || !resendApiKey || !isValidSender(sender)) {
    return jsonResponse(
      {
        success: false,
        message: 'Email service configuration is incomplete.',
      },
      503,
      origin,
      allowedOrigins
    );
  }

  if (!safeEqual(getBearerToken(request), serviceToken)) {
    return jsonResponse(
      {
        success: false,
        message: 'Forbidden.',
      },
      403,
      origin,
      allowedOrigins
    );
  }

  const declaredLength = Number(
    request.headers.get('Content-Length') || 0
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      {
        success: false,
        message: 'Request body is too large.',
      },
      413,
      origin,
      allowedOrigins
    );
  }

  const requestText = await request.text();

  if (
    new TextEncoder().encode(requestText).length >
    MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      {
        success: false,
        message: 'Request body is too large.',
      },
      413,
      origin,
      allowedOrigins
    );
  }

  let body;

  try {
    body = JSON.parse(requestText);
  } catch {
    return jsonResponse(
      {
        success: false,
        message: 'Request body must contain valid JSON.',
      },
      400,
      origin,
      allowedOrigins
    );
  }

  const validationError = validateEmailRequest(body);

  if (validationError) {
    return jsonResponse(
      {
        success: false,
        message: validationError,
      },
      400,
      origin,
      allowedOrigins
    );
  }

  const resendHeaders = {
    Authorization: 'Bearer ' + resendApiKey,
    'Content-Type': 'application/json',
  };

  if (body.idempotencyKey) {
    resendHeaders['Idempotency-Key'] = body.idempotencyKey;
  }

  const resendResponse = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: resendHeaders,
      body: JSON.stringify({
        from: sender,
        to: [String(body.to).trim()],
        subject: String(body.subject).trim(),
        html: String(body.html),
      }),
    }
  );

  const resendText = await resendResponse.text();
  let resendResult = {};

  if (resendText) {
    try {
      resendResult = JSON.parse(resendText);
    } catch {
      resendResult = {
        message: resendText.slice(0, 500),
      };
    }
  }

  if (!resendResponse.ok) {
    console.error('Resend rejected an email request.', {
      status: resendResponse.status,
      name: resendResult.name || null,
      message: resendResult.message || null,
    });

    return jsonResponse(
      {
        success: false,
        message:
          resendResult.message ||
          'Resend rejected the email.',
        errorType: resendResult.name || null,
      },
      resendResponse.status,
      origin,
      allowedOrigins
    );
  }

  return jsonResponse(
    {
      success: true,
      message: 'Email accepted by Resend.',
      result: {
        id: resendResult.id || null,
      },
    },
    200,
    origin,
    allowedOrigins
  );
};

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Unhandled email Worker error.', {
        message: error.message,
      });

      const origin = request.headers.get('Origin') || '';
      const allowedOrigins = parseAllowedOrigins(
        env.ALLOWED_ORIGINS
      );

      return jsonResponse(
        {
          success: false,
          message: 'Email service failed unexpectedly.',
        },
        500,
        origin,
        allowedOrigins
      );
    }
  },
};
