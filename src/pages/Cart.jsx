import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  BadgePercent,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';

import BulkOrderDrawer from '../components/BulkOrderDrawer';
import ProductRating from '../components/ProductRating';
import { groupCartItems } from '../utils/cart';
import './Cart.css';

const getOriginalPrice = (product) =>
  Number(product.originalPrice || product.compareAtPrice) || 0;

const getDiscountPercentage = (product) => {
  const price = Number(product.price) || 0;
  const originalPrice = getOriginalPrice(product);

  return originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
};

function Cart({
  cart,
  onAddToCart,
  onDecrease,
  onRemove,
  wishlist = [],
  onToggleWishlist,
}) {
  const [bulkOrderOpen, setBulkOrderOpen] = useState(false);
  const groupedCart = groupCartItems(cart);
  const itemCount = groupedCart.reduce(
    (total, product) => total + product.quantity,
    0
  );

  const subtotal = groupedCart.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );

  const handleSaveForLater = async (product) => {
    if (typeof onToggleWishlist !== 'function') {
      toast.error('Wishlist is not connected. Please try again.');
      return;
    }

    const alreadySaved = wishlist.some(
      (item) => String(item.id) === String(product.id)
    );

    if (!alreadySaved) {
      await onToggleWishlist(product);
    }

    await onRemove(product);
    toast.success('Saved to your wishlist for later.');
  };

  const handleShare = async (product) => {
    const productUrl = `${window.location.origin}/product/${product.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Take a look at ${product.name} from MAISON.`,
          url: productUrl,
        });
      } else {
        await navigator.clipboard.writeText(productUrl);
        toast.success('Product link copied.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('Unable to share this product.');
      }
    }
  };

  if (cart.length === 0) {
    return (
      <main className="cart-page cart-page-empty">
        <section className="empty-cart">
          <div className="empty-cart-icon">
            <ShoppingBag size={42} strokeWidth={1.3} />
          </div>

          <span className="cart-eyebrow">MAISON COLLECTION</span>
          <h1>Your Shopping Cart Is Empty</h1>
          <p>
            Your next favourite find is waiting. Explore our collections and
            discover something beautiful.
          </p>

          <Link to="/shop" className="continue-shopping">
            Explore the collection
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-layout">
        <section className="cart-items-section" aria-labelledby="cart-title">
          <header className="cart-header">
            <div>
              <span className="cart-eyebrow">MAISON / YOUR SELECTION</span>
              <h1 id="cart-title">Shopping Cart</h1>
              <p>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
            </div>
            <span className="cart-price-label">Price</span>
          </header>

          <div className="cart-product-list">
            {groupedCart.map((product) => {
              const stock = Number(product.stock) || 0;
              const originalPrice = getOriginalPrice(product);
              const discountPercentage = getDiscountPercentage(product);
              const lineTotal = Number(product.price) * product.quantity;

              return (
                <article className="cart-item" key={product.cartItemKey}>
                  <Link
                    to={`/product/${product.id}`}
                    className="cart-product-image"
                    aria-label={`View ${product.name}`}
                  >
                    <img src={product.image} alt={product.name} />
                  </Link>

                  <div className="cart-item-details">
                    <span className="cart-product-category">
                      {product.category}
                    </span>

                    <h2>
                      <Link to={`/product/${product.id}`}>{product.name}</Link>
                    </h2>

                    <ProductRating productId={product.id} size="compact" />

                    <p className={`cart-stock ${stock <= 0 ? 'is-low' : ''}`}>
                      {stock > 0 ? 'In stock' : 'Availability to be confirmed'}
                    </p>

                    <p className="cart-delivery-line">
                      <Truck size={15} />
                      <span><strong>FREE delivery</strong> available at checkout</span>
                    </p>

                    <span className="cart-fulfilled-badge">MAISON FULFILLED</span>

                    {(product.selectedColor || product.selectedSize) && (
                      <dl className="cart-product-variant">
                        {product.selectedColor && (
                          <div>
                            <dt>Colour:</dt>
                            <dd>{product.selectedColor}</dd>
                          </div>
                        )}
                        {product.selectedSize && (
                          <div>
                            <dt>Size:</dt>
                            <dd>{product.selectedSize}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    <div className="cart-item-controls">
                      <div className="quantity-control" aria-label="Item quantity">
                        <button
                          type="button"
                          onClick={() => onDecrease(product)}
                          aria-label={
                            product.quantity === 1
                              ? `Remove ${product.name}`
                              : `Decrease quantity of ${product.name}`
                          }
                        >
                          {product.quantity === 1 ? (
                            <Trash2 size={15} />
                          ) : (
                            <Minus size={15} />
                          )}
                        </button>
                        <span>{product.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(product)}
                          aria-label={`Increase quantity of ${product.name}`}
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-action-link"
                        onClick={() => onRemove(product)}
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        className="cart-action-link"
                        onClick={() => handleSaveForLater(product)}
                      >
                        <Heart size={14} />
                        Save for later
                      </button>

                      <button
                        type="button"
                        className="cart-action-link"
                        onClick={() => handleShare(product)}
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-price">
                    {discountPercentage > 0 && (
                      <span className="cart-deal-label">
                        -{discountPercentage}% deal
                      </span>
                    )}
                    <strong>₹{lineTotal.toLocaleString('en-IN')}</strong>
                    {originalPrice > Number(product.price) && (
                      <small>
                        M.R.P.: ₹
                        {(originalPrice * product.quantity).toLocaleString('en-IN')}
                      </small>
                    )}
                    {product.quantity > 1 && (
                      <small>
                        ₹{Number(product.price).toLocaleString('en-IN')} each
                      </small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="cart-list-footer">
            <Link to="/shop" className="back-to-shop">
              Continue shopping
            </Link>
            <p>
              Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):
              <strong> ₹{subtotal.toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </section>

        <aside className="cart-summary" aria-labelledby="summary-title">
          <div className="summary-delivery-status">
            <CheckCircle2 size={20} />
            <span>Your order qualifies for <strong>FREE delivery</strong>.</span>
          </div>

          <h2 id="summary-title">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):
            <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
          </h2>

          <p className="summary-tax-note">
            Taxes and delivery charges are calculated at checkout.
          </p>

          <Link to="/checkout" className="checkout-button">
            Proceed to checkout
          </Link>

          <div className="cart-summary-divider" />

          <button
            type="button"
            className="cart-bulk-quote"
            onClick={() => setBulkOrderOpen(true)}
          >
            <BadgePercent size={20} />
            <span>
              <strong>Buying for a team or business?</strong>
              Request pricing for 10+ units
            </span>
            <b>Get quote</b>
          </button>

          <div className="cart-benefits">
            <div>
              <ShieldCheck size={18} />
              <span>Secure checkout and protected payments</span>
            </div>
            <div>
              <Truck size={18} />
              <span>Complimentary delivery on this order</span>
            </div>
          </div>
        </aside>
      </div>

      <BulkOrderDrawer
        open={bulkOrderOpen}
        onClose={() => setBulkOrderOpen(false)}
        initialItems={groupedCart}
        source="shopping-cart"
      />
    </main>
  );
}

export default Cart;
