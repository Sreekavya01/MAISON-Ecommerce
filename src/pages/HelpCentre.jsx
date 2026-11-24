import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

import {
  Search,
  Package,
  CreditCard,
  RefreshCcw,
  Truck,
  UserRound,
  ShoppingBag,
  Mail,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  Headphones,
} from 'lucide-react';

import SEO from '../components/SEO';
import './HelpCentre.css';

const helpCategories = [
  {
    title: 'Orders & Tracking',
    description: 'Track your orders and manage your purchases.',
    icon: Package,
    keywords: 'order orders tracking track cancel cancellation purchase status',
  },
  {
    title: 'Payments',
    description: 'Get assistance with payments and transactions.',
    icon: CreditCard,
    keywords: 'payment payments pay transaction money card online failed',
  },
  {
    title: 'Returns & Refunds',
    description: 'Learn about returns, exchanges and refunds.',
    icon: RefreshCcw,
    keywords: 'return returns refund refunds exchange money back',
  },
  {
    title: 'Shipping & Delivery',
    description: 'Find information about delivery and shipping.',
    icon: Truck,
    keywords: 'shipping delivery dispatch parcel package delayed charges',
  },
  {
    title: 'Account & Profile',
    description: 'Manage your account and personal information.',
    icon: UserRound,
    keywords: 'account profile login password personal details address',
  },
  {
    title: 'Products & Shopping',
    description: 'Get help with products, sizes and availability.',
    icon: ShoppingBag,
    keywords: 'product products shopping size sizes availability stock clothes',
  },
];

const faqs = [
  // ORDERS & TRACKING
  {
    question: 'How can I track my order?',
    answer:
      'Visit the Track Order section on MAISON and enter your order details to check the latest available order status.',
    category: 'Orders & Tracking',
    keywords: 'track tracking parcel shipment status',
  },
  {
    question: 'Can I cancel my order?',
    answer:
      'Order cancellation depends on its processing status. Contact the MAISON support team with your order details for assistance.',
    category: 'Orders & Tracking',
    keywords: 'cancel cancellation stop purchase',
  },
  {
    question: 'Can I change my order after placing it?',
    answer:
      'Changes may be possible before your order is processed or dispatched. Contact our support team as soon as possible.',
    category: 'Orders & Tracking',
    keywords: 'change edit modify order',
  },
  {
    question: 'Where can I see my previous orders?',
    answer:
      'Log in to your MAISON account and visit the My Orders section to view your previous purchases.',
    category: 'Orders & Tracking',
    keywords: 'previous history purchases account',
  },

  // PAYMENTS
  {
    question: 'Which payment methods are accepted?',
    answer:
      'The available payment options are displayed during checkout. Select your preferred option from the methods provided.',
    category: 'Payments',
    keywords: 'pay card cash online transaction payment options',
  },
  {
    question: 'What should I do if my payment fails?',
    answer:
      'Check your payment details and bank balance before trying again. If money was deducted, contact our support team with your transaction details.',
    category: 'Payments',
    keywords: 'failed failure deducted bank money transaction',
  },
  {
    question: 'Is Cash on Delivery available?',
    answer:
      'Cash on Delivery availability is displayed during checkout, depending on the delivery location and order eligibility.',
    category: 'Payments',
    keywords: 'cod cash delivery payment',
  },
  {
    question: 'When will I receive my refund?',
    answer:
      'Refund timelines depend on the payment method and payment provider. Refund details will be shared after your return request is reviewed.',
    category: 'Payments',
    keywords: 'refund money back repayment amount',
  },

  // RETURNS & REFUNDS
  {
    question: 'How can I return a product?',
    answer:
      'Log in to your MAISON account, open My Orders, select an eligible delivered order and choose Return/Replace to submit your request.',
    category: 'Returns & Refunds',
    keywords: 'return exchange replace send back',
  },
  {
    question: 'Can I request a replacement instead of a refund?',
    answer:
      'Yes. If replacement is suitable for your order, select Replacement while submitting your return request.',
    category: 'Returns & Refunds',
    keywords: 'replacement exchange substitute',
  },
  {
    question: 'How can I check my return request status?',
    answer:
      'Visit My Orders in your account to check the latest status of your submitted return or replacement request.',
    category: 'Returns & Refunds',
    keywords: 'return status request approved rejected',
  },
  {
    question: 'How long does a refund take?',
    answer:
      'Refund timelines depend on the payment method and payment provider. The applicable details will be shared after the return is reviewed.',
    category: 'Returns & Refunds',
    keywords: 'refund money back repayment amount',
  },

  // SHIPPING & DELIVERY
  {
    question: 'How long does delivery take?',
    answer:
      'Delivery timelines may vary depending on your location and product availability. Check the delivery information displayed during checkout.',
    category: 'Shipping & Delivery',
    keywords: 'delivery shipping arrive parcel',
  },
  {
    question: 'Are there any shipping charges?',
    answer:
      'Applicable shipping charges are displayed during checkout before you confirm your order.',
    category: 'Shipping & Delivery',
    keywords: 'shipping charges fees delivery cost',
  },
  {
    question: 'What should I do if my order is delayed?',
    answer:
      'Check your order status through Track Order. If you need further assistance, contact the MAISON support team.',
    category: 'Shipping & Delivery',
    keywords: 'delayed late shipment delivery',
  },
  {
    question: 'Can I change my delivery address?',
    answer:
      'Address changes may be possible before an order is dispatched. Contact our support team as soon as possible.',
    category: 'Shipping & Delivery',
    keywords: 'address location change delivery',
  },

  // ACCOUNT & PROFILE
  {
    question: 'How do I create a MAISON account?',
    answer:
      'Open the Login page and select the Create Account option. Enter the requested details to register.',
    category: 'Account & Profile',
    keywords: 'create register signup account',
  },
  {
    question: 'How can I reset my password?',
    answer:
      'Use the Forgot Password option on the login page to start the password recovery process.',
    category: 'Account & Profile',
    keywords: 'password reset forgot login sign in',
  },
  {
    question: 'How can I update my personal details?',
    answer:
      'Log in to your account and open your profile section to view or update the available personal information.',
    category: 'Account & Profile',
    keywords: 'profile personal details update name phone',
  },
  {
    question: 'Where can I manage my saved addresses?',
    answer:
      'Visit the My Addresses section to add, edit or manage your saved delivery addresses.',
    category: 'Account & Profile',
    keywords: 'address saved addresses location',
  },

  // PRODUCTS & SHOPPING
  {
    question: 'How do I find a product?',
    answer:
      'Visit the Shop page to browse products. You can explore categories and use the available search and filter options.',
    category: 'Products & Shopping',
    keywords: 'find search browse shop product',
  },
  {
    question: 'How can I check product availability?',
    answer:
      'Open the product details page to view the available product information and stock details.',
    category: 'Products & Shopping',
    keywords: 'availability stock available product',
  },
  {
    question: 'How do I choose the right size?',
    answer:
      'Check the size options displayed on the product details page before adding the product to your cart.',
    category: 'Products & Shopping',
    keywords: 'size sizing clothes measurements',
  },
  {
    question: 'Can I save products for later?',
    answer:
      'Yes. Use the Wishlist option on a product to save it and revisit it later.',
    category: 'Products & Shopping',
    keywords: 'wishlist save favourite favorite',
  },
];

function HelpCentre() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const faqSectionRef = useRef(null);

  const search = searchTerm.trim().toLowerCase();

  const matchesSearch = (text) => {
    if (!search) return true;

    return search
      .split(/\s+/)
      .some((word) => text.toLowerCase().includes(word));
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      !selectedCategory || faq.category === selectedCategory;

    const matchesText = matchesSearch(
      `${faq.question} ${faq.answer} ${faq.category} ${faq.keywords}`
    );

    return matchesCategory && matchesText;
  });

  const filteredCategories = helpCategories.filter((category) =>
    matchesSearch(
      `${category.title} ${category.description} ${category.keywords}`
    )
  );

  const handleCategoryClick = (categoryTitle) => {
    setSelectedCategory(categoryTitle);
    setSearchTerm('');
    setActiveFaq(null);

    setTimeout(() => {
      faqSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handlePopularSearch = (term) => {
    setSelectedCategory(null);
    setSearchTerm(term);
    setActiveFaq(null);

    setTimeout(() => {
      faqSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchTerm('');
    setActiveFaq(null);
  };

  return (
    <main className="help-page">
      <SEO
        title="Help Centre | MAISON"
        description="Find answers to your shopping questions about orders, payments, returns, shipping and more at MAISON."
      />

      <section className="help-hero">
        <div className="help-hero-content">
          <span className="help-eyebrow">
            MAISON CUSTOMER CARE
          </span>

          <h1>
            How Can We <span>Help You?</span>
          </h1>

          <p>
            We're here to make your shopping experience
            simple, smooth and effortless.
          </p>

          <div className="help-search">
            <Search size={21} />

            <input
              type="search"
              placeholder="Search orders, payments, refunds, delivery..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setSelectedCategory(null);
                setActiveFaq(null);
              }}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </div>

          <div className="help-popular">
            <span>Popular searches:</span>

            <button
              type="button"
              onClick={() => handlePopularSearch('tracking')}
            >
              Track order
            </button>

            <button
              type="button"
              onClick={() => handlePopularSearch('refund')}
            >
              Refund
            </button>

            <button
              type="button"
              onClick={() => handlePopularSearch('delivery')}
            >
              Delivery
            </button>
          </div>
        </div>

        <div className="help-hero-decoration">
          <Headphones size={115} strokeWidth={0.8} />
          <span>HERE FOR YOU</span>
        </div>
      </section>

      <section className="help-categories-section">
        <div className="help-section-heading">
          <span>EXPLORE OUR SUPPORT</span>

          <h2>
            How Can We <i>Assist You?</i>
          </h2>

          <p>
            Find the right information for every step
            of your shopping journey.
          </p>
        </div>

        {search && (
          <p className="help-search-summary">
            Showing results for: <strong>{searchTerm}</strong>
          </p>
        )}

        <div className="help-category-grid">
          {filteredCategories.map((category) => {
            const Icon = category.icon;

            return (
              <button
                type="button"
                className="help-category-card"
                key={category.title}
                onClick={() => handleCategoryClick(category.title)}
              >
                <div className="help-category-icon">
                  <Icon size={25} strokeWidth={1.7} />
                </div>

                <h3>{category.title}</h3>

                <p>{category.description}</p>

                <span className="help-category-link">
                  EXPLORE HELP
                  <ArrowRight size={16} />
                </span>
              </button>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <p className="help-no-results">
            No matching help categories found.
          </p>
        )}
      </section>

      <section
        className="help-faq-section"
        ref={faqSectionRef}
      >
        <div className="help-faq-heading">
          <span>QUICK ANSWERS</span>

          <h2>
            {selectedCategory ? (
              <>
                {selectedCategory} <i>Help.</i>
              </>
            ) : (
              <>
                Frequently Asked <i>Questions.</i>
              </>
            )}
          </h2>

          <p>
            {selectedCategory
              ? `Find answers related to ${selectedCategory.toLowerCase()}.`
              : 'Find answers to the questions our customers commonly ask.'}
          </p>

          {(selectedCategory || searchTerm) && (
            <button
              type="button"
              className="help-view-all"
              onClick={clearFilters}
            >
              View All Questions
            </button>
          )}
        </div>

        <div className="help-faq-list">
          {filteredFaqs.map((faq, index) => (
            <div
              className={`help-faq-item ${
                activeFaq === index ? 'open' : ''
              }`}
              key={faq.question}
            >
              <button
                type="button"
                className="help-faq-question"
                onClick={() =>
                  setActiveFaq(
                    activeFaq === index ? null : index
                  )
                }
              >
                <span>{faq.question}</span>

                <ChevronDown
                  size={20}
                  className="help-faq-chevron"
                />
              </button>

              {activeFaq === index && (
                <div className="help-faq-answer">
                  <p>{faq.answer}</p>
                  <span>{faq.category}</span>
                </div>
              )}
            </div>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="help-no-results">
              No matching questions found.
              Try another keyword or contact our support team.
            </div>
          )}
        </div>
      </section>

      <section className="help-contact-section">
        <div className="help-contact-content">
          <span>WE'RE ALWAYS HAPPY TO HELP</span>

          <h2>
            Still Need <i>Assistance?</i>
          </h2>

          <p>
            Couldn't find what you were looking for?
            Get in touch with our team and we'll be
            happy to assist you.
          </p>

          <div className="help-contact-actions">
            <a
              href="mailto:support@maison.com"
              className="help-email-button"
            >
              <Mail size={18} />
              EMAIL SUPPORT
            </a>

            <Link
              to="/contact"
              className="help-contact-button"
            >
              <MessageCircle size={18} />
              CONTACT US
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>

        <div className="help-contact-icon">
          <Headphones size={100} strokeWidth={0.9} />
        </div>
      </section>
    </main>
  );
}

export default HelpCentre;