import { Link } from 'react-router-dom';

import {
  Heart,
  Award,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import SEO from '../components/SEO';
import './About.css';

function About() {
  return (
    <div className="about-page">

      <SEO
        title="About MAISON | Our Story, Mission & Vision"
        description="Discover the story behind MAISON, a modern lifestyle shopping destination bringing together fashion, accessories, electronics and everyday essentials."
      />

      {/* HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero-overlay">
          <span>WELCOME TO MAISON</span>

          <h1>
            Where Style Meets<br />
            the Art of Living.
          </h1>

          <Link to="/shop" className="about-hero-button">
            EXPLORE OUR COLLECTION
          </Link>
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="about-story">
        <div className="about-story-image">
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000"
            alt="Elegant lifestyle interior"
          />
        </div>

        <div className="about-story-content">
          <span className="about-label">OUR STORY</span>

          <h2>Welcome to the World of MAISON</h2>

          <p>
            MAISON is a modern lifestyle shopping destination created
            to make everyday shopping more inspiring and convenient.
          </p>

          <p>
            From timeless fashion and stylish accessories to electronics,
            home essentials and kids' products, we bring everything you
            love together in one place.
          </p>

          <p>
            We believe that shopping should be more than a purchase.
            It should be an experience that reflects your personality
            and lifestyle.
          </p>

          <Link to="/shop" className="about-text-link">
            Discover Our Collection →
          </Link>
        </div>
      </section>

      {/* MISSION AND VISION */}
      <section className="about-mission">
        <div className="about-mission-heading">
          <span className="about-label">WHAT DRIVES US</span>
          <h2>Our Mission & Vision</h2>
          <p>Creating a better shopping experience for everyone.</p>
        </div>

        <div className="mission-cards">
          <div className="mission-card">
            <div className="mission-icon">
              <Heart size={28} />
            </div>

            <h3>Our Mission</h3>

            <p>
              To make quality products accessible through a convenient,
              enjoyable and customer-focused shopping experience.
            </p>
          </div>

          <div className="mission-card">
            <div className="mission-icon">
              <Sparkles size={28} />
            </div>

            <h3>Our Vision</h3>

            <p>
              To become a trusted lifestyle destination where people
              discover products that inspire their everyday lives.
            </p>
          </div>
        </div>
      </section>

      {/* WHY MAISON */}
      <section className="about-why">
        <div className="about-why-heading">
          <span className="about-label">THE MAISON EXPERIENCE</span>
          <h2>Why Choose MAISON?</h2>
          <p>A shopping experience designed around you.</p>
        </div>

        <div className="about-features">

          <div className="about-feature">
            <ShoppingBag size={30} />
            <h3>Everything in One Place</h3>
            <p>Fashion, electronics, home essentials and more.</p>
          </div>

          <div className="about-feature">
            <Award size={30} />
            <h3>Curated Collections</h3>
            <p>Explore carefully selected products for every lifestyle.</p>
          </div>

          <div className="about-feature">
            <Truck size={30} />
            <h3>Convenient Shopping</h3>
            <p>Discover and shop your favourites with ease.</p>
          </div>

          <div className="about-feature">
            <ShieldCheck size={30} />
            <h3>Customer First</h3>
            <p>Your shopping experience is always our priority.</p>
          </div>

        </div>
      </section>

      {/* CLOSING BANNER */}
      <section className="about-closing">
        <span>YOUR STYLE. YOUR WORLD.</span>

        <h2>
          Own Your Style.<br />
          Elevate Your Lifestyle.
        </h2>

        <Link to="/shop">SHOP THE COLLECTION</Link>
      </section>

    </div>
  );
}

export default About;
