import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Heart,
  Share2,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import ProductRating from '../components/ProductRating';
import './Wishlist.css';

function Wishlist({ wishlist = [], onRemoveFromWishlist, onAddToCart }) {
  const handleAddToCart = async (product) => {
    if (product.stock === 0) {
      toast.error('This item is currently out of stock.');
      return;
    }

    if (typeof onAddToCart !== 'function') {
      toast.error('Your cart is unavailable. Please try again.');
      return;
    }

    await onAddToCart(product);
    toast.success(`${product.name} added to your bag!`);
  };

  const handleShare = async (product) => {
    const productUrl = `${window.location.origin}/product/${product.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Take a look at ${product.name} on MAISON.`,
          url: productUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(productUrl);
      toast.success('Product link copied.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Unable to share this item.');
      }
    }
  };

  return (
    <main className="wishlist-page">
      <SEO
        title="My Wishlist | MAISON"
        description="View your favourite fashion and lifestyle products saved at MAISON."
        robots="noindex, nofollow"
      />

      <section className="wishlist-hero">
        <span>YOUR PERSONAL COLLECTION</span>
        <h1>My <i>Wishlist.</i></h1>
        <p>All the pieces you love, gathered in one place.</p>
        <div className="wishlist-hero-icon">
          <Heart size={28} />
        </div>
      </section>

      <section className="wishlist-content">
        <div className="wishlist-heading">
          <div>
            <span>MAISON FAVOURITES</span>
            <h2>Saved Items</h2>
          </div>

          <p>{wishlist.length} {wishlist.length === 1 ? 'ITEM' : 'ITEMS'}</p>
        </div>

        {wishlist.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              <Heart size={38} />
            </div>

            <h2>Your Wishlist Is Empty</h2>

            <p>
              You haven't saved anything yet. Explore our collections
              and save the products you love.
            </p>

            <Link to="/shop" className="wishlist-shop-button">
              EXPLORE COLLECTIONS
            </Link>
          </div>
        ) : (
          <div className="wishlist-list">
            {wishlist.map((product) => (
              <article className="wishlist-item" key={product.id}>
                <Link
                  to={`/product/${product.id}`}
                  className="wishlist-image"
                >
                  <img src={product.image} alt={product.name} />
                </Link>

                <div className="wishlist-product-info">
                  <div className="wishlist-product-topline">
                    <span>{product.category}</span>
                    <span className={product.stock === 0 ? 'out-of-stock' : ''}>
                      <CheckCircle2 size={14} />
                      {product.stock === 0 ? 'Out of stock' : 'In stock'}
                    </span>
                  </div>

                  <Link
                    to={`/product/${product.id}`}
                    className="wishlist-product-name"
                  >
                    <h3>{product.name}</h3>
                  </Link>

                  <ProductRating productId={product.id} />

                  <p className="wishlist-product-description">
                    {product.description || 'A thoughtfully selected piece from the MAISON collection.'}
                  </p>

                  <div className="wishlist-price-row">
                    <strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>
                    <span>Inclusive of all taxes</span>
                  </div>

                  <div className="wishlist-product-meta">
                    {product.colors?.[0] && <span>Colour: {product.colors[0]}</span>}
                    <span>Saved to your wishlist</span>
                  </div>

                  <div className="wishlist-actions">
                    <button
                      type="button"
                      className="wishlist-cart-button"
                      disabled={product.stock === 0}
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingBag size={16} />
                      {product.stock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                    </button>

                    <Link
                      to={`/product/${product.id}`}
                      className="wishlist-secondary-action"
                    >
                      View item
                    </Link>

                    <button
                      type="button"
                      className="wishlist-icon-action"
                      onClick={() => handleShare(product)}
                      aria-label={`Share ${product.name}`}
                      title="Share item"
                    >
                      <Share2 size={17} />
                    </button>

                    <button
                      type="button"
                      className="wishlist-icon-action wishlist-remove"
                      onClick={() => onRemoveFromWishlist(product.id)}
                      aria-label={`Remove ${product.name} from wishlist`}
                      title="Remove from wishlist"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wishlist-bottom">
        <div>
          <span>THE MAISON EDIT</span>
          <h2>Find Your Next Favourite.</h2>
          <p>Discover more thoughtfully selected pieces for your lifestyle.</p>
        </div>

        <Link to="/shop">CONTINUE SHOPPING</Link>
      </section>
    </main>
  );
}

export default Wishlist;
