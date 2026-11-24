import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Mail } from 'lucide-react';
import SEO from '../components/SEO';
import './PolicyPage.css';

const POLICY_CONTENT = {
  privacy: {
    eyebrow: 'YOUR PRIVACY',
    title: 'Privacy Policy',
    description: 'How MAISON collects, uses, protects and manages your personal information.',
    sections: [
      {
        title: 'Information we collect',
        paragraphs: [
          'We collect information you provide when you create an account, place an order, save an address, contact support, request a quotation or use other MAISON services. This can include your name, email address, phone number, delivery address, order details and communications.',
          'We may also collect limited technical information such as browser type, device information and activity needed to operate, secure and improve the website.',
        ],
      },
      {
        title: 'How we use information',
        bullets: [
          'Process orders, payments, deliveries, returns and refunds.',
          'Provide account features, customer service and quotation support.',
          'Prevent fraud, protect our services and meet legal obligations.',
          'Improve MAISON products, services and the shopping experience.',
          'Send service updates and, where permitted, relevant offers.',
        ],
      },
      {
        title: 'Sharing and service providers',
        paragraphs: [
          'We share information only when necessary with trusted providers that support payments, delivery, hosting, analytics, authentication or customer service. These providers may use the information only to perform services for MAISON or as required by law.',
          'We do not sell your personal information.',
        ],
      },
      {
        title: 'Data retention and security',
        paragraphs: [
          'We retain information for as long as needed to provide services, maintain transaction records, resolve disputes and meet legal requirements. We use reasonable administrative and technical safeguards, although no online service can guarantee absolute security.',
        ],
      },
      {
        title: 'Your choices and rights',
        paragraphs: [
          'You may review or update certain account information through your MAISON account. You may also contact us to ask about access, correction or deletion of personal information, subject to applicable legal and record-keeping requirements.',
        ],
      },
      {
        title: 'Updates to this policy',
        paragraphs: [
          'We may update this policy when our services or legal obligations change. The revised version will be posted on this page with an updated effective date.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'SHOPPING WITH MAISON',
    title: 'Terms & Conditions',
    description: 'The terms that apply when you access MAISON or purchase products from us.',
    sections: [
      {
        title: 'Using MAISON',
        paragraphs: [
          'By accessing this website or placing an order, you agree to these terms and all policies linked from them. You must provide accurate information and use MAISON only for lawful personal or business shopping purposes.',
        ],
      },
      {
        title: 'Accounts',
        paragraphs: [
          'You are responsible for maintaining the confidentiality of your account and for activity performed through it. Notify MAISON promptly if you believe your account has been used without permission.',
        ],
      },
      {
        title: 'Products, pricing and availability',
        paragraphs: [
          'We aim to present product descriptions, images, prices and availability accurately. Colours and appearance may vary by screen. Prices, offers and stock can change before an order is confirmed.',
          'Quotation estimates are not final offers. A quotation becomes final only after MAISON reviews and confirms its pricing and conditions.',
        ],
      },
      {
        title: 'Orders and payment',
        paragraphs: [
          'Submitting an order is an offer to purchase. An order is accepted when MAISON confirms it. We may cancel or limit an order because of stock, pricing errors, suspected fraud, delivery restrictions or other reasonable operational concerns. Available payment methods and charges are shown during checkout.',
        ],
      },
      {
        title: 'Delivery, returns and refunds',
        paragraphs: [
          'Delivery is governed by our Shipping Policy. Returns, replacements and refunds are governed by our Return Policy. Any timelines displayed at checkout or in an order are estimates unless expressly stated otherwise.',
        ],
      },
      {
        title: 'Intellectual property and acceptable use',
        paragraphs: [
          'MAISON branding, page designs, text, images and other website content are protected by applicable intellectual-property laws. You may not copy, exploit, interfere with or misuse the website or its content without permission.',
        ],
      },
      {
        title: 'Liability and governing law',
        paragraphs: [
          'To the extent permitted by law, MAISON is not responsible for indirect losses or events outside its reasonable control. Nothing in these terms limits rights that cannot legally be excluded. These terms are governed by the applicable laws of India.',
        ],
      },
    ],
  },
  returns: {
    eyebrow: 'RETURNS & REFUNDS',
    title: 'Return Policy',
    description: 'Guidance for returns, replacements, inspections and refunds at MAISON.',
    sections: [
      {
        title: 'Return eligibility',
        paragraphs: [
          'Return eligibility is shown with the product or order and may vary by category. Eligible items should be unused, unwashed and returned with their original packaging, accessories and tags. Proof of purchase may be required.',
          'Certain hygiene-sensitive, personalised, perishable, final-sale or otherwise identified products may not be returnable unless they arrive damaged, defective or incorrect.',
        ],
      },
      {
        title: 'Starting a return',
        paragraphs: [
          'Sign in to your MAISON account, open My Orders, select an eligible delivered order and choose Return/Replace. Provide the requested reason and supporting photographs where applicable. A request is not approved until it has been reviewed.',
        ],
      },
      {
        title: 'Damaged, defective or incorrect items',
        paragraphs: [
          'Contact us as soon as possible if an item arrives damaged, defective, incomplete or different from what you ordered. Keep the product and packaging available for verification and include clear photographs when submitting the request.',
        ],
      },
      {
        title: 'Inspection and outcome',
        paragraphs: [
          'Returned items may be inspected before approval. If the item does not meet the return conditions, MAISON may decline the return and provide the reason. Approved requests may result in a replacement, refund or another resolution appropriate to the order.',
        ],
      },
      {
        title: 'Refunds',
        paragraphs: [
          'Approved refunds are issued to the original payment method unless another method is required or agreed. Processing time depends on the payment provider and begins after the return is approved. Any applicable deductions will be disclosed during the review.',
        ],
      },
      {
        title: 'Cancellations',
        paragraphs: [
          'An order may be cancelled before dispatch where the option is available. Once dispatched, an eligible item must follow the normal return process after delivery.',
        ],
      },
    ],
  },
  shipping: {
    eyebrow: 'DELIVERY INFORMATION',
    title: 'Shipping Policy',
    description: 'How MAISON processes, dispatches, tracks and delivers your order.',
    sections: [
      {
        title: 'Delivery coverage',
        paragraphs: [
          'Delivery availability is determined by the address and postal code provided during checkout. Some products or locations may have additional restrictions that will be displayed before the order is confirmed.',
        ],
      },
      {
        title: 'Shipping charges and estimates',
        paragraphs: [
          'Applicable shipping charges and estimated delivery information are displayed during checkout before you place the order. Qualifying orders may receive free shipping where the offer is available.',
        ],
      },
      {
        title: 'Processing and dispatch',
        paragraphs: [
          'Orders are processed after payment and order verification. Processing times may differ for weekends, holidays, high-demand periods, quotations, personalised items or products supplied from different locations.',
        ],
      },
      {
        title: 'Tracking your order',
        paragraphs: [
          'Once tracking information is available, you can follow the shipment through Track Order or the order section of your MAISON account. Tracking events can take time to appear after dispatch.',
        ],
      },
      {
        title: 'Delivery address and receipt',
        paragraphs: [
          'Please provide a complete and accurate delivery address and a reachable phone number. Address changes may be possible only before dispatch. Someone may need to be available to accept the parcel or complete delivery verification.',
        ],
      },
      {
        title: 'Delays and unsuccessful delivery',
        paragraphs: [
          'Delivery estimates can be affected by weather, transport disruption, public holidays, local restrictions or other events outside reasonable control. If a delivery attempt is unsuccessful, the courier or MAISON may contact you to arrange the next step.',
        ],
      },
    ],
  },
};

function PolicyPage({ policy }) {
  const content = POLICY_CONTENT[policy];

  return (
    <main className="policy-page">
      <SEO
        title={`${content.title} | MAISON`}
        description={content.description}
      />

      <section className="policy-hero">
        <div>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
      </section>

      <section className="policy-layout">
        <aside className="policy-navigation">
          <div className="policy-navigation-title">
            <FileText size={18} />
            <strong>MAISON Policies</strong>
          </div>
          <Link className={policy === 'privacy' ? 'active' : ''} to="/privacy-policy">Privacy Policy</Link>
          <Link className={policy === 'terms' ? 'active' : ''} to="/terms-and-conditions">Terms &amp; Conditions</Link>
          <Link className={policy === 'returns' ? 'active' : ''} to="/return-policy">Return Policy</Link>
          <Link className={policy === 'shipping' ? 'active' : ''} to="/shipping-policy">Shipping Policy</Link>
        </aside>

        <article className="policy-content">
          <div className="policy-effective-date">Effective date: 17 November 2026</div>

          {content.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
            </section>
          ))}

          <div className="policy-contact-card">
            <Mail size={21} />
            <div>
              <strong>Questions about this policy?</strong>
              <p>Contact the MAISON support team at <a href="mailto:support@maison.com">support@maison.com</a>.</p>
            </div>
          </div>

          <Link className="policy-back-link" to="/">
            <ArrowLeft size={16} /> Back to MAISON
          </Link>
        </article>
      </section>
    </main>
  );
}

export default PolicyPage;
