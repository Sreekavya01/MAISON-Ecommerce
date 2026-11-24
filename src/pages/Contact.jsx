import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Headphones,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  PackageSearch,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import siteConfig from '../config/siteConfig';
import SEO from '../components/SEO';
import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
} from '../utils/adminNotifications';

import './Contact.css';

const supportTopics = [
  {
    id: 'orders',
    title: 'Your Orders',
    description: 'View orders, invoices and purchase details.',
    keywords: 'orders purchases invoice history cancel',
    icon: PackageSearch,
    actions: [
      { label: 'View your orders', description: 'See order details and invoices.', to: '/account?section=orders' },
      { label: 'Track a package', description: 'Check the latest delivery progress.', to: '/track-order' },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    description: 'Get help with a return, replacement or refund.',
    keywords: 'return refund replacement damaged wrong item',
    icon: RotateCcw,
    actions: [
      { label: 'Review return help', description: 'Read return and refund guidance.', to: '/help' },
      { label: 'Open your orders', description: 'Manage requests linked to your orders.', to: '/account?section=orders' },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery & Tracking',
    description: 'Find a package or resolve a delivery problem.',
    keywords: 'delivery shipping tracking late missing package courier',
    icon: Truck,
    actions: [
      { label: 'Track your order', description: 'View shipment status and delivery details.', to: '/track-order' },
      { label: 'Delivery help', description: 'Find answers about shipping and delays.', to: '/help' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Charges',
    description: 'Understand payments, coupons and order totals.',
    keywords: 'payment card upi banking cod charge coupon total',
    icon: CreditCard,
    actions: [
      { label: 'Payment help', description: 'Read answers about payment options.', to: '/help' },
      { label: 'Review your cart', description: 'Check items, quantities and totals.', to: '/cart' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Login',
    description: 'Manage your profile, password and saved details.',
    keywords: 'account login password profile address sign in register',
    icon: UserRound,
    actions: [
      { label: 'Open your account', description: 'Manage profile, addresses and preferences.', to: '/account' },
      { label: 'Sign in or reset password', description: 'Access login and password recovery.', to: '/login' },
    ],
  },
  {
    id: 'shopping',
    title: 'Products & Shopping',
    description: 'Get help finding products, sizes and availability.',
    keywords: 'product shopping size stock availability category search',
    icon: ShoppingBag,
    actions: [
      { label: 'Browse the shop', description: 'Search and filter the full collection.', to: '/shop' },
      { label: 'Product help', description: 'Find answers to common shopping questions.', to: '/help' },
    ],
  },
];

const contactMethods = [
  {
    title: 'Help Centre',
    description: 'Find quick answers to common questions.',
    icon: HelpCircle,
    to: '/help',
    label: 'BROWSE HELP',
  },
  {
    title: 'Track an Order',
    description: 'Check delivery progress and order information.',
    icon: PackageSearch,
    to: '/track-order',
    label: 'TRACK ORDER',
  },
];

function Contact() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTopics = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return supportTopics;

    return supportTopics.filter((topic) =>
      `${topic.title} ${topic.description} ${topic.keywords}`
        .toLowerCase()
        .includes(search)
    );
  }, [searchTerm]);

  const activeTopic = supportTopics.find((topic) => topic.id === selectedTopic);

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic.id);
    setFormData((current) => ({
      ...current,
      subject: current.subject || topic.title,
    }));

    window.requestAnimationFrame(() => {
      document.getElementById('support-options')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const messageRef = doc(collection(db, 'contactMessages'));
      const messageData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        supportTopic: selectedTopic || null,
        userId: auth.currentUser?.uid || null,
        status: 'Unread',
        createdAt: serverTimestamp(),
      };
      const messageBatch = writeBatch(db);

      messageBatch.set(messageRef, messageData);
      addAdminNotificationWrite(messageBatch, {
        id: adminNotificationIds.contactMessage(messageRef.id),
        type: ADMIN_NOTIFICATION_TYPES.CONTACT_MESSAGE,
        message: `${messageData.name || 'A customer'} sent a message about "${
          messageData.subject || 'Customer support request'
        }".`,
        relatedDocumentId: messageRef.id,
        sourceCollection: 'contactMessages',
        targetPage: '/admin-contact-messages',
      });

      await messageBatch.commit();

      toast.success('Your support request has been sent.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSelectedTopic('');
    } catch (error) {
      console.error('Contact form submission error:', error);
      toast.error('Unable to send your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="customer-service-page">
      <SEO
        title="Customer Service & Contact Us | MAISON"
        description="Get help with MAISON orders, delivery, returns, payments, products and account questions. Browse self-service options or contact our support team."
      />

      <section className="support-hero">
        <div className="support-hero-inner">
          <span className="support-eyebrow">MAISON CUSTOMER SERVICE</span>
          <h1>Hello. What can we help you with?</h1>
          <p>Search for help or choose a topic below to find the quickest next step.</p>

          <label className="support-search" htmlFor="support-search-input">
            <Search size={21} />
            <input
              id="support-search-input"
              type="search"
              placeholder="Search orders, returns, delivery, payments..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="support-page-content">
        <section className="support-topics" aria-labelledby="support-topics-title">
          <div className="support-section-heading">
            <span>SELF-SERVICE</span>
            <h2 id="support-topics-title">Some things you can do here</h2>
            <p>Choose the option that best matches your question.</p>
          </div>

          {filteredTopics.length > 0 ? (
            <div className="support-topic-grid">
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;

                return (
                  <button
                    type="button"
                    className={`support-topic-card ${selectedTopic === topic.id ? 'is-active' : ''}`}
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    aria-pressed={selectedTopic === topic.id}
                  >
                    <span className="support-topic-icon"><Icon size={26} /></span>
                    <span className="support-topic-copy">
                      <strong>{topic.title}</strong>
                      <small>{topic.description}</small>
                    </span>
                    <ChevronRight size={19} className="support-topic-arrow" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="support-search-empty">
              <Search size={28} />
              <h3>No matching help topic</h3>
              <p>Try a different search or send our support team a message below.</p>
              <button type="button" onClick={() => setSearchTerm('')}>CLEAR SEARCH</button>
            </div>
          )}
        </section>

        {activeTopic && (
          <section className="support-options" id="support-options" aria-live="polite">
            <div className="support-options-heading">
              <span>RECOMMENDED FOR YOU</span>
              <h2>{activeTopic.title}</h2>
              <p>Start with one of these options for the fastest help.</p>
            </div>

            <div className="support-action-grid">
              {activeTopic.actions.map((action) => (
                <Link to={action.to} className="support-action-card" key={action.label}>
                  <div>
                    <strong>{action.label}</strong>
                    <span>{action.description}</span>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              ))}

              <a href="#contact-form" className="support-action-card support-action-contact">
                <div>
                  <strong>I still need help</strong>
                  <span>Send the MAISON support team a message.</span>
                </div>
                <MessageCircle size={18} />
              </a>
            </div>
          </section>
        )}

        <section className="direct-support">
          <div className="support-section-heading">
            <span>MORE HELP</span>
            <h2>How would you like to get support?</h2>
            <p>Use a quick self-service option or send us the details.</p>
          </div>

          <div className="contact-method-grid">
            {contactMethods.map((method) => {
              const Icon = method.icon;

              return (
                <Link to={method.to} className="contact-method-card" key={method.title}>
                  <Icon size={24} />
                  <div><strong>{method.title}</strong><span>{method.description}</span></div>
                  <small>{method.label} <ChevronRight size={14} /></small>
                </Link>
              );
            })}

            <a href="#contact-form" className="contact-method-card">
              <Mail size={24} />
              <div><strong>Send a Message</strong><span>Tell our support team how we can help.</span></div>
              <small>CONTACT US <ChevronRight size={14} /></small>
            </a>
          </div>
        </section>

        <section className="support-contact-panel" id="contact-form">
          <div className="support-contact-intro">
            <span>CONTACT MAISON</span>
            <h2>Tell us what happened.</h2>
            <p>
              Include the useful details and an order number when relevant.
              Our team usually replies within 1–2 business days.
            </p>

            <div className="support-promise">
              <Headphones size={22} />
              <div><strong>Customer assistance</strong><span>Clear, thoughtful support from the MAISON team.</span></div>
            </div>
            <div className="support-promise">
              <Clock size={22} />
              <div><strong>Response time</strong><span>Usually within 1–2 business days.</span></div>
            </div>
          </div>

          <form className="support-contact-form" onSubmit={handleSubmit}>
            <div className="support-form-row">
              <label>
                <span>Your name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={150}
                  required
                />
              </label>
            </div>

            <label>
              <span>What do you need help with?</span>
              <select
                value={selectedTopic}
                onChange={(event) => {
                  const topic = supportTopics.find((item) => item.id === event.target.value);
                  setSelectedTopic(event.target.value);
                  if (topic) {
                    setFormData((current) => ({ ...current, subject: current.subject || topic.title }));
                  }
                }}
              >
                <option value="">Select a help topic</option>
                {supportTopics.map((topic) => (
                  <option value={topic.id} key={topic.id}>{topic.title}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Subject</span>
              <input
                type="text"
                name="subject"
                placeholder="Briefly describe the issue"
                value={formData.subject}
                onChange={handleChange}
                maxLength={150}
                required
              />
            </label>

            <label>
              <span>Message</span>
              <textarea
                name="message"
                rows="6"
                placeholder="Include your order number and any useful details..."
                value={formData.message}
                onChange={handleChange}
                maxLength={3000}
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'SENDING REQUEST...' : 'SEND SUPPORT REQUEST'}
              <Send size={17} />
            </button>
          </form>
        </section>

        <section className="support-location">
          <div className="support-location-copy">
            <span>VISIT MAISON</span>
            <div className="support-location-title"><Store size={24} /><h2>{siteConfig.store.name}</h2></div>

            <div className="support-location-detail">
              <MapPin size={19} />
              <div><strong>Store address</strong><p>{siteConfig.store.address || 'Store address coming soon'}</p></div>
            </div>
            <div className="support-location-detail">
              <Clock size={19} />
              <div><strong>Opening hours</strong><p>{siteConfig.store.hours || 'Business hours coming soon'}</p></div>
            </div>

            {siteConfig.store.mapsUrl ? (
              <a href={siteConfig.store.mapsUrl} target="_blank" rel="noreferrer">
                <Navigation size={15} /> GET DIRECTIONS
              </a>
            ) : (
              <p className="support-location-note">Location information will appear here when confirmed.</p>
            )}
          </div>

          {siteConfig.store.mapEmbedUrl ? (
            <iframe
              src={siteConfig.store.mapEmbedUrl}
              title={`${siteConfig.store.name} location map`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div className="support-map-placeholder">
              <MapPin size={33} />
              <strong>Map ready to connect</strong>
              <span>The live map will appear when the store location is available.</span>
            </div>
          )}
        </section>
      </div>

      <section className="support-closing-banner">
        <CircleDollarSign size={24} />
        <div><strong>Shopping with confidence</strong><span>Clear orders, dependable support and a secure MAISON experience.</span></div>
        <Link to="/shop">CONTINUE SHOPPING <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}

export default Contact;
