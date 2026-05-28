import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck, Key, User, Lock, Sparkles } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [clientId, setClientId] = useState('R54372686');
  const [password, setPassword] = useState('0406');
  const [totpKey, setTotpKey] = useState('4QJRQWTZ6VAG43T6QYRBJZGAXI');
  const [apiKey, setApiKey] = useState('lAvmE4y6');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId || !password) {
      setError('Client ID and Password are required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          password,
          totpKey,
          apiKey,
          isDemo: false
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.clientId);
      } else {
        setError(data.detail || 'Login failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Unable to connect to backend server. Make sure Python backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');

    const demoId = 'ANGEL-DEMO-99';
    const demoPassword = 'Password123';
    const demoTotp = 'DUMMYTOTPKEY';
    const demoApi = 'DUMMYAPIKEY123';

    setClientId(demoId);
    setPassword(demoPassword);
    setTotpKey(demoTotp);
    setApiKey(demoApi);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: demoId,
          password: demoPassword,
          totpKey: demoTotp,
          apiKey: demoApi,
          isDemo: true
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Give a tiny delayed feel to simulate secure verification
        setTimeout(() => {
          onLoginSuccess(data.clientId);
        }, 800);
      } else {
        setError(data.detail || 'Demo login seeding failed.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Unable to connect to backend server. Make sure Python backend is running.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-stars"></div>
      <div className="login-glow-orb-1"></div>
      <div className="login-glow-orb-2"></div>

      <div className="login-container glass-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-accent">QUANTUM</span>
            <span className="logo-white">PORTFOLIO</span>
          </div>
          <p className="login-subtitle">Simulated Angel One API Trade Portal</p>
        </div>

        {error && (
          <div className="login-error">
            <ShieldAlert size={16} className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="input-label">Angel One Client ID</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                placeholder="e.g. A998877"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password / PIN</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label className="input-label">TOTP Key (Optional)</label>
              <div className="input-with-icon">
                <Key size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. JBSWY3DPEHPK3PXP"
                  value={totpKey}
                  onChange={(e) => setTotpKey(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">API Key (Optional)</label>
              <div className="input-with-icon">
                <ShieldCheck size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="SmartAPI Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <span>Secure Login</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button
          onClick={handleDemoLogin}
          className="btn-secondary demo-login-btn"
          disabled={isLoading}
          type="button"
        >
          <Sparkles size={16} className="text-up" />
          <span>Demo Quick Login (Auto-seed Portfolio)</span>
        </button>

        <div className="login-footer">
          <p>This is a simulated trade platform. Your credentials are securely cached in your Firebase Realtime Database instance.</p>
        </div>
      </div>
    </div>
  );
}
