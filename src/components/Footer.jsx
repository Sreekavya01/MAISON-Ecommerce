import { Link } from 'react-router-dom';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaMedium,
  FaYoutube,
} from 'react-icons/fa';
import { ArrowUp } from 'lucide-react';
import siteConfig from '../config/siteConfig';
import './Footer.css';

const socialPlatforms = [
  { key: 'instagram', label: 'Instagram', icon: FaInstagram },
  { key: 'facebook', label: 'Facebook', icon: FaFacebookF },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube },
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn },
  { key: 'medium', label: 'Medium', icon: FaMedium },
];

function Footer() {
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="storefront-footer">
      <div className="footer-brand">
        <h2>MAISON</h2>
        <p>THE ART OF SHOPPING</p>
        <span>Own your style. Elevate your lifestyle.</span>
      </div>

      <div className="footer-links">
        <h4>EXPLORE</h4>
        <Link to="/home">Home</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/collections">Collections</Link>
        <button type="button" className="footer-back-to-top" onClick={handleBackToTop}>
          Back to top <ArrowUp size={13} />
        </button>
      </div>

      <div className="footer-links">
        <h4>CUSTOMER CARE</h4>
        <Link to="/track-order">Track order</Link>
        <Link to="/help">Help centre</Link>
        <Link to="/quotations">Request a quote</Link>
        <Link to="/contact">Contact</Link>
      </div>

      <div className="footer-links">
        <h4>YOUR MAISON</h4>
        <Link to="/account">Account</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/cart">Cart</Link>
      </div>

      <div className="footer-links">
        <h4>POLICIES</h4>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
        <Link to="/return-policy">Return Policy</Link>
        <Link to="/shipping-policy">Shipping Policy</Link>
      </div>

      <div className="footer-social">
        <h4>FOLLOW MAISON</h4>
        <p>Stay connected with us.</p>
        <div className="social-icons">
          {socialPlatforms.map(({ key, label, icon: Icon }) => (
            siteConfig.social[key] ? (
              <a key={key} href={siteConfig.social[key]} target="_blank" rel="noreferrer" aria-label={label}>
                <Icon size={18} />
              </a>
            ) : (
              <span key={key} className="social-link-pending" aria-label={`${label} coming soon`} title={`${label} profile coming soon`}>
                <Icon size={18} />
              </span>
            )
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} MAISON. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
