import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import {
  Heart,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Search,
  ShoppingCart,
  Truck,
  UserRound,
  X,
} from 'lucide-react';

import { auth, db } from '../firebase';
import { categories, products } from '../data/products';
import ProductRating from './ProductRating';

import './Navbar.css';

function Navbar({ cartCount = 0, wishlistCount = 0 }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (active) setCurrentUser(user);

      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }

      try {
        const userDocument = await getDoc(doc(db, 'users', user.uid));

        if (active) {
          setIsAdmin(
            userDocument.exists() && userDocument.data().role === 'admin'
          );
        }
      } catch (error) {
        console.error('Navbar admin verification error:', error);
        if (active) setIsAdmin(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const filteredProducts = searchTerm.trim()
    ? products
        .filter((product) => {
          const search = searchTerm.trim().toLowerCase();

          return (
            product.name.toLowerCase().includes(search) ||
            product.category.toLowerCase().includes(search) ||
            product.description.toLowerCase().includes(search)
          );
        })
        .slice(0, 6)
    : [];

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchTerm.trim();

    if (!query) {
      setSearchOpen(true);
      return;
    }

    navigate(`/shop?search=${encodeURIComponent(query)}`);
    closeAllMenus();
  };

  const accountGreeting = currentUser?.displayName
    ? `Hello, ${currentUser.displayName.split(' ')[0]}`
    : currentUser
      ? 'Welcome back'
      : 'Hello, sign in';

  return (
    <header className="navbar">
      <div className="announcement-bar">
        <div className="announcement-left">
          <Truck size={14} />
          <span>Free shipping on qualifying orders over ₹2,999</span>
        </div>

        <div className="announcement-right">
          <Link to="/track-order">Track order</Link>
          <Link to="/help">Help centre</Link>
          {isAdmin && (
            <Link to="/admin-dashboard" className="admin-dashboard-nav-link">
              <LayoutDashboard size={13} /> Admin dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="navbar-main">
        <div className="navbar-container">
          <Link to="/home" className="navbar-logo" onClick={closeAllMenus}>
            <span>MAISON</span>
            <small>THE ART OF SHOPPING</small>
          </Link>

          <form className="navbar-search" onSubmit={handleSearchSubmit}>
            <label className="sr-only" htmlFor="maison-site-search">
              Search MAISON products
            </label>
            <input
              id="maison-site-search"
              type="search"
              placeholder="Search MAISON products and categories"
              value={searchTerm}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setSearchOpen(true);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="navbar-search-submit" aria-label="Search">
              <Search size={21} />
            </button>
          </form>

          <div className="nav-actions">
            <Link to="/account" className="nav-action" onClick={closeAllMenus}>
              <UserRound size={21} />
              <span><small>{accountGreeting}</small><strong>Account</strong></span>
            </Link>

            <Link to="/wishlist" className="nav-action" onClick={closeAllMenus}>
              <span className="nav-action-icon">
                <Heart size={21} />
                {wishlistCount > 0 && <b>{wishlistCount}</b>}
              </span>
              <span><small>Saved items</small><strong>Wishlist</strong></span>
            </Link>

            <Link to="/account?section=orders" className="nav-action nav-orders" onClick={closeAllMenus}>
              <PackageSearch size={21} />
              <span><small>Returns &</small><strong>Orders</strong></span>
            </Link>

            <Link to="/cart" className="nav-action nav-cart" onClick={closeAllMenus}>
              <span className="nav-action-icon">
                <ShoppingCart size={24} />
                {cartCount > 0 && <b>{cartCount}</b>}
              </span>
              <span><small>Your</small><strong>Cart</strong></span>
            </Link>

            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="navbar-search-panel">
            <div className="navbar-search-panel-top">
              <span>{searchTerm.trim() ? 'SEARCH RESULTS' : 'POPULAR CATEGORIES'}</span>
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search suggestions">
                <X size={18} />
              </button>
            </div>

            {!searchTerm.trim() ? (
              <div className="search-suggestions">
                {categories.slice(1, 6).map((category) => (
                  <Link
                    key={category}
                    to={`/shop?category=${encodeURIComponent(category)}`}
                    onClick={closeAllMenus}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="search-result-grid">
                {filteredProducts.map((product) => (
                  <Link
                    to={`/product/${product.id}`}
                    className="search-result-card"
                    key={product.id}
                    onClick={closeAllMenus}
                  >
                    <img src={product.image} alt="" />
                    <div>
                      <span>{product.category}</span>
                      <h4>{product.name}</h4>
                      <ProductRating productId={product.id} size="compact" />
                      <strong>₹{product.price.toLocaleString('en-IN')}</strong>
                    </div>
                  </Link>
                ))}
                <button type="button" className="search-view-all" onClick={handleSearchSubmit}>
                  View all results for “{searchTerm.trim()}”
                  <Search size={16} />
                </button>
              </div>
            ) : (
              <div className="search-empty-state">
                <Search size={24} />
                <div><h4>No matching products</h4><p>Try another product name or category.</p></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="navbar-secondary">
        <nav aria-label="Main navigation">
          <Link to="/shop" className="all-categories-link" onClick={closeAllMenus}>
            <Menu size={16} /> Shop
          </Link>
          <Link to="/blog" onClick={closeAllMenus}>Blog</Link>
          <Link to="/about" onClick={closeAllMenus}>About MAISON</Link>
          <Link to="/home#special-offers" className="secondary-offer-link" onClick={closeAllMenus}>Special offers</Link>
        </nav>
      </div>

      <nav className={`mobile-navigation ${mobileMenuOpen ? 'open' : ''}`}>
        <NavLink to="/home" onClick={closeAllMenus}>Home</NavLink>
        <NavLink to="/shop" onClick={closeAllMenus}>Shop all</NavLink>
        <NavLink to="/blog" onClick={closeAllMenus}>Blog</NavLink>
        <NavLink to="/account" onClick={closeAllMenus}>My account</NavLink>
        <NavLink to="/account?section=orders" onClick={closeAllMenus}>Orders</NavLink>
        <NavLink to="/about" onClick={closeAllMenus}>About MAISON</NavLink>
        {isAdmin && <NavLink to="/admin-dashboard" onClick={closeAllMenus}>Admin dashboard</NavLink>}
      </nav>
    </header>
  );
}

export default Navbar;
