import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import toast from 'react-hot-toast';
import SEO from '../components/SEO';

import './Login.css';

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    toast.success('Admin authentication will be connected to Firebase soon.');
  };

  return (
    <main className="login-page">

      <SEO
        title="Admin Login | MAISON"
        description="Secure administration access for MAISON."
        robots="noindex, nofollow"
      />

      <section className="login-image-panel">
        <div className="login-image-overlay"></div>

        <div className="login-image-content">
          <span>MAISON ADMINISTRATION</span>

          <h1>
            Manage.
            <br />
            <i>Lead.</i>
          </h1>

          <p>
            Welcome to the MAISON administration portal.
            Manage your store operations through one central platform.
          </p>

          <div className="login-image-footer">
            MAISON · ADMINISTRATION PORTAL
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">

          <Link to="/" className="login-brand">
            MAISON
            <span>ADMINISTRATION</span>
          </Link>

          <div className="login-heading">
            <span>SECURE ADMIN ACCESS</span>

            <h2>Welcome Back.</h2>

            <p>
              Sign in with your authorized administrator account.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>

            <div className="login-input-group">
              <label>Email Address</label>

              <div className="login-input-wrapper">
                <Mail size={19} />

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your admin email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label>Password</label>

              <div className="login-input-wrapper">
                <LockKeyhole size={19} />

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-button">
              ADMIN SIGN IN
              <ArrowRight size={18} />
            </button>

          </form>

          <div className="login-switch">
            <Link to="/login">
              Back to Customer Login
            </Link>
          </div>

          <div className="login-bottom-note">
            <ShieldCheck size={14} />
            AUTHORIZED ADMINISTRATORS ONLY · MAISON
          </div>

        </div>
      </section>

    </main>
  );
}

export default AdminLogin;