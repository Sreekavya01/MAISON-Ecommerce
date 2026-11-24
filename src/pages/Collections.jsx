import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import SEO from '../components/SEO';

import './Collections.css';

const collections = [
  {
    id: 1,
    number: '01',
    title: "Women's Fashion",
    subtitle: 'Elegance is an attitude.',
    description: 'Discover pieces that celebrate your individuality.',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
    category: "Women's Fashion",
    label: 'THE WOMENSWEAR EDIT',
  },
  {
    id: 2,
    number: '02',
    title: "Men's Fashion",
    subtitle: 'Defined by effortless style.',
    description: 'Modern essentials for the contemporary wardrobe.',
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200',
    category: "Men's Fashion",
    label: 'THE MENSWEAR EDIT',
  },
  {
    id: 3,
    number: '03',
    title: 'Footwear',
    subtitle: 'Make every step count.',
    description: 'Find your perfect pair for every occasion.',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000',
    category: 'Footwear',
    label: 'STEP INTO STYLE',
  },
  {
    id: 4,
    number: '04',
    title: 'Bags & Accessories',
    subtitle: 'The beauty is in the details.',
    description: 'Finishing touches that make a statement.',
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200',
    category: 'Bags & Accessories',
    label: 'THE ACCESSORY EDIT',
  },
  {
    id: 5,
    number: '05',
    title: 'Electronics',
    subtitle: 'A smarter way to live.',
    description: 'Explore technology designed for modern living.',
    image:
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1000',
    category: 'Electronics',
    label: 'THE TECHNOLOGY EDIT',
  },
  {
    id: 6,
    number: '06',
    title: 'Home Appliances',
    subtitle: 'Make room for better living.',
    description: 'Thoughtful essentials for beautiful everyday spaces.',
    image:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000',
    category: 'Home Appliances',
    label: 'THE HOME EDIT',
  },
  {
    id: 7,
    number: '07',
    title: 'Toys & Kids',
    subtitle: 'Little things. Big memories.',
    description: 'Discover playful finds for little personalities.',
    image:
      'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&q=85&w=1200',
    category: 'Toys & Kids',
    label: 'THE LITTLE ONES EDIT',
  },
];

function Collections() {
  return (
    <main className="collections-page">

      <SEO
        title="Collections | Fashion, Footwear & Lifestyle | MAISON"
        description="Explore MAISON collections featuring women's fashion, men's fashion, footwear, bags, accessories, electronics, home appliances and lifestyle essentials."
      />

      {/* LUXURY HERO */}

      <section className="collections-hero">
        <div className="collections-hero-image"></div>
        <div className="collections-hero-overlay"></div>

        <div className="collections-hero-content">
          <span className="collections-hero-label">
            THE WORLD OF MAISON
          </span>

          <h1>
            More Than Shopping.
            <br />
            <i>A Way of Living.</i>
          </h1>

          <p>
            Discover a considered collection of fashion,
            technology and lifestyle essentials.
            Beautifully chosen. Made for your world.
          </p>

          <Link to="/shop" className="collections-hero-button">
            DISCOVER THE COLLECTIONS
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="collections-hero-footer">
          <span>STYLE · DESIGN · EVERYDAY LIVING</span>
          <span>EST. 2026</span>
        </div>
      </section>

      {/* EDITORIAL INTRODUCTION */}

      <section className="collections-intro">
        <div className="collections-intro-left">
          <span className="collections-label">
            A WORLD OF POSSIBILITIES
          </span>

          <h2>
            Curated for
            <br />
            <i>Every Side of You.</i>
          </h2>
        </div>

        <div className="collections-intro-right">
          <p>
            Your style is more than what you wear. It is how
            you live, what you love and the little details
            that make every day yours.
          </p>

          <span className="collections-intro-line"></span>

          <span className="collections-intro-note">
            SEVEN COLLECTIONS. ONE MAISON EXPERIENCE.
          </span>
        </div>
      </section>

      {/* COLLECTIONS EDITORIAL GRID */}

      <section className="collections-grid-section">
        <div className="collections-section-heading">
          <div>
            <span className="collections-label">
              EXPLORE THE MAISON EDIT
            </span>

            <h2>The Collections</h2>
          </div>

          <span className="collections-total">
            07 CURATED CATEGORIES
          </span>
        </div>

        <div className="collections-grid">
          {collections.map((collection) => (
            <Link
              to={`/shop?category=${encodeURIComponent(collection.category)}`}
              className={`collection-card collection-card-${collection.id}`}
              key={collection.id}
            >
              <div className="collection-image">
                <img
                  src={collection.image}
                  alt={collection.title}
                  loading="lazy"
                />

                <div className="collection-image-overlay"></div>

                <div className="collection-number">
                  {collection.number}
                </div>

                <div className="collection-card-content">
                  <span className="collection-card-label">
                    {collection.label}
                  </span>

                  <h3>{collection.title}</h3>

                  <p className="collection-subtitle">
                    {collection.subtitle}
                  </p>

                  <div className="collection-card-bottom">
                    <span>{collection.description}</span>

                    <div className="collection-explore">
                      <ArrowUpRight size={21} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BRAND STATEMENT */}

      <section className="collections-statement">
        <div className="collections-statement-content">
          <span>THE MAISON PHILOSOPHY</span>

          <h2>
            Find What You Love.
            <br />
            <i>Make It Your Own.</i>
          </h2>

          <p>
            From everyday essentials to extraordinary finds,
            discover a world that reflects your individuality.
          </p>

          <Link to="/shop">
            EXPLORE MAISON
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="collections-statement-side">
          <span>MAISON</span>
          <p>OWN YOUR STYLE. ELEVATE YOUR LIFESTYLE.</p>
        </div>
      </section>

    </main>
  );
}

export default Collections;