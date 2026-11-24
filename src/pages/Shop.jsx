import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  ArrowUpRight,
  Heart,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';

import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import { applyCuratedProductMedia, categories } from '../data/products';
import SEO from '../components/SEO';
import ProductRating from '../components/ProductRating';
import usePublishedReviews from '../hooks/usePublishedReviews';

import './Shop.css';

const priceRanges = [
  { value: 'all', label: 'All prices', min: 0, max: Infinity },
  { value: 'under-1000', label: 'Under ₹1,000', min: 0, max: 999 },
  { value: '1000-1999', label: '₹1,000 – ₹1,999', min: 1000, max: 1999 },
  { value: '2000-2999', label: '₹2,000 – ₹2,999', min: 2000, max: 2999 },
  { value: '3000-plus', label: '₹3,000 & above', min: 3000, max: Infinity },
];

const colourValues = {
  beige: '#d6c3a5',
  black: '#242424',
  blue: '#3c68a8',
  brown: '#825f43',
  cream: '#f2e7cf',
  gold: '#c6a15b',
  grey: '#9da3aa',
  multicolor: 'linear-gradient(135deg, #f45b69 0 33%, #f4ca5b 33% 66%, #5b8df4 66%)',
  navy: '#172b4d',
  red: '#c52f3c',
  'rose gold': '#c98e88',
  silver: '#c8ccd2',
  white: '#ffffff',
};

const normalizeCategory = (category) =>
  String(category || '').trim().toLowerCase();

const getProductColours = (product) =>
  Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];

const getProductSizes = (product) =>
  Array.isArray(product.sizes)
    ? product.sizes.filter((size) => size && size !== 'Standard')
    : [];

const getOriginalPrice = (product) =>
  Number(product.originalPrice || product.compareAtPrice) || 0;

const getDiscountPercentage = (product) => {
  const originalPrice = getOriginalPrice(product);
  const price = Number(product.price) || 0;

  return originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
};

function ProductCard({ product, isWishlisted, onAddToCart, onToggleWishlist }) {
  const { getProductReviewSummary } = usePublishedReviews();
  const { averageRating, reviewCount } = getProductReviewSummary(product.id);
  const stock = Number(product.stock) || 0;
  const colours = getProductColours(product);
  const sizes = getProductSizes(product);
  const originalPrice = getOriginalPrice(product);
  const discountPercentage = getDiscountPercentage(product);

  let badge = '';

  if (stock <= 0) badge = 'OUT OF STOCK';
  else if (reviewCount >= 150) badge = 'BESTSELLER';
  else if (reviewCount > 0 && averageRating >= 4.8) badge = 'MAISON PICK';
  else if (stock <= 10) badge = 'FEW LEFT';

  return (
    <article className="shop-product-card">
      <div className="product-image-box">
        <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`}>
          <img
            src={product.image || '/placeholder.png'}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        </Link>

        {badge && (
          <span className={`product-market-badge ${stock <= 0 ? 'is-unavailable' : ''}`}>
            {badge}
          </span>
        )}

        {discountPercentage > 0 && (
          <span className="product-discount-badge">-{discountPercentage}%</span>
        )}

        <button
          type="button"
          className={`shop-wishlist-button ${isWishlisted ? 'active' : ''}`}
          onClick={() => onToggleWishlist(product)}
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          aria-pressed={isWishlisted}
        >
          <Heart size={19} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="product-details">
        <div className="product-card-meta">
          <span className="product-card-category">{product.category}</span>
        </div>

        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>

        <ProductRating productId={product.id} size="compact" />

        {(colours.length > 0 || sizes.length > 0) && (
          <div className="product-social-proof">
          {colours.length > 0 && <span>{colours.length} colours</span>}
          {sizes.length > 0 && <span>{sizes.length} sizes</span>}
          </div>
        )}

        {colours.length > 0 && (
          <div className="product-colour-preview" aria-label="Available colours">
            {colours.slice(0, 5).map((colour) => (
              <span
                key={colour}
                title={colour}
                style={{ background: colourValues[colour.toLowerCase()] || '#d5d5d5' }}
              />
            ))}
            {colours.length > 5 && <small>+{colours.length - 5}</small>}
          </div>
        )}

        <div className="product-price-line">
          <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>
          {originalPrice > Number(product.price) && (
            <>
              <s>₹{originalPrice.toLocaleString('en-IN')}</s>
              <span>{discountPercentage}% off</span>
            </>
          )}
        </div>

        <p className={`product-delivery-note ${stock <= 0 ? 'is-unavailable' : ''}`}>
          {stock > 0 ? <Truck size={14} /> : <X size={14} />}
          {stock > 0 ? 'Free delivery available' : 'Currently unavailable'}
        </p>

        <div className="product-card-actions">
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={stock <= 0}
          >
            <ShoppingBag size={16} />
            {stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
          </button>

          <Link to={`/product/${product.id}`} aria-label={`View details for ${product.name}`}>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function FilterPanel({
  availableColours,
  availableSizes,
  inStockOnly,
  minimumRating,
  onClearAll,
  onClose,
  onToggleColour,
  onToggleSize,
  priceRange,
  selectedColours,
  selectedSizes,
  setInStockOnly,
  setMinimumRating,
  setPriceRange,
  showClose = false,
}) {
  return (
    <div className="shop-filter-panel">
      <div className="shop-filter-heading">
        <div>
          <SlidersHorizontal size={18} />
          <strong>Filters</strong>
        </div>

        {showClose ? (
          <button type="button" onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </button>
        ) : (
          <button type="button" onClick={onClearAll} className="filter-reset-link">
            Clear all
          </button>
        )}
      </div>

      <fieldset className="shop-filter-group">
        <legend>Price</legend>
        {priceRanges.map((range) => (
          <label className="filter-option" key={range.value}>
            <input
              type="radio"
              name={showClose ? 'mobile-price-range' : 'desktop-price-range'}
              value={range.value}
              checked={priceRange === range.value}
              onChange={() => setPriceRange(range.value)}
            />
            <span>{range.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="shop-filter-group">
        <legend>Customer rating</legend>
        {[4, 3].map((rating) => (
          <label className="filter-option" key={rating}>
            <input
              type="radio"
              name={showClose ? 'mobile-minimum-rating' : 'desktop-minimum-rating'}
              checked={minimumRating === rating}
              onChange={() => setMinimumRating(rating)}
            />
            <span className="filter-rating-label">
              {rating}
              <Star size={13} fill="currentColor" />
              & above
            </span>
          </label>
        ))}
        <label className="filter-option">
          <input
            type="radio"
            name={showClose ? 'mobile-minimum-rating' : 'desktop-minimum-rating'}
            checked={minimumRating === 0}
            onChange={() => setMinimumRating(0)}
          />
          <span>All ratings</span>
        </label>
      </fieldset>

      <fieldset className="shop-filter-group">
        <legend>Availability</legend>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => setInStockOnly(event.target.checked)}
          />
          <span>In stock only</span>
        </label>
      </fieldset>

      {availableColours.length > 0 && (
        <fieldset className="shop-filter-group">
          <legend>Colour</legend>
          <div className="filter-colour-grid">
            {availableColours.map((colour) => (
              <label
                className={`filter-colour-option ${selectedColours.includes(colour) ? 'selected' : ''}`}
                key={colour}
                title={colour}
              >
                <input
                  type="checkbox"
                  checked={selectedColours.includes(colour)}
                  onChange={() => onToggleColour(colour)}
                />
                <span
                  className="filter-colour-swatch"
                  style={{ background: colourValues[colour.toLowerCase()] || '#d5d5d5' }}
                />
                <small>{colour}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {availableSizes.length > 0 && (
        <fieldset className="shop-filter-group">
          <legend>Size / Variant</legend>
          <div className="filter-size-grid">
            {availableSizes.map((size) => (
              <label
                className={selectedSizes.includes(size) ? 'selected' : ''}
                key={size}
              >
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => onToggleSize(size)}
                />
                <span>{size}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showClose && (
        <div className="mobile-filter-actions">
          <button type="button" onClick={onClearAll} className="mobile-filter-clear">
            <RotateCcw size={16} /> Clear all
          </button>
          <button type="button" onClick={onClose} className="mobile-filter-apply">
            Show products
          </button>
        </div>
      )}
    </div>
  );
}

function Shop({ onAddToCart, wishlist = [], onToggleWishlist }) {
  const { getProductReviewSummary } = usePublishedReviews();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search');

  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');
  const [priceRange, setPriceRange] = useState('all');
  const [minimumRating, setMinimumRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedColours, setSelectedColours] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        const snapshot = await getDocs(collection(db, 'products'));
        const loadedProducts = snapshot.docs.map((productDoc) => {
          const data = productDoc.data();
          const images = Array.isArray(data.images) ? data.images : [];

          return applyCuratedProductMedia({
            id: productDoc.id,
            ...data,
            name: data.name || 'Unnamed Product',
            category: data.category || 'Uncategorized',
            description: data.description || '',
            price: Number(data.price) || 0,
            stock: Number(data.stock) || 0,
            rating: Number(data.rating) || 0,
            reviews: Number(data.reviews) || 0,
            colors: Array.isArray(data.colors) ? data.colors : [],
            sizes: Array.isArray(data.sizes) ? data.sizes : [],
            image: data.image || data.priorityImage || data.imageUrl || images[0] || '',
            images,
          });
        });

        setProductList(loadedProducts);
      } catch (error) {
        console.error('Error loading Shop products:', error);
        setLoadError(true);
        toast.error('Unable to load products. Please check Firebase permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const selectedCategory = categoryFromUrl
    ? categories.find(
        (category) => normalizeCategory(category) === normalizeCategory(categoryFromUrl)
      ) || 'All'
    : 'All';

  const activeSearchTerm = searchTerm || searchFromUrl || '';

  const categoryProducts = useMemo(
    () =>
      productList.filter(
        (product) =>
          selectedCategory === 'All' ||
          normalizeCategory(product.category) === normalizeCategory(selectedCategory)
      ),
    [productList, selectedCategory]
  );

  const availableColours = useMemo(
    () =>
      [...new Set(categoryProducts.flatMap(getProductColours))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [categoryProducts]
  );

  const availableSizes = useMemo(
    () =>
      [...new Set(categoryProducts.flatMap(getProductSizes))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
    [categoryProducts]
  );

  const selectedPriceRange =
    priceRanges.find((range) => range.value === priceRange) || priceRanges[0];

  const filteredProducts = useMemo(() => {
    const search = activeSearchTerm.trim().toLowerCase();

    const results = categoryProducts.filter((product) => {
      const productColours = getProductColours(product);
      const productSizes = getProductSizes(product);
      const searchableContent = [
        product.name,
        product.category,
        product.description,
        ...productColours,
        ...productSizes,
      ]
        .join(' ')
        .toLowerCase();

      const price = Number(product.price) || 0;
      const { averageRating } = getProductReviewSummary(product.id);
      const stock = Number(product.stock) || 0;

      const matchesSearch = !search || searchableContent.includes(search);
      const matchesPrice =
        price >= selectedPriceRange.min && price <= selectedPriceRange.max;
      const matchesRating =
        minimumRating === 0 || Number(averageRating || 0) >= minimumRating;
      const matchesStock = !inStockOnly || stock > 0;
      const matchesColour =
        selectedColours.length === 0 ||
        productColours.some((colour) => selectedColours.includes(colour));
      const matchesSize =
        selectedSizes.length === 0 ||
        productSizes.some((size) => selectedSizes.includes(size));

      return (
        matchesSearch &&
        matchesPrice &&
        matchesRating &&
        matchesStock &&
        matchesColour &&
        matchesSize
      );
    });

    return [...results].sort((first, second) => {
      if (sortOrder === 'low') return first.price - second.price;
      if (sortOrder === 'high') return second.price - first.price;
      if (sortOrder === 'rating') {
        return (
          Number(getProductReviewSummary(second.id).averageRating || 0) -
          Number(getProductReviewSummary(first.id).averageRating || 0)
        );
      }
      if (sortOrder === 'popular') {
        return (
          getProductReviewSummary(second.id).reviewCount -
          getProductReviewSummary(first.id).reviewCount
        );
      }
      if (sortOrder === 'discount') {
        return getDiscountPercentage(second) - getDiscountPercentage(first);
      }
      return 0;
    });
  }, [
    activeSearchTerm,
    categoryProducts,
    getProductReviewSummary,
    inStockOnly,
    minimumRating,
    selectedColours,
    selectedPriceRange,
    selectedSizes,
    sortOrder,
  ]);

  const handleCategoryChange = (category) => {
    setSearchParams(category === 'All' ? {} : { category });
    setSelectedColours([]);
    setSelectedSizes([]);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);

    if (searchFromUrl) {
      setSearchParams(categoryFromUrl ? { category: categoryFromUrl } : {}, {
        replace: true,
      });
    }
  };

  const toggleSelection = (value, setter) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const clearAllFilters = () => {
    setPriceRange('all');
    setMinimumRating(0);
    setInStockOnly(false);
    setSelectedColours([]);
    setSelectedSizes([]);
    setSearchTerm('');
    setSearchParams({});
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchParams(selectedCategory === 'All' ? {} : { category: selectedCategory });
  };

  const handleAddToCart = (product) => {
    if (typeof onAddToCart !== 'function') {
      toast.error('Cart is not connected. Please try again.');
      return;
    }

    if (Number(product.stock) <= 0) {
      toast.error('This product is currently out of stock.');
      return;
    }

    onAddToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleToggleWishlist = (product) => {
    if (typeof onToggleWishlist !== 'function') {
      toast.error('Wishlist is not connected. Please try again.');
      return;
    }

    const isAlreadySaved = wishlist.some(
      (item) => String(item.id) === String(product.id)
    );

    onToggleWishlist(product);
    toast.success(
      isAlreadySaved
        ? 'Removed from your wishlist.'
        : 'Added to your wishlist!'
    );
  };

  const activeFilters = [
    selectedCategory !== 'All' && {
      key: 'category',
      label: selectedCategory,
      remove: () => handleCategoryChange('All'),
    },
    activeSearchTerm && {
      key: 'search',
      label: `Search: ${activeSearchTerm}`,
      remove: clearSearch,
    },
    priceRange !== 'all' && {
      key: 'price',
      label: selectedPriceRange.label,
      remove: () => setPriceRange('all'),
    },
    minimumRating > 0 && {
      key: 'rating',
      label: `${minimumRating}★ & above`,
      remove: () => setMinimumRating(0),
    },
    inStockOnly && {
      key: 'stock',
      label: 'In stock',
      remove: () => setInStockOnly(false),
    },
    ...selectedColours.map((colour) => ({
      key: `colour-${colour}`,
      label: colour,
      remove: () => toggleSelection(colour, setSelectedColours),
    })),
    ...selectedSizes.map((size) => ({
      key: `size-${size}`,
      label: `Size ${size}`,
      remove: () => toggleSelection(size, setSelectedSizes),
    })),
  ].filter(Boolean);

  const filterPanelProps = {
    availableColours,
    availableSizes,
    inStockOnly,
    minimumRating,
    onClearAll: clearAllFilters,
    onToggleColour: (colour) => toggleSelection(colour, setSelectedColours),
    onToggleSize: (size) => toggleSelection(size, setSelectedSizes),
    priceRange,
    selectedColours,
    selectedSizes,
    setInStockOnly,
    setMinimumRating,
    setPriceRange,
  };

  return (
    <main className="shop-page">
      <SEO
        title={
          selectedCategory === 'All'
            ? 'Shop Online | Premium Fashion & Lifestyle | MAISON'
            : `${selectedCategory} | Shop Online | MAISON`
        }
        description={
          selectedCategory === 'All'
            ? 'Explore the MAISON online shop for premium clothing, footwear, bags, accessories, electronics and lifestyle essentials.'
            : `Explore our ${selectedCategory} collection at MAISON. Discover quality products and shop online.`
        }
      />

      <section className="shop-hero">
        <div className="shop-hero-overlay" />
        <div className="shop-hero-content">
          <span>THE ART OF DISCOVERY</span>
          <h1>
            Discover More.
            <br />
            <i>Shop Your Style.</i>
          </h1>
          <span className="shop-hero-note">STYLE • QUALITY • LIFESTYLE</span>
        </div>
      </section>

      <section className="shop-content">
        <div className="shop-heading">
          <div>
            <span className="shop-eyebrow">CURATED FOR YOU</span>
            <h2>
              {selectedCategory === 'All' ? (
                <>Explore Our <i>Collection</i></>
              ) : (
                <>Explore <i>{selectedCategory}</i></>
              )}
            </h2>
            <p>Discover products with clearer choices, ratings and availability.</p>
          </div>

          <label className="shop-search">
            <Search size={19} />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              placeholder="Search products, colours or sizes..."
              value={activeSearchTerm}
              onChange={handleSearchChange}
            />
            {activeSearchTerm && (
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="shop-category-strip" aria-label="Shop categories">
          <button
            type="button"
            className={selectedCategory === 'All' ? 'selected' : ''}
            onClick={() => handleCategoryChange('All')}
            aria-pressed={selectedCategory === 'All'}
          >
            <Sparkles size={15} /> All Products
          </button>

          {categories.filter((category) => category !== 'All').map((category) => (
            <button
              type="button"
              key={category}
              className={
                normalizeCategory(selectedCategory) === normalizeCategory(category)
                  ? 'selected'
                  : ''
              }
              onClick={() => handleCategoryChange(category)}
              aria-pressed={normalizeCategory(selectedCategory) === normalizeCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="shop-results-toolbar">
          <div className="shop-results-copy" aria-live="polite">
            {!loading && !loadError && (
              <>
                <strong>{filteredProducts.length}</strong>
                <span>{filteredProducts.length === 1 ? 'product' : 'products'} found</span>
              </>
            )}
          </div>

          <div className="shop-results-actions">
            <button
              type="button"
              className="mobile-filter-trigger"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={17} />
              Filters
              {activeFilters.length > 0 && <b>{activeFilters.length}</b>}
            </button>

            <label className="sort-box">
              <span>Sort by</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="popular">Popularity</option>
                <option value="rating">Customer Rating</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="discount">Discount</option>
              </select>
            </label>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filter-row">
            <span>Active filters</span>
            {activeFilters.map((filter) => (
              <button type="button" key={filter.key} onClick={filter.remove}>
                {filter.label}
                <X size={13} />
              </button>
            ))}
            <button type="button" className="clear-filter-chip" onClick={clearAllFilters}>
              Clear all
            </button>
          </div>
        )}

        <div className="shop-catalog-layout">
          <aside className="shop-filter-sidebar" aria-label="Product filters">
            <FilterPanel {...filterPanelProps} />
          </aside>

          <div className="shop-results-area">
            {loading && (
              <div className="shop-skeleton-grid" aria-label="Loading products">
                {Array.from({ length: 6 }, (_, index) => (
                  <div className="shop-skeleton-card" key={index}>
                    <span />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            )}

            {loadError && (
              <div className="no-products">
                <h3>Unable to Load Products</h3>
                <p>Please refresh the page and try again.</p>
              </div>
            )}

            {!loading && !loadError && filteredProducts.length > 0 && (
              <div className="shop-product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    product={product}
                    isWishlisted={wishlist.some(
                      (item) => String(item.id) === String(product.id)
                    )}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={handleToggleWishlist}
                    key={product.id}
                  />
                ))}
              </div>
            )}

            {!loading && !loadError && filteredProducts.length === 0 && (
              <div className="no-products">
                <Search size={34} />
                <h3>No matching products</h3>
                <p>Try removing a filter or searching for another product.</p>
                <button type="button" onClick={clearAllFilters}>
                  RESET ALL FILTERS
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {filtersOpen && (
        <div className="mobile-filter-overlay" role="presentation" onMouseDown={() => setFiltersOpen(false)}>
          <div
            className="mobile-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <FilterPanel
              {...filterPanelProps}
              showClose
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default Shop;
