import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Invalid corporate credentials.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <h2>Wealth Growth AI</h2>
          <p className="login-tagline">Canadian Private Banking &amp; Intent Advisory Engine</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert login-alert-error" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label htmlFor="auth-email">Corporate Work Email</label>
            <div className="login-input-wrap">
              <Mail size={15} className="login-input-icon" />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@scotia.wealth or corporate domain"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="auth-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={15} className="login-input-icon" />
              <input
                id="auth-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
