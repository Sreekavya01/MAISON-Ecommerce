import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  LockKeyhole,
  Mail,
  UserRound,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../firebase';

import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
} from '../utils/adminNotifications';

import toast from 'react-hot-toast';
import SEO from '../components/SEO';

import './Login.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedCustomerDestination = location.state?.from;

  const customerDestination =
    typeof requestedCustomerDestination === 'string' &&
    requestedCustomerDestination.startsWith('/account')
      ? requestedCustomerDestination
      : '/account';

  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // CREATE OR REPAIR CUSTOMER PROFILE
  const ensureUserProfile = async (user, registrationName = '') => {
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    const existingData = userSnapshot.exists()
      ? userSnapshot.data()
      : {};

    // Never change an existing admin account.
    if (existingData.role === 'admin') {
      return existingData;
    }

    // Do not automatically change another existing role.
    if (
      existingData.role &&
      existingData.role !== 'customer'
    ) {
      return existingData;
    }

    const customerName =
      existingData.name ||
      user.displayName ||
      registrationName.trim() ||
      user.email?.split('@')[0] ||
      'MAISON Customer';

    const profileNeedsRepair =
      !userSnapshot.exists() ||
      !existingData.name ||
      !existingData.email ||
      !existingData.role ||
      !existingData.createdAt;

    if (!profileNeedsRepair) {
      return existingData;
    }

    const userData = {
      name: customerName,
      email: user.email || existingData.email || '',
      role: 'customer',
      createdAt:
        existingData.createdAt || serverTimestamp(),
    };

    // STEP 1: SAVE CUSTOMER PROFILE FIRST
    await setDoc(userRef, userData, { merge: true });

    // STEP 2: CREATE ADMIN NOTIFICATION SEPARATELY
    // A notification failure will not affect the customer profile.
    if (
      !userSnapshot.exists() ||
      !existingData.role
    ) {
      try {
        const notificationBatch = writeBatch(db);

        addAdminNotificationWrite(notificationBatch, {
          id: adminNotificationIds.customer(user.uid),
          type: ADMIN_NOTIFICATION_TYPES.CUSTOMER_REGISTERED,
          message: `${customerName} created a MAISON customer account.`,
          relatedDocumentId: user.uid,
          sourceCollection: 'users',
          targetPage: '/admin-customers',
        });

        await notificationBatch.commit();

      } catch (notificationError) {
        console.error(
          'Customer notification could not be created:',
          notificationError
        );
      }
    }

    return {
      ...existingData,
      ...userData,
    };
  };

  // REDIRECT USER BASED ON FIRESTORE ROLE
  const redirectUser = async (user) => {
    const userData = await ensureUserProfile(user);

    if (userData.role === 'admin') {
      toast.success('Welcome to MAISON Admin Dashboard!');
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    if (userData.role === 'customer') {
      toast.success('Welcome to MAISON!');
      navigate(customerDestination, { replace: true });
      return;
    }

    await signOut(auth);
    toast.error('Invalid account role.');
  };

  // GOOGLE SIGN-IN
  const handleGoogleSignIn = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: 'select_account',
      });

      const result = await signInWithPopup(auth, provider);

      await redirectUser(result.user);

    } catch (error) {
      console.error('Google authentication error:', error);

      const errorMessages = {
        'auth/popup-closed-by-user':
          'Google sign-in was cancelled.',
        'auth/popup-blocked':
          'Your browser blocked the Google sign-in popup.',
        'auth/cancelled-popup-request':
          'Google sign-in was cancelled.',
        'auth/account-exists-with-different-credential':
          'An account already exists with this email. Please use your original login method.',
        'auth/network-request-failed':
          'Network error. Please check your internet connection.',
        'permission-denied':
          'Unable to save your customer profile. Please check Firebase permissions.',
      };

      toast.error(
        errorMessages[error.code] ||
        'Google sign-in failed. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  // EMAIL AND PASSWORD LOGIN / REGISTRATION
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      // FORGOT PASSWORD
      if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);

        toast.success('Password reset email sent!');
        setMode('login');
        return;
      }

      // CUSTOMER REGISTRATION
      if (mode === 'register') {
        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        const user = userCredential.user;

        await ensureUserProfile(user, formData.name);

        toast.success('Account created successfully!');

        navigate(customerDestination, { replace: true });
        return;
      }

      // COMMON LOGIN
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      await redirectUser(userCredential.user);

    } catch (error) {
      console.error('Authentication error:', error);

      const errorMessages = {
        'auth/invalid-credential':
          'Incorrect email or password.',
        'auth/user-not-found':
          'No account found with this email.',
        'auth/wrong-password':
          'Incorrect password.',
        'auth/email-already-in-use':
          'An account with this email already exists.',
        'auth/weak-password':
          'Password must contain at least 6 characters.',
        'auth/invalid-email':
          'Please enter a valid email address.',
        'auth/too-many-requests':
          'Too many attempts. Please try again later.',
        'permission-denied':
          'Unable to save your customer profile. Please check Firebase permissions.',
      };

      toast.error(
        errorMessages[error.code] ||
        'Something went wrong. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">

      <SEO
        title="Login | MAISON"
        description="Sign in or create your MAISON account."
        robots="noindex, nofollow"
      />

      <section className="login-form-panel">

        <div className="login-form-container">

          <Link to="/" className="login-brand">
            MAISON
          </Link>

          <div className="login-heading">

            <h2>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Forgot Password?'}
            </h2>

            <p>
              {mode === 'login' &&
                'Sign in to your MAISON account.'}

              {mode === 'register' &&
                'Create your MAISON account to get started.'}

              {mode === 'forgot' &&
                'Enter your email address to reset your password.'}
            </p>

          </div>

          <form className="login-form" onSubmit={handleSubmit}>

            {mode === 'register' && (
              <div className="login-input-group">

                <label>Full Name</label>

                <div className="login-input-wrapper">
                  <UserRound size={19} />

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

              </div>
            )}

            <div className="login-input-group">

              <label>Email Address</label>

              <div className="login-input-wrapper">
                <Mail size={19} />

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            {mode !== 'forgot' && (
              <div className="login-input-group">

                <label>Password</label>

                <div className="login-input-wrapper password-input-wrapper">

                  <LockKeyhole size={19} />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    title={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>
            )}

            {mode === 'login' && (
              <div className="login-options">

                <label className="remember-option">
                  <input type="checkbox" />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                >
                  Forgot password?
                </button>

              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >
              {loading
                ? 'PLEASE WAIT...'
                : mode === 'login'
                ? 'SIGN IN'
                : mode === 'register'
                ? 'CREATE ACCOUNT'
                : 'SEND RESET REQUEST'}

              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          {/* GOOGLE SIGN-IN */}

          {mode === 'login' && (
            <>
              <div className="login-divider">
                <span></span>
                OR CONTINUE WITH
                <span></span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="google-login-button"
              >
                <span className="google-icon">G</span>
                CONTINUE WITH GOOGLE
              </button>
            </>
          )}

          <div className="login-switch">

            {mode === 'login' && (
              <>
                Don't have an account?

                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: '',
                      email: formData.email,
                      password: '',
                    });

                    setShowPassword(false);
                    setMode('register');
                  }}
                >
                  Create Account
                </button>
              </>
            )}

            {mode === 'register' && (
              <>
                Already have an account?

                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(false);
                    setMode('login');
                  }}
                >
                  Sign In
                </button>
              </>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
              >
                Back to Sign In
              </button>
            )}

          </div>

        </div>

      </section>

    </main>
  );
}

export default Login;