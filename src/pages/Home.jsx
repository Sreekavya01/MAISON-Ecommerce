import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Heart,
  MessageSquareQuote,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingUp,
  Truck,
} from 'lucide-react';

import { FaGoogle } from 'react-icons/fa';

import toast from 'react-hot-toast';

import { auth, db } from '../firebase';
import siteConfig from '../config/siteConfig';
import {
  applyCuratedProductMedia,
  products as localProducts,
} from '../data/products';
import {
  getLocalRecentlyViewed,
  loadRecentlyViewed,
} from '../utils/recentlyViewed';
import SEO from '../components/SEO';
import ProductRating from '../components/ProductRating';
import usePublishedReviews from '../hooks/usePublishedReviews';

import './Home.css';
import './GoogleReviews.css';

const heroSlides = [
  {
    eyebrow: 'THE MAISON EDIT',
    title: 'Everyday luxury,',
    accent: 'beautifully curated.',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=86',
    category: "Women's Fashion",
  },
  {
    eyebrow: 'REFINED ESSENTIALS',
    title: 'Style that moves',
    accent: 'at your pace.',
    image:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1800&q=86',
    category: "Men's Fashion",
  },
  {
    eyebrow: 'MAISON LIVING',
    title: 'Small upgrades,',
    accent: 'lasting impact.',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1800&q=86',
    category: 'Home Appliances',
  },
  {
    eyebrow: 'SIGNATURE ACCESSORIES',
    title: 'Details that define',
    accent: 'your every look.',
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1800&q=86',
    category: 'Bags & Accessories',
  },
  {
    eyebrow: 'STEP INTO THE SEASON',
    title: 'Designed for every',
    accent: 'step ahead.',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1800&q=86',
    category: 'Footwear',
  },
];

const categoryCards = [
  {
    name: "Women's Fashion",
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: "Men's Fashion",
    image:
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Footwear',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Bags & Accessories',
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Electronics',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Home Appliances',
    image:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Toys & Kids',
    image:
      'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=500&q=80',
  },
];

const featurePromotions = [
  {
    eyebrow: 'THE WEEKEND EDIT',
    title: 'Accessories worth keeping.',
    offer: 'Up to 40% off',
    category: 'Bags & Accessories',
    image:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=84',
  },
  {
    eyebrow: 'EVERYDAY VALUE',
    title: 'Beautiful finds under ₹3,000.',
    offer: 'Shop the edit',
    category: "Women's Fashion",
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=84',
  },
  {
    eyebrow: 'FRESHLY CURATED',
    title: 'New arrivals, just in.',
    offer: 'Discover new',
    category: "Men's Fashion",
    image:
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=84',
  },
  {
    eyebrow: 'MAISON LIVING',
    title: 'A considered home refresh.',
    offer: 'Up to 30% off',
    category: 'Home Appliances',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=84',
  },
];

const googleReviews = siteConfig.googleReviews.reviews;
const googleRating = siteConfig.googleReviews.rating || (
  googleReviews.length > 0
    ? googleReviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0
      ) / googleReviews.length
    : null
);

const normalizeProduct = (product) => {
  const curatedProduct = applyCuratedProductMedia(product);
  const images = Array.isArray(curatedProduct.images) ? curatedProduct.images : [];

  return {
    ...curatedProduct,
    id: curatedProduct.id,
    name: curatedProduct.name || 'MAISON product',
    category: curatedProduct.category || 'MAISON Collection',
    price: Number(curatedProduct.price) || 0,
    originalPrice: Number(
      curatedProduct.originalPrice || curatedProduct.compareAtPrice
    ) || 0,
    discount: Number(
      curatedProduct.discount || curatedProduct.discountPercentage
    ) || 0,
    rating: Number(curatedProduct.rating) || 0,
    reviews: Number(curatedProduct.reviews) || 0,
    stock: Number(curatedProduct.stock) || 0,
    image:
      curatedProduct.image ||
      curatedProduct.priorityImage ||
      curatedProduct.imageUrl ||
      images[0] ||
      '',
  };
};

const getDiscount = (product) => {
  if (product.discount > 0) return Math.round(product.discount);

  if (product.originalPrice > product.price) {
    return Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100
    );
  }

  return 0;
};

function HomeProductCard({
  product,
  wishlist,
  onAddToCart,
  onToggleWishlist,
}) {
  const isWishlisted = wishlist.some(
    (item) => String(item.id) === String(product.id)
  );
  const discount = getDiscount(product);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error('This product is currently out of stock.');
      return;
    }

    if (typeof onAddToCart !== 'function') {
      toast.error('Cart is not connected. Please try again.');
      return;
    }

    onAddToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlist = () => {
    if (typeof onToggleWishlist !== 'function') {
      toast.error('Wishlist is not connected. Please try again.');
      return;
    }

    onToggleWishlist(product);
    toast.success(
      isWishlisted
        ? 'Removed from your wishlist.'
        : 'Added to your wishlist!'
    );
  };

  return (
    <article className="home-product-card">
      <div className="home-product-image-wrap">
        <Link to={`/product/${product.id}`}>
          <img src={product.image} alt={product.name} loading="lazy" />
        </Link>

        {discount > 0 && (
          <span className="home-product-discount">-{discount}%</span>
        )}

        <button
          type="button"
          className={`home-product-wishlist ${isWishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
        >
          <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="home-product-details">
        <span className="home-product-category">{product.category}</span>

        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>

        <ProductRating productId={product.id} size="compact" />

        <div className="home-product-price-row">
          <strong>₹{product.price.toLocaleString('en-IN')}</strong>

          {product.originalPrice > product.price && (
            <del>₹{product.originalPrice.toLocaleString('en-IN')}</del>
          )}
        </div>

        <button
          type="button"
          className="home-product-cart"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
        >
          <ShoppingCart size={16} />
          {product.stock > 0 ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </article>
  );
}

function ProductShelf({
  id,
  eyebrow,
  title,
  description,
  icon: Icon,
  products,
  wishlist,
  onAddToCart,
  onToggleWishlist,
  tone = 'light',
}) {
  const shelfRef = useRef(null);

  const scrollShelf = (direction) => {
    shelfRef.current?.scrollBy({
      left: direction * Math.min(shelfRef.current.clientWidth * 0.82, 920),
      behavior: 'smooth',
    });
  };

  if (!products.length) return null;

  return (
    <section id={id} className={`product-shelf product-shelf-${tone}`}>
      <div className="product-shelf-heading">
        <div>
          <span className="product-shelf-eyebrow">
            {Icon && <Icon size={16} />}
            {eyebrow}
          </span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <div className="product-shelf-actions">
          <Link to="/shop">
            Shop all <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            onClick={() => scrollShelf(-1)}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => scrollShelf(1)}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="product-shelf-track" ref={shelfRef}>
        {products.map((product) => (
          <HomeProductCard
            key={`${title}-${product.id}`}
            product={product}
            wishlist={wishlist}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
}

function Home({ onAddToCart, wishlist = [], onToggleWishlist }) {
  const { getProductReviewSummary } = usePublishedReviews();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [productList, setProductList] = useState(
    localProducts.map(normalizeProduct)
  );
  const [recentlyViewed, setRecentlyViewed] = useState(
    getLocalRecentlyViewed().map(normalizeProduct)
  );

  useEffect(() => {
    if (location.hash !== '#special-offers') return undefined;

    const animationFrame = window.requestAnimationFrame(() => {
      document.getElementById('special-offers')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.hash]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide(
        (previousSlide) => (previousSlide + 1) % heroSlides.length
      );
    }, 5500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));

        if (active && !snapshot.empty) {
          setProductList(
            snapshot.docs.map((productDocument) =>
              normalizeProduct({
                id: productDocument.id,
                ...productDocument.data(),
              })
            )
          );
        }
      } catch (error) {
        console.error('Homepage product loading error:', error);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const recentItems = await loadRecentlyViewed(user);

      if (active) {
        setRecentlyViewed(recentItems.map(normalizeProduct));
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const shelves = useMemo(() => {
    const byRating = [...productList].sort(
      (first, second) => {
        const firstSummary = getProductReviewSummary(first.id);
        const secondSummary = getProductReviewSummary(second.id);

        return (
          Number(secondSummary.averageRating || 0) -
            Number(firstSummary.averageRating || 0) ||
          secondSummary.reviewCount - firstSummary.reviewCount
        );
      }
    );
    const byReviews = [...productList].sort(
      (first, second) => {
        const firstSummary = getProductReviewSummary(first.id);
        const secondSummary = getProductReviewSummary(second.id);

        return (
          secondSummary.reviewCount - firstSummary.reviewCount ||
          Number(secondSummary.averageRating || 0) -
            Number(firstSummary.averageRating || 0)
        );
      }
    );
    const saleProducts = productList.filter(
      (product) => getDiscount(product) > 0
    );

    return {
      bestSellers: byRating.slice(0, 10),
      featured: productList.slice(0, 10),
      trending: byReviews.slice(0, 10),
      recommended: [
        ...productList.slice(4),
        ...productList.slice(0, 4),
      ].slice(0, 10),
      newArrivals: [...productList].reverse().slice(0, 10),
      offers: (saleProducts.length ? saleProducts : byRating).slice(0, 10),
    };
  }, [getProductReviewSummary, productList]);

  const activeSlide = heroSlides[currentSlide];

  return (
    <main className="home-page">
      <SEO
        title="MAISON | Premium Fashion, Lifestyle & Everyday Essentials"
        description="Shop curated fashion, accessories, electronics, home essentials and more at MAISON. Discover premium products with an effortless shopping experience."
      />

      <section className="home-feature-stage" aria-label="Featured shopping edits">
        <section className="maison-hero" aria-label="Featured collections">
          <img
            key={activeSlide.image}
            className="maison-hero-image"
            src={activeSlide.image}
            alt=""
          />
          <div className="maison-hero-overlay" />

          <div className="maison-hero-content" key={activeSlide.title}>
            <span>{activeSlide.eyebrow}</span>
            <h1>
              {activeSlide.title}
              <em>{activeSlide.accent}</em>
            </h1>
            <div className="maison-hero-buttons">
              <Link
                to={`/shop?category=${encodeURIComponent(activeSlide.category)}`}
                className="maison-hero-primary"
              >
                Shop the collection <ArrowRight size={18} />
              </Link>
              <Link to="/shop" className="maison-hero-secondary">
                Explore all products
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="maison-hero-arrow maison-hero-arrow-left"
            onClick={() =>
              setCurrentSlide(
                (currentSlide - 1 + heroSlides.length) % heroSlides.length
              )
            }
            aria-label="Previous promotion"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            className="maison-hero-arrow maison-hero-arrow-right"
            onClick={() =>
              setCurrentSlide((currentSlide + 1) % heroSlides.length)
            }
            aria-label="Next promotion"
          >
            <ChevronRight size={24} />
          </button>

          <div className="maison-hero-dots">
            {heroSlides.map((slide, index) => (
              <button
                type="button"
                key={slide.eyebrow}
                className={currentSlide === index ? 'active' : ''}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Show promotion ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <div className="home-feature-grid">
          {featurePromotions.map((promotion) => (
            <Link
              to={`/shop?category=${encodeURIComponent(promotion.category)}`}
              className="home-feature-card"
              key={promotion.title}
            >
              <img src={promotion.image} alt="" />
              <span className="home-feature-card-overlay" />
              <span className="home-feature-card-copy">
                <small>{promotion.eyebrow}</small>
                <strong>{promotion.title}</strong>
                <em>{promotion.offer}</em>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="benefits-section" aria-label="Shopping benefits">
        <div className="benefit-item">
          <Truck />
          <div><h4>Free shipping</h4><p>On qualifying orders</p></div>
        </div>
        <div className="benefit-item">
          <ShieldCheck />
          <div><h4>Secure shopping</h4><p>Protected checkout</p></div>
        </div>
        <div className="benefit-item">
          <RefreshCcw />
          <div><h4>Easy returns</h4><p>Simple and convenient</p></div>
        </div>
        <div className="benefit-item">
          <Headphones />
          <div><h4>Here to help</h4><p>Dedicated support</p></div>
        </div>
      </section>

      <section className="categories-section">
        <div className="home-section-heading">
          <div>
            <span>EXPLORE MAISON</span>
            <h2>Shop by category</h2>
          </div>
          <Link to="/shop">View all <ArrowRight size={16} /></Link>
        </div>

        <div className="category-grid">
          {categoryCards.map((category) => (
            <Link
              to={`/shop?category=${encodeURIComponent(category.name)}`}
              className="category-card"
              key={category.name}
            >
              <span className="category-image-wrap">
                <img src={category.image} alt="" loading="lazy" />
              </span>
              <strong>{category.name}</strong>
              <small>Shop now</small>
            </Link>
          ))}
        </div>
      </section>

      <ProductShelf
        id="special-offers"
        eyebrow="MORE VALUE, SAME MAISON QUALITY"
        title="Special Offers"
        description="Explore exceptional products and limited-time opportunities."
        icon={BadgePercent}
        products={shelves.offers}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
      />

      <ProductShelf
        eyebrow="CUSTOMER FAVOURITES"
        title="Best Sellers"
        description="The products MAISON shoppers return to again and again."
        icon={Star}
        products={shelves.bestSellers}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
      />

      <ProductShelf
        eyebrow="THE MAISON EDIT"
        title="Featured Products"
        description="A considered selection for style, home and everyday life."
        icon={Sparkles}
        products={shelves.featured}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
        tone="cream"
      />

      <section className="home-promo-strip">
        <div>
          <span>MAISON MEMBER BENEFITS</span>
          <h2>Thoughtful finds. A smoother way to shop.</h2>
          <p>
            Save favourites, revisit products and keep every purchase within easy reach.
          </p>
        </div>
        <Link to="/account">Explore your account <ArrowRight size={18} /></Link>
      </section>

      <ProductShelf
        eyebrow="POPULAR RIGHT NOW"
        title="Trending Now"
        description="Highly rated pieces currently getting the most attention."
        icon={TrendingUp}
        products={shelves.trending}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
      />

      <ProductShelf
        eyebrow="DISCOVER SOMETHING NEW"
        title="Recommended For You"
        description="A varied edit from across the MAISON collection."
        icon={Heart}
        products={shelves.recommended}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
        tone="cream"
      />

      {recentlyViewed.length > 0 && (
        <ProductShelf
          eyebrow="PICK UP WHERE YOU LEFT OFF"
          title="Recently Viewed"
          description="Your latest discoveries, with the most recent first."
          icon={Clock3}
          products={recentlyViewed}
          wishlist={wishlist}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
        />
      )}

      <ProductShelf
        eyebrow="JUST IN"
        title="New Arrivals"
        description="Fresh additions across fashion, lifestyle and home."
        icon={Sparkles}
        products={shelves.newArrivals}
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
        tone="cream"
      />

      <section className="google-reviews-section">
        <div className="google-reviews-heading">
          <span className="google-reviews-eyebrow">CUSTOMER EXPERIENCES</span>
          <h2>MAISON on <i>Google.</i></h2>
          <p>Verified Google feedback will be displayed here once the business profile is connected.</p>
          <div className="google-reviews-brand">
            <FaGoogle aria-hidden="true" />
            <span>Google Reviews</span>
          </div>
        </div>

        {googleReviews.length > 0 && googleRating ? (
          <div className="google-reviews-content">
            <div className="google-rating-card">
              <span className="rating-label">GOOGLE RATING</span>
              <h3>{googleRating.toFixed(1)}<span>/5</span></h3>
              <div className="google-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    fill={star <= Math.round(googleRating) ? '#C6A15B' : 'none'}
                    color="#C6A15B"
                  />
                ))}
              </div>
              <p>
                Based on {siteConfig.googleReviews.reviewCount || googleReviews.length} Google reviews.
              </p>
              <div className="rating-divider" />
              <div className="rating-trust">
                <ShieldCheck size={19} />
                <span>Connected to the MAISON Google profile</span>
              </div>
            </div>

            <div className="google-review-cards">
              {googleReviews.slice(0, 3).map((review, index) => (
                <article className="google-review-card" key={`${review.name}-${index}`}>
                  <div className="review-card-top">
                    <div className="review-customer">
                      <div className="review-avatar">
                        {review.initials || review.name?.slice(0, 2).toUpperCase() || 'G'}
                      </div>
                      <div><h4>{review.name || 'Google customer'}</h4><span>Google review</span></div>
                    </div>
                    <MessageSquareQuote size={23} className="review-quote-icon" />
                  </div>
                  <div className="review-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        fill={star <= Number(review.rating || 0) ? '#C6A15B' : 'none'}
                        color="#C6A15B"
                      />
                    ))}
                  </div>
                  <p>{review.review}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="google-reviews-empty">
            <div className="google-reviews-empty-icon">
              <FaGoogle aria-hidden="true" />
            </div>
            <span>INTEGRATION READY</span>
            <h3>Google reviews are coming soon.</h3>
            <p>
              The section is ready. Add the Google Business profile and review details
              to the site configuration when they become available.
            </p>
          </div>
        )}

        <div className="google-reviews-bottom">
          <div><Star size={17} fill="#C6A15B" color="#C6A15B" /> <span>Your experience helps us grow.</span></div>
          {siteConfig.googleReviews.profileUrl ? (
            <a
              href={siteConfig.googleReviews.profileUrl}
              className="google-review-contact"
              target="_blank"
              rel="noreferrer"
            >
              View all on Google <ArrowUpRight size={17} />
            </a>
          ) : (
            <span className="google-review-contact is-disabled">
              Google profile coming soon
            </span>
          )}
        </div>
      </section>

    </main>
  );
}

export default Home;
