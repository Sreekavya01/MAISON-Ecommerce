import { useState, useEffect } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { onAuthStateChanged } from 'firebase/auth';

import {
  doc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from './firebase';

import toast, { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import Account from './pages/Account';
import Collections from './pages/Collections';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import TrackOrder from './pages/TrackOrder';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import Contact from './pages/Contact';
import Login from './pages/Login';
import MyAddresses from './pages/MyAddresses';
import HelpCentre from './pages/HelpCentre';
import Quotations from './pages/Quotations';
import PolicyPage from './pages/PolicyPage';

import AdminLayout from './layouts/AdminLayout';

import AdminDashboard from './pages/AdminDashboard';
import CustomerManagement from './pages/CustomerManagement';
import OrderManagement from './pages/OrderManagement';
import ProductManagement from './pages/ProductManagement';
import ShippingManagement from './pages/ShippingManagement';
import SalesReports from './pages/SalesReports';
import Notifications from './pages/Notifications';
import AbandonedCarts from './pages/AbandonedCarts';
import ContactMessages from './pages/ContactMessages';
import AdminReturnRequests from './pages/AdminReturnRequests';
import AdminQuotations from './pages/AdminQuotations';
import CustomerReviews from './pages/CustomerReviews';
import PublishedReviewsProvider from './components/PublishedReviewsProvider';

import './App.css';
import { getCartItemKey } from './utils/cart';


// STORAGE KEYS

const CART_STORAGE_KEY = 'maison-cart';
const WISHLIST_STORAGE_KEY = 'maison-wishlist';


// GET GUEST CART

function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}


// GET GUEST WISHLIST

function getGuestWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}


// ADMIN ROUTE PROTECTION

function AdminRoute() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (active) setStatus('unauthenticated');
        return;
      }

      try {
        const userDoc = await getDoc(
          doc(db, 'users', user.uid)
        );

        if (!active) return;

        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setStatus('admin');
        } else {
          setStatus('unauthorized');
        }

      } catch (error) {
        console.error('Admin verification error:', error);

        if (active) setStatus('error');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="admin-loading">
        Verifying administrator access...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/account" replace />;
  }

  if (status === 'error') {
    return (
      <div className="admin-loading">
        Unable to verify administrator access.
        Please try logging in again.
      </div>
    );
  }

  return <Outlet />;
}


// MAIN APP CONTENT

function AppContent({
  cart,
  cartLoading,
  addToCart,
  decreaseQuantity,
  removeFromCart,
  wishlist,
  wishlistLoading,
  toggleWishlist,
  removeFromWishlist,
}) {
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');
  const footerHiddenPaths = ['/login', '/checkout', '/order-confirmation'];
  const showFooter =
    !isAdminPage &&
    !footerHiddenPaths.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  return (
    <div className="app">

      {!isAdminPage && (
        <Navbar
          cartCount={cart.length}
          wishlistCount={wishlist.length}
        />
      )}

      <Toaster position="top-right" />

      <Routes>

        {/* STOREFRONT */}

        <Route
          path="/"
          element={
            <Home
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />

        <Route
          path="/home"
          element={
            <Home
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />

        <Route
          path="/shop"
          element={
            <Shop
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProductDetails
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />

        <Route
          path="/wishlist"
          element={
            wishlistLoading ? (
              <div className="admin-loading">
                Loading your saved favourites...
              </div>
            ) : (
              <Wishlist
                wishlist={wishlist}
                onRemoveFromWishlist={removeFromWishlist}
                onAddToCart={addToCart}
              />
            )
          }
        />

        <Route
          path="/account"
          element={
            <Account
              wishlist={wishlist}
              onAddToCart={addToCart}
            />
          }
        />

        <Route path="/collections" element={<Collections />} />

        {/* CART */}

        <Route
          path="/cart"
          element={
            cartLoading ? (
              <div className="admin-loading">
                Loading your shopping bag...
              </div>
            ) : (
              <Cart
                cart={cart}
                onAddToCart={addToCart}
                onDecrease={decreaseQuantity}
                onRemove={removeFromCart}
                wishlist={wishlist}
                onToggleWishlist={toggleWishlist}
              />
            )
          }
        />

        <Route
          path="/checkout"
          element={
            cartLoading ? (
              <div className="admin-loading">
                Loading your shopping bag...
              </div>
            ) : (
              <Checkout cart={cart} />
            )
          }
        />

        <Route
          path="/order-confirmation"
          element={<OrderConfirmation />}
        />

        <Route path="/track-order" element={<TrackOrder />} />

        <Route path="/about" element={<About />} />

        <Route path="/blog" element={<Blog />} />

        <Route
          path="/blog/:slug"
          element={<BlogArticle />}
        />

        <Route path="/contact" element={<Contact />} />

        <Route path="/help" element={<HelpCentre />} />

        {/* COMMON LOGIN */}

        <Route path="/login" element={<Login />} />

        <Route path="/my-addresses" element={<MyAddresses />} />

        <Route path="/bulk-orders" element={<Navigate to="/shop" replace />} />

        <Route
          path="/invoice"
          element={<Navigate to="/account?section=orders" replace />}
        />

        <Route path="/quotations" element={<Quotations />} />

        <Route path="/privacy-policy" element={<PolicyPage policy="privacy" />} />

        <Route path="/terms-and-conditions" element={<PolicyPage policy="terms" />} />

        <Route path="/return-policy" element={<PolicyPage policy="returns" />} />

        <Route path="/shipping-policy" element={<PolicyPage policy="shipping" />} />

        {/* OLD ADMIN LOGIN REDIRECT */}

        <Route
          path="/admin/login"
          element={<Navigate to="/login" replace />}
        />

        {/* PROTECTED ADMIN ROUTES */}

        <Route element={<AdminRoute />}>

          <Route element={<AdminLayout />}>

            <Route
              path="/admin-dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin-orders"
              element={<OrderManagement />}
            />

            <Route
              path="/admin-products"
              element={<ProductManagement />}
            />

            <Route
              path="/admin-customers"
              element={<CustomerManagement />}
            />

            <Route
              path="/admin-shipping"
              element={<ShippingManagement />}
            />

            <Route
              path="/admin-sales-reports"
              element={<SalesReports />}
            />

            <Route
              path="/admin-notifications"
              element={<Notifications />}
            />

            <Route
              path="/admin-abandoned-carts"
              element={<AbandonedCarts />}
            />

            <Route
              path="/admin-contact-messages"
              element={<ContactMessages />}
            />

            <Route
              path="/admin-quotations"
              element={<AdminQuotations />}
            />

            {/* RETURN REQUESTS */}

            <Route
              path="/admin-return-requests"
              element={<AdminReturnRequests />}
            />

            <Route
              path="/admin-customer-reviews"
              element={<CustomerReviews />}
            />

          </Route>

        </Route>

      </Routes>

      {showFooter && <Footer />}

    </div>
  );
}


// ROOT APP

function App() {
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);


  // LOAD CUSTOMER CART FROM FIREBASE

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCartLoading(true);

      try {
        if (!user) {
          if (active) {
            setCart(getGuestCart());
          }

          return;
        }

        const cartRef = collection(
          db,
          'users',
          user.uid,
          'cart'
        );

        const guestCart = getGuestCart();

        // TRANSFER GUEST CART TO FIREBASE

        if (guestCart.length > 0) {
          const groupedGuestCart = guestCart.reduce((result, product) => {
            const cartItemKey = getCartItemKey(product);

            if (!result[cartItemKey]) {
              result[cartItemKey] = {
                ...product,
                cartItemKey,
                quantity: 0,
              };
            }

            result[cartItemKey].quantity += 1;

            return result;
          }, {});

          for (const cartItemKey of Object.keys(groupedGuestCart)) {
            const product = groupedGuestCart[cartItemKey];

            const productRef = doc(
              db,
              'users',
              user.uid,
              'cart',
                cartItemKey
            );

            await runTransaction(db, async (transaction) => {
              const productSnapshot = await transaction.get(productRef);

              const existingQuantity = productSnapshot.exists()
                ? productSnapshot.data().quantity || 0
                : 0;

              transaction.set(productRef, {
                ...product,
                quantity: existingQuantity + product.quantity,
                lastActivityAt: serverTimestamp(),
              });
            });
          }

          localStorage.removeItem(CART_STORAGE_KEY);
        }

        // LOAD CART FROM FIREBASE

        const cartSnapshot = await getDocs(cartRef);

        const firebaseCart = [];

        cartSnapshot.forEach((cartDocument) => {
          const product = cartDocument.data();

          const quantity = Math.max(
            0,
            Number(product.quantity) || 0
          );

          for (let i = 0; i < quantity; i++) {
            firebaseCart.push({
              ...product,
              id: product.id ?? cartDocument.id,
              cartItemKey: cartDocument.id,
            });
          }
        });

        if (active) {
          setCart(firebaseCart);
        }

      } catch (error) {
        console.error('Cart loading error:', error);

        if (active) {
          toast.error('Unable to load your saved cart.');
          setCart(getGuestCart());
        }

      } finally {
        if (active) {
          setCartLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);


  // SAVE GUEST CART

  useEffect(() => {
    if (!cartLoading && !auth.currentUser) {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
      );
    }
  }, [cart, cartLoading]);


  // LOAD WISHLIST FROM FIREBASE

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setWishlistLoading(true);

      try {
        if (!user) {
          if (active) {
            setWishlist(getGuestWishlist());
          }

          return;
        }

        const wishlistRef = collection(
          db,
          'users',
          user.uid,
          'wishlist'
        );

        const guestWishlist = getGuestWishlist();

        // TRANSFER GUEST WISHLIST TO FIREBASE

        if (guestWishlist.length > 0) {
          for (const product of guestWishlist) {
            const productRef = doc(
              db,
              'users',
              user.uid,
              'wishlist',
              String(product.id)
            );

            await setDoc(
              productRef,
              product,
              { merge: true }
            );
          }

          localStorage.removeItem(WISHLIST_STORAGE_KEY);
        }

        // LOAD CUSTOMER WISHLIST

        const wishlistSnapshot = await getDocs(wishlistRef);

        const firebaseWishlist = wishlistSnapshot.docs.map(
          (wishlistDocument) => ({
            ...wishlistDocument.data(),
            id: wishlistDocument.id,
          })
        );

        if (active) {
          setWishlist(firebaseWishlist);
        }

      } catch (error) {
        console.error('Wishlist loading error:', error);

        if (active) {
          toast.error('Unable to load your saved wishlist.');
          setWishlist(getGuestWishlist());
        }

      } finally {
        if (active) {
          setWishlistLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);


  // SAVE GUEST WISHLIST

  useEffect(() => {
    if (!wishlistLoading && !auth.currentUser) {
      localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(wishlist)
      );
    }
  }, [wishlist, wishlistLoading]);


  // ADD PRODUCT TO CART

  const addToCart = async (product) => {
    const cartItemKey = getCartItemKey(product);
    const cartProduct = { ...product, cartItemKey };

    setCart(previousCart => [...previousCart, cartProduct]);

    const user = auth.currentUser;

    if (!user) return;

    try {
      const productRef = doc(
        db,
        'users',
        user.uid,
        'cart',
        cartItemKey
      );

      await runTransaction(db, async (transaction) => {
        const productSnapshot = await transaction.get(productRef);

        const existingQuantity = productSnapshot.exists()
          ? productSnapshot.data().quantity || 0
          : 0;

        transaction.set(productRef, {
          ...cartProduct,
          quantity: existingQuantity + 1,
          lastActivityAt: serverTimestamp(),
        });
      });

    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Unable to save this item to your cart.');
    }
  };


  // DECREASE PRODUCT QUANTITY

  const decreaseQuantity = async (product) => {
    const cartItemKey = getCartItemKey(product);

    setCart(previousCart => {
      const index = previousCart.findIndex(
        cartProduct => getCartItemKey(cartProduct) === cartItemKey
      );

      if (index === -1) return previousCart;

      return previousCart.filter(
        (product, i) => i !== index
      );
    });

    const user = auth.currentUser;

    if (!user) return;

    try {
      const productRef = doc(
        db,
        'users',
        user.uid,
        'cart',
        cartItemKey
      );

      await runTransaction(db, async (transaction) => {
        const productSnapshot = await transaction.get(productRef);

        if (!productSnapshot.exists()) return;

        const quantity = productSnapshot.data().quantity || 0;

        if (quantity <= 1) {
          transaction.delete(productRef);
        } else {
          transaction.update(productRef, {
            quantity: quantity - 1,
            lastActivityAt: serverTimestamp(),
          });
        }
      });

    } catch (error) {
      console.error('Decrease cart quantity error:', error);
      toast.error('Unable to update your cart.');
    }
  };


  // REMOVE PRODUCT COMPLETELY FROM CART

  const removeFromCart = async (product) => {
    const cartItemKey = getCartItemKey(product);

    setCart(previousCart =>
      previousCart.filter(
        cartProduct => getCartItemKey(cartProduct) !== cartItemKey
      )
    );

    const user = auth.currentUser;

    if (!user) return;

    try {
      const cartRef = collection(
        db,
        'users',
        user.uid,
        'cart'
      );

      const productRef = doc(
        db,
        'users',
        user.uid,
        'cart',
        cartItemKey
      );

      await deleteDoc(productRef);

      const remainingCart = await getDocs(cartRef);

      if (!remainingCart.empty) {
        const batch = writeBatch(db);

        remainingCart.forEach((cartDocument) => {
          batch.update(cartDocument.ref, {
            lastActivityAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }

    } catch (error) {
      console.error('Remove from cart error:', error);
      toast.error('Unable to remove this item.');
    }
  };


  // ADD OR REMOVE PRODUCT FROM WISHLIST

  const toggleWishlist = async (product) => {
    const alreadySaved = wishlist.some(
      item => String(item.id) === String(product.id)
    );

    if (alreadySaved) {
      removeFromWishlist(product.id);
      return;
    }

    setWishlist(previousWishlist => [
      ...previousWishlist,
      product,
    ]);

    const user = auth.currentUser;

    if (!user) return;

    try {
      await setDoc(
        doc(
          db,
          'users',
          user.uid,
          'wishlist',
          String(product.id)
        ),
        product
      );

    } catch (error) {
      console.error('Add to wishlist error:', error);
      toast.error('Unable to save this favourite.');
    }
  };


  // REMOVE PRODUCT FROM WISHLIST

  const removeFromWishlist = async (productId) => {
    setWishlist(previousWishlist =>
      previousWishlist.filter(
        product => String(product.id) !== String(productId)
      )
    );

    const user = auth.currentUser;

    if (!user) return;

    try {
      await deleteDoc(
        doc(
          db,
          'users',
          user.uid,
          'wishlist',
          String(productId)
        )
      );

    } catch (error) {
      console.error('Remove from wishlist error:', error);
      toast.error('Unable to remove this favourite.');
    }
  };


  return (
    <BrowserRouter>
      <PublishedReviewsProvider>
        <AppContent
          cart={cart}
          cartLoading={cartLoading}
          addToCart={addToCart}
          decreaseQuantity={decreaseQuantity}
          removeFromCart={removeFromCart}
          wishlist={wishlist}
          wishlistLoading={wishlistLoading}
          toggleWishlist={toggleWishlist}
          removeFromWishlist={removeFromWishlist}
        />
      </PublishedReviewsProvider>
    </BrowserRouter>
  );
}

export default App;
