# MAISON email Worker

This Worker is the only service that holds the Resend API key. Browser
code calls the authenticated Firebase callable function instead of
calling this Worker directly.

## Required Cloudflare secrets

Configure these with Wrangler. Never put their values in this repository:

    npx wrangler login
    npx wrangler secret put RESEND_API_KEY
    npx wrangler secret put RESEND_FROM_EMAIL
    npx wrangler secret put EMAIL_SERVICE_TOKEN

- RESEND_API_KEY must be an active Resend key with sending permission.
- RESEND_FROM_EMAIL must use a domain whose sending status is Verified in
  Resend, for example: MAISON <shipping@your-domain>.
- EMAIL_SERVICE_TOKEN must be a long random value and must exactly match
  the Firebase Functions secret with the same name.

Set the matching Firebase secret from the repository root:

    cd functions
    npx firebase login
    npx firebase functions:secrets:set EMAIL_SERVICE_TOKEN
    cd ..

## Deploy

    cd worker
    npm install
    npm run deploy
    cd ..
    npm --prefix functions run deploy

If the storefront uses a custom production domain, add that exact origin
to ALLOWED_ORIGINS in wrangler.toml before deployment.

## Verification

1. Confirm the sender domain shows Verified under Resend Domains.
2. Confirm all three Worker secrets exist with:
   npx wrangler secret list
3. Confirm the Firebase secret exists with:
   npx firebase functions:secrets:access EMAIL_SERVICE_TOKEN
4. Change a test order to Shipped from the authenticated admin page.
5. Check Firebase Functions logs, Cloudflare Worker logs, and Resend Logs
   for the accepted message ID.
