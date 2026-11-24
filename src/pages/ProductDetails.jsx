import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Share2,
  Gift,
  CreditCard,
  PackageCheck,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
} from 'lucide-react';

import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';

import { db } from '../firebase';
import {
  applyCuratedProductMedia,
  products as localProducts,
} from '../data/products';
import { recordRecentlyViewed } from '../utils/recentlyViewed';

import toast from 'react-hot-toast';

import ProductReviews from '../components/ProductReviews';
import ProductRating from '../components/ProductRating';
import SEO from '../components/SEO';
import BulkOrderDrawer from '../components/BulkOrderDrawer';

import './ProductDetails.css';

const normalizeCatalogProduct = (item, fallbackId) => {
  const curatedItem = applyCuratedProductMedia(item);
  const images = Array.isArray(curatedItem.images) ? curatedItem.images : [];

  return {
    ...curatedItem,
    id: curatedItem.id ?? fallbackId,
    name: curatedItem.name || 'MAISON product',
    category: curatedItem.category || 'MAISON Collection',
    price: Number(curatedItem.price) || 0,
    stock: Number(curatedItem.stock) || 0,
    rating: Number(curatedItem.rating) || 0,
    reviews: Number(curatedItem.reviews) || 0,
    image:
      curatedItem.image ||
      curatedItem.priorityImage ||
      curatedItem.imageUrl ||
      images[0] ||
      '',
  };
};

function ProductDetails({
  onAddToCart,
  wishlist = [],
  onToggleWishlist,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [activeImage, setActiveImage] = useState('');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(true);
  const [bulkOrderOpen, setBulkOrderOpen] = useState(false);
  const [imageZoomActive, setImageZoomActive] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const zoomLensRef = useRef(null);
  const zoomPreviewRef = useRef(null);

  const [quantity, setQuantity] = useState(1);

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // LOAD PRODUCT FROM FIREBASE

  useEffect(() => {
    const loadProduct = async () => {
      const localProduct = localProducts.find(
        (item) => String(item.id) === String(id)
      );

      if (localProduct) {
        setProduct(localProduct);
        setActiveImage(localProduct.image || '');
        setSelectedColor(localProduct.colors?.[0] || '');
        setSelectedSize(localProduct.sizes?.[0] || '');
      }

      try {
        setLoading(!localProduct);

        if (!localProduct) {
          setProduct(null);
        }

        const productRef = doc(db, 'products', id);
        const productSnapshot = await getDoc(productRef);

        if (productSnapshot.exists() || localProduct) {
          const data = applyCuratedProductMedia(
            productSnapshot.exists()
              ? {
                  id: productSnapshot.id,
                  ...productSnapshot.data(),
                }
              : localProduct
          );

          const images = Array.isArray(data.images)
            ? data.images
            : [];

          const loadedProduct = {
            id: productSnapshot.exists() ? productSnapshot.id : localProduct.id,
            ...data,

            price: Number(data.price) || 0,
            stock: Number(data.stock) || 0,

            image:
              data.image ||
              data.priorityImage ||
              data.imageUrl ||
              images[0] ||
              '',

            images,

            colors: Array.isArray(data.colors)
              ? data.colors
              : [],

            sizes: Array.isArray(data.sizes)
              ? data.sizes
              : [],

            // COLOUR-SPECIFIC IMAGES
            colorImages:
              data.colorImages &&
              typeof data.colorImages === 'object'
                ? data.colorImages
                : {},

            rating: Number(data.rating) || 0,
            reviews: Number(data.reviews) || 0,

            description: data.description || '',
          };

          setProduct(loadedProduct);
          setActiveImage(loadedProduct.image || '');

          setSelectedColor(loadedProduct.colors[0] || '');
          setSelectedSize(loadedProduct.sizes[0] || '');
        }
      } catch (error) {
        console.error('Error loading product:', error);

        const localProduct = localProducts.find(
          (item) => String(item.id) === String(id)
        );

        if (localProduct) {
          setProduct(localProduct);
          setActiveImage(localProduct.image || '');
          setSelectedColor(localProduct.colors?.[0] || '');
          setSelectedSize(localProduct.sizes?.[0] || '');
        } else {
          toast.error('Unable to load product. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      recordRecentlyViewed(product);
    }
  }, [product]);

  useEffect(() => {
    if (!imageViewerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setImageViewerOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageViewerOpen]);

  // LOAD SIMILAR PRODUCTS

  useEffect(() => {
    if (!product) return undefined;

    let active = true;

    const selectSimilarProducts = (catalog) => {
      const currentCategory = String(product.category || '').trim().toLowerCase();
      const currentPrice = Number(product.price) || 0;

      return catalog
        .filter((item) => String(item.id) !== String(product.id))
        .sort((first, second) => {
          const firstCategoryMatch =
            String(first.category || '').trim().toLowerCase() === currentCategory;
          const secondCategoryMatch =
            String(second.category || '').trim().toLowerCase() === currentCategory;

          if (firstCategoryMatch !== secondCategoryMatch) {
            return firstCategoryMatch ? -1 : 1;
          }

          return (
            Math.abs(Number(first.price || 0) - currentPrice) -
            Math.abs(Number(second.price || 0) - currentPrice)
          );
        })
        .slice(0, 8);
    };

    const loadSimilarProducts = async () => {
      const productMap = new Map(
        localProducts.map((item) => {
          const normalizedProduct = normalizeCatalogProduct(item, item.id);
          return [String(normalizedProduct.id), normalizedProduct];
        })
      );

      try {
        const productSnapshot = await getDocs(collection(db, 'products'));

        productSnapshot.forEach((productDocument) => {
          productMap.set(
            String(productDocument.id),
            normalizeCatalogProduct(productDocument.data(), productDocument.id)
          );
        });
      } catch (error) {
        console.warn('Using local products for recommendations:', error);
      }

      if (active) {
        setSimilarProducts(selectSimilarProducts([...productMap.values()]));
      }
    };

    loadSimilarProducts();

    return () => {
      active = false;
    };
  }, [product]);

  // LOADING SCREEN

  if (loading) {
    return (
      <main className="product-not-found">
        <SEO
          title="Loading Product | MAISON"
          description="Discover premium products at MAISON."
        />

        <h2>Loading Product...</h2>
        <p>Please wait while we fetch the product details.</p>
      </main>
    );
  }

  // PRODUCT NOT FOUND

  if (!product) {
    return (
      <main className="product-not-found">
        <SEO
          title="Product Not Found | MAISON"
          description="The requested product could not be found. Explore the latest fashion and lifestyle collections at MAISON."
        />

        <h2>Product Not Found</h2>
        <p>Sorry, we couldn't find this product.</p>

        <Link to="/shop">BACK TO SHOP</Link>
      </main>
    );
  }

  // GET IMAGE FOR SELECTED COLOUR

  const getSelectedColorImage = () => {
    if (!selectedColor || !product.colorImages) {
      return product.image;
    }

    // First, check for an exact colour match.
    const exactMatch = product.colorImages[selectedColor];

    if (exactMatch) {
      return exactMatch;
    }

    // If the letter case differs, check without case sensitivity.
    const matchingColorKey = Object.keys(product.colorImages).find(
      color =>
        color.trim().toLowerCase() ===
        selectedColor.trim().toLowerCase()
    );

    if (matchingColorKey && product.colorImages[matchingColorKey]) {
      return product.colorImages[matchingColorKey];
    }

    // If no separate image exists, show the original product image.
    return product.image;
  };

  const selectedProductImage = activeImage || getSelectedColorImage();

  const galleryImages = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
    ...Object.values(product.colorImages || {}),
  ].filter((image, index, images) => image && images.indexOf(image) === index);

  const activeViewerImageIndex = Math.max(
    0,
    galleryImages.indexOf(selectedProductImage)
  );

  const showAdjacentViewerImage = (direction) => {
    if (galleryImages.length < 2) return;

    const nextIndex =
      (activeViewerImageIndex + direction + galleryImages.length) %
      galleryImages.length;

    setActiveImage(galleryImages[nextIndex]);
  };

  const compareAtPrice = Number(
    product.originalPrice || product.compareAtPrice
  ) || 0;

  const discountPercentage = compareAtPrice > product.price
    ? Math.round(((compareAtPrice - product.price) / compareAtPrice) * 100)
    : Number(product.discount || product.discountPercentage) || 0;

  const descriptionPoints = String(product.description || '')
    .split('.')
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => `${point}.`);

  const productHighlights = Array.isArray(product.highlights) && product.highlights.length > 0
    ? product.highlights.filter(Boolean)
    : [
        descriptionPoints[0],
        product.colors.length > 0
          ? `Available in ${product.colors.join(', ')}.`
          : '',
        product.sizes.length > 0
          ? `Choose from ${product.sizes.join(', ')} size or variant options.`
          : '',
      ].filter(Boolean);

  const aboutProductItems = Array.isArray(product.aboutItems) && product.aboutItems.length > 0
    ? product.aboutItems.filter(Boolean)
    : [
        ...descriptionPoints,
        product.colors.length > 0
          ? `Colour options include ${product.colors.join(', ')}.`
          : '',
        product.sizes.length > 0
          ? `Available sizes or variants: ${product.sizes.join(', ')}.`
          : '',
      ].filter(Boolean);

  const customAdditionalInformation =
    product.additionalInformation &&
    typeof product.additionalInformation === 'object' &&
    !Array.isArray(product.additionalInformation)
      ? Object.entries(product.additionalInformation)
      : [];

  const additionalProductInformation = customAdditionalInformation.length > 0
    ? customAdditionalInformation
    : [
        ['Brand', product.brand || 'MAISON'],
        ['Category', product.category],
        ['Product ID', String(product.id)],
        ['Available colours', product.colors.join(', ') || 'Not specified'],
        ['Size / variant', product.sizes.join(', ') || 'Standard'],
        ['Availability', product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'],
      ];

  const isWishlisted = wishlist.some(
    item => String(item.id) === String(product.id)
  );

  // WISHLIST HANDLER

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

  const handleColorSelect = (color) => {
    setSelectedColor(color);

    const matchingImage = Object.entries(product.colorImages || {}).find(
      ([colorName]) => colorName.trim().toLowerCase() === color.trim().toLowerCase()
    )?.[1];

    setActiveImage(matchingImage || product.image || '');
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: product.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Unable to share this product.');
      }
    }
  };

  // ADD TO CART

  const handleAddToCart = () => {
    if (product.stock === 0) {
      toast.error('This product is out of stock.');
      return;
    }

    if (quantity > product.stock) {
      toast.error('Requested quantity is not available.');
      return;
    }

    if (typeof onAddToCart !== 'function') {
      toast.error('Cart is not connected. Please try again.');
      return;
    }

    for (let i = 0; i < quantity; i++) {
      onAddToCart({
        ...product,
        image: selectedProductImage,
        selectedColor,
        selectedSize,
      });
    }

    toast.success(`${product.name} added to your bag!`);
  };

  const handleSimilarAddToCart = (item) => {
    if (item.stock <= 0) {
      toast.error('This product is currently out of stock.');
      return;
    }

    if (typeof onAddToCart !== 'function') {
      toast.error('Cart is not connected. Please try again.');
      return;
    }

    onAddToCart(item);
    toast.success(`${item.name} added to your bag!`);
  };

  // BUY NOW

  const handleBuyNow = () => {
    if (product.stock === 0) {
      toast.error('This product is out of stock.');
      return;
    }

    if (quantity > product.stock) {
      toast.error('Requested quantity is not available.');
      return;
    }

    toast.success('Proceeding to checkout!');

    navigate('/checkout', {
      state: {
        checkoutMode: 'buy-now',
        buyNowItems: [
          {
            ...product,
            image: selectedProductImage,
            selectedColor,
            selectedSize,
            quantity,
          },
        ],
      },
    });
  };

  // QUANTITY

  const increaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(previous => previous + 1);
    } else {
      toast.error('Maximum available stock reached.');
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(previous => previous - 1);
    }
  };

  const updateImageZoom = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalPosition = Math.min(
      100,
      Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)
    );
    const verticalPosition = Math.min(
      100,
      Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)
    );

    if (zoomLensRef.current) {
      zoomLensRef.current.style.left = `${horizontalPosition}%`;
      zoomLensRef.current.style.top = `${verticalPosition}%`;
    }

    if (zoomPreviewRef.current) {
      zoomPreviewRef.current.style.backgroundPosition =
        `${horizontalPosition}% ${verticalPosition}%`;
    }
  };

  return (
    <main className="product-details-page">

      <SEO
        title={`${product.name} | ${product.category} | MAISON`}
        description={`${product.name} - ${product.description} Shop online at MAISON and discover premium fashion and lifestyle products.`}
        image={selectedProductImage}
      />

      {/* BREADCRUMB */}

      <div className="product-breadcrumb">
        <Link to="/home">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <section className="product-details-layout">

        <div className={`product-gallery ${imageZoomActive ? 'zoom-active' : ''}`}>
          <div className="product-thumbnails" aria-label="Product images">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                className={selectedProductImage === image ? 'active' : ''}
                key={image}
                onClick={() => setActiveImage(image)}
                aria-label={`View product image ${index + 1}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>

          <div
            className="product-main-image"
            onMouseEnter={(event) => {
              setImageZoomActive(true);
              updateImageZoom(event);
            }}
            onMouseMove={updateImageZoom}
            onMouseLeave={() => setImageZoomActive(false)}
          >
            <img
              key={`${product.id}-${selectedProductImage}`}
              src={selectedProductImage}
              alt={`${product.name} in ${selectedColor || 'default colour'}`}
            />

            <div className="product-image-actions">
              <button
                type="button"
                onClick={() => setImageViewerOpen(true)}
                aria-label="Open full-screen product images"
              >
                <Maximize2 size={19} />
              </button>
              <button type="button" onClick={handleShare} aria-label="Share product">
                <Share2 size={19} />
              </button>
              <button type="button" onClick={handleWishlist} aria-label="Toggle wishlist">
                <Heart
                  size={20}
                  fill={isWishlisted ? '#C6A15B' : 'none'}
                  color={isWishlisted ? '#C6A15B' : '#172B4D'}
                />
              </button>
            </div>

            <span className="product-image-label">MAISON PICK</span>

            <span className="product-zoom-hint" aria-hidden="true">
              <ZoomIn size={15} /> Hover to zoom
            </span>

            <div ref={zoomLensRef} className="product-zoom-lens" aria-hidden="true" />

          </div>

          <div
            ref={zoomPreviewRef}
            className="product-zoom-preview"
            style={{ backgroundImage: `url(${selectedProductImage})` }}
            aria-hidden="true"
          />

        </div>

        {/* PRODUCT INFORMATION */}

        <div className="product-information">

          <Link
            to={`/shop?category=${encodeURIComponent(product.category)}`}
            className="product-store-link"
          >
            Visit the MAISON {product.category} edit
          </Link>

          <h1>{product.name}</h1>

          {/* RATINGS */}

          <div className="product-rating">
            <ProductRating
              productId={product.id}
              linkToReviews
              size="detail"
            />
            <span>|</span>
            <a href="#product-description">Search this page</a>
          </div>

          <p className="product-demand-note">
            {product.stock > 0
              ? `${product.stock} pieces currently available`
              : 'This product is currently unavailable'}
          </p>

          <div className="product-divider"></div>

          {discountPercentage > 0 && (
            <span className="product-deal-badge">Limited time deal</span>
          )}

          <div className="product-price-row">
            {discountPercentage > 0 && (
              <span className="product-discount">-{discountPercentage}%</span>
            )}
            <span className="product-price-currency">₹</span>
            <strong>{product.price.toLocaleString('en-IN')}</strong>
          </div>

          {compareAtPrice > product.price && (
            <p className="product-list-price">
              M.R.P.: <s>₹{compareAtPrice.toLocaleString('en-IN')}</s>
            </p>
          )}

          <p className="product-tax-note">Inclusive of all taxes</p>

          <section className="product-offers" aria-labelledby="product-offers-heading">
            <div className="product-subheading" id="product-offers-heading">
              <Gift size={20} />
              <h2>Offers</h2>
            </div>

            <div className="product-offer-rail">
              <article>
                <CreditCard size={18} />
                <strong>Welcome offer</strong>
                <p>Use code <b>MAISON10</b> for 10% off.</p>
              </article>
              <article>
                <PackageCheck size={18} />
                <strong>Free shipping</strong>
                <p>Use <b>FREESHIP</b> on your order.</p>
              </article>
              <article>
                <Gift size={18} />
                <strong>Style celebration</strong>
                <p>Use <b>STYLE15</b> for 15% off.</p>
              </article>
            </div>
          </section>

          <div className="product-service-strip">
            <div><RotateCcw size={21} /><span>Easy Returns</span></div>
            <div><ShoppingBag size={21} /><span>Pay on Delivery</span></div>
            <div><Truck size={21} /><span>Free Delivery*</span></div>
            <div><ShieldCheck size={21} /><span>Secure Shopping</span></div>
          </div>

          {/* COLOUR SELECTION */}

          {product.colors.length > 0 && (

            <div className="product-selection">

              <div className="product-selection-heading">
                <span>Colour:</span>
                <strong>{selectedColor}</strong>
              </div>

              <div className="product-color-options">

                {product.colors.map(color => (

                  <button
                    type="button"
                    key={color}
                    className={selectedColor === color ? 'active' : ''}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  >
                    {product.colorImages?.[color] && (
                      <img src={product.colorImages[color]} alt="" />
                    )}
                    <span>{color}</span>
                  </button>

                ))}

              </div>

            </div>

          )}

          {/* SIZE SELECTION */}

          {product.sizes.length > 0 && (

            <div className="product-selection">

              <div className="product-selection-heading">
                <span>Size / Variant:</span>
                <strong>{selectedSize}</strong>
              </div>

              <div className="product-size-options">

                {product.sizes.map(size => (

                  <button
                    type="button"
                    key={size}
                    className={selectedSize === size ? 'active' : ''}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>

                ))}

              </div>

            </div>

          )}

          <div className="product-purchase-box">
            <div className="product-stock">
              <Check size={16} />
              {product.stock > 0
                ? `In Stock — ${product.stock} available`
                : 'Currently Out of Stock'}
            </div>

          {/* QUANTITY */}

          <div className="product-purchase-row">

            <div className="product-quantity">

              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity === 1}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>

            </div>

            <span className="product-quantity-label">
              Quantity
            </span>

          </div>

          {/* CART BUTTONS */}

          <div className="product-action-buttons">

            <button
              type="button"
              className="product-add-cart"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingBag size={19} />
              ADD TO CART
            </button>

            <button
              type="button"
              className="product-buy-now"
              onClick={handleBuyNow}
              disabled={product.stock === 0}
            >
              BUY NOW
            </button>

          </div>

          <button
            type="button"
            className="product-bulk-order-button"
            onClick={() => setBulkOrderOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={bulkOrderOpen}
            aria-controls="bulk-order-drawer"
          >
            <BadgePercent size={19} />
            <span>
              <strong>Ordering 10 or more?</strong>
              Request business pricing for this product
            </span>
            <b>REQUEST A QUOTE</b>
          </button>

          {/* WISHLIST BUTTON */}

          <button
            type="button"
            className="product-wishlist-button"
            onClick={handleWishlist}
          >
            <Heart
              size={19}
              fill={isWishlisted ? '#C6A15B' : 'none'}
              color={isWishlisted ? '#C6A15B' : '#172B4D'}
            />

            {isWishlisted
              ? 'REMOVE FROM WISHLIST'
              : 'ADD TO WISHLIST'}

          </button>

          </div>

          <section className="product-detail-content" id="product-description">
            <h2>Product details</h2>

            <div className="product-detail-panel">
              <button
                type="button"
                className="product-detail-panel-toggle"
                onClick={() => setHighlightsOpen((open) => !open)}
                aria-expanded={highlightsOpen}
              >
                <span>Top highlights</span>
                {highlightsOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
              </button>

              {highlightsOpen && (
                <div className="product-highlights">
                  <ul>
                    {productHighlights.map((highlight, index) => (
                      <li key={`${highlight}-${index}`}>
                        <Check size={16} />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <p><span>✦</span> Summarized from the available product information</p>
                </div>
              )}
            </div>

            <div className="product-about-block">
              <h3>About this item</h3>
              <ul>
                {aboutProductItems.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="product-detail-panel product-additional-panel">
              <button
                type="button"
                className="product-detail-panel-toggle"
                onClick={() => setAdditionalInfoOpen((open) => !open)}
                aria-expanded={additionalInfoOpen}
              >
                <span>Additional information</span>
                {additionalInfoOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
              </button>

              {additionalInfoOpen && (
                <dl className="product-information-table">
                  {additionalProductInformation.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>

        </div>

      </section>

      {similarProducts.length > 0 && (
        <section className="similar-products-section">
          <div className="similar-products-heading">
            <div>
              <span>MORE TO DISCOVER</span>
              <h2>Similar products</h2>
              <p>Products in the same category and price range you may also like.</p>
            </div>

            <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>
              VIEW CATEGORY <ArrowRight size={16} />
            </Link>
          </div>

          <div className="similar-products-rail">
            {similarProducts.map((item) => (
              <article className="similar-product-card" key={item.id}>
                <Link to={`/product/${item.id}`} className="similar-product-image">
                  <img src={item.image || '/placeholder.png'} alt={item.name} />
                  <span>{item.category}</span>
                </Link>

                <div className="similar-product-info">
                  <Link to={`/product/${item.id}`}>
                    <h3>{item.name}</h3>
                  </Link>

                  <ProductRating productId={item.id} size="compact" />

                  <strong>₹{item.price.toLocaleString('en-IN')}</strong>

                  <button
                    type="button"
                    onClick={() => handleSimilarAddToCart(item)}
                    disabled={item.stock <= 0}
                  >
                    <ShoppingBag size={15} />
                    {item.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* PRODUCT REVIEWS */}

      <div id="product-reviews">
        <ProductReviews product={product} />
      </div>

      {/* BOTTOM SECTION */}

      <section className="product-extra-section">

        <div>
          <span>THE MAISON EXPERIENCE</span>

          <h2>
            More Than a Product.
            <i> A Better Experience.</i>
          </h2>

          <p>
            Discover thoughtfully selected products that bring
            together quality, style and everyday convenience.
          </p>
        </div>

        <Link to="/shop">
          <ArrowLeft size={17} />
          CONTINUE SHOPPING
        </Link>

      </section>

      <div className="product-mobile-purchase-bar" aria-label="Product purchase actions">
        <div className="product-mobile-price">
          <small>Price</small>
          <strong>₹{product.price.toLocaleString('en-IN')}</strong>
        </div>
        <button
          type="button"
          className="product-mobile-add"
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          <ShoppingBag size={17} />
          Add to Cart
        </button>
        <button
          type="button"
          className="product-mobile-buy"
          onClick={handleBuyNow}
          disabled={product.stock === 0}
        >
          Buy Now
        </button>
      </div>

      {imageViewerOpen && (
        <div
          className="product-lightbox-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setImageViewerOpen(false);
          }}
        >
          <section
            className="product-lightbox"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-lightbox-title"
          >
            <header>
              <div>
                <span>{product.category}</span>
                <h2 id="product-lightbox-title">{product.name}</h2>
              </div>
              <div className="product-lightbox-header-actions">
                <span>{activeViewerImageIndex + 1} / {galleryImages.length}</span>
                <button
                  type="button"
                  onClick={() => setImageViewerOpen(false)}
                  aria-label="Close full-screen product images"
                >
                  <X size={22} />
                </button>
              </div>
            </header>

            <div className="product-lightbox-stage">
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="product-lightbox-arrow previous"
                  onClick={() => showAdjacentViewerImage(-1)}
                  aria-label="Previous product image"
                >
                  <ChevronLeft size={27} />
                </button>
              )}

              <img src={selectedProductImage} alt={product.name} />

              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="product-lightbox-arrow next"
                  onClick={() => showAdjacentViewerImage(1)}
                  aria-label="Next product image"
                >
                  <ChevronRight size={27} />
                </button>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="product-lightbox-thumbnails" aria-label="Choose a product image">
                {galleryImages.map((image, index) => (
                  <button
                    type="button"
                    key={image}
                    className={selectedProductImage === image ? 'active' : ''}
                    onClick={() => setActiveImage(image)}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <BulkOrderDrawer
        open={bulkOrderOpen}
        onClose={() => setBulkOrderOpen(false)}
        initialItems={[
          {
            ...product,
            quantity: Math.max(10, quantity),
            selectedColor,
            selectedSize,
          },
        ]}
        source="product-details"
      />

    </main>
  );
}

export default ProductDetails;
