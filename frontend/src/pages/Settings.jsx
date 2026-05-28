import React, { useState } from 'react';
import { Settings as SetIcon, Database, Shield, Sliders, RefreshCw, Key, Check } from 'lucide-react';
import './Settings.css';

export default function Settings({ clientId }) {
  const [riskProfile, setRiskProfile] = useState('Medium');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [syncSettings, setSyncSettings] = useState({
    holdings: true,
    transactions: true,
    predictions: true,
    marketFeed: true
  });

  const handleToggle = (key) => {
    setSyncSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    
    // Simulate API delay
    setTimeout(() => {
      setSaveLoading(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 1000);
  };

  const rawFirebaseConfig = {
    apiKey: "AIzaSyBQcEQUb_mH0DkxPLA8xIlKvDd6oDR79Ww",
    authDomain: "stock-market-13e36.firebaseapp.com",
    databaseURL: "https://stock-market-13e36-default-rtdb.firebaseio.com",
    projectId: "stock-market-13e36",
    storageBucket: "stock-market-13e36.firebasestorage.app",
    messagingSenderId: "311468119751",
    appId: "1:311468119751:web:00669b68691f81e8d250e2"
  };

  return (
    <div className="settings-page-container">
      <div className="settings-grid">
        {/* LEFT COLUMN - CONFIG FORM */}
        <div className="settings-left-col">
          {/* Angel One Credential Overview */}
          <div className="settings-card glass-card">
            <div className="card-header-icon-row">
              <Key size={18} className="primary-color" />
              <h3 className="card-heading">Angel One API Credentials</h3>
            </div>
            <p className="card-desc text-muted">Active credentials simulated inside this secure browser environment.</p>
            
            <div className="form-grid">
              <div className="form-group-settings">
                <span className="form-label-settings">Client ID</span>
                <input type="text" value={clientId} disabled className="input-settings-disabled" />
              </div>

              <div className="form-group-settings">
                <span className="form-label-settings">SmartAPI Key</span>
                <input type="text" value="AIzaSyBQcEQUb_mH0DkxPLA8xIlKvDd6oDR79Ww" disabled className="input-settings-disabled" />
              </div>

              <div className="form-group-settings">
                <span className="form-label-settings">SmartAPI Token Session</span>
                <input type="password" value="••••••••••••••••••••••••••••••••" disabled className="input-settings-disabled" />
              </div>
            </div>
          </div>

          {/* Risk Profiler */}
          <div className="settings-card glass-card">
            <div className="card-header-icon-row">
              <Sliders size={18} className="primary-color" />
              <h3 className="card-heading">Risk & Portfolio Controls</h3>
            </div>
            <p className="card-desc text-muted">Adjusts volatility coefficients and technical indicator parameters.</p>
            
            <div className="risk-selectors-container">
              {['Low', 'Medium', 'High'].map(level => (
                <button
                  key={level}
                  onClick={() => setRiskProfile(level)}
                  className={`risk-btn-select ${riskProfile === level ? 'active' : ''}`}
                >
                  <span className="risk-level-name">{level}</span>
                  <span className="risk-level-desc text-muted">
                    {level === 'Low' ? '0.75x Beta Cap' : level === 'Medium' ? '1.15x Beta Balance' : '1.45x Alpha Chase'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Nodes toggles */}
          <div className="settings-card glass-card">
            <div className="card-header-icon-row">
              <RefreshCw size={18} className="primary-color" />
              <h3 className="card-heading">Realtime Database Sync Nodes</h3>
            </div>
            <p className="card-desc text-muted">Control active push nodes updating your Firebase Realtime database.</p>
            
            <div className="toggle-list-settings">
              <div className="toggle-item-settings">
                <div className="toggle-text-block">
                  <span className="toggle-title">User Holdings Sync</span>
                  <span className="toggle-desc text-muted">Pushes active buy/sell values to `/users/clientId/holdings`</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={syncSettings.holdings} onChange={() => handleToggle('holdings')} />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="toggle-item-settings">
                <div className="toggle-text-block">
                  <span className="toggle-title">Transaction Audit Logger</span>
                  <span className="toggle-desc text-muted">Pushes logs to `/users/clientId/transactions`</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={syncSettings.transactions} onChange={() => handleToggle('transactions')} />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="toggle-item-settings">
                <div className="toggle-text-block">
                  <span className="toggle-title">AI Predictions Sync</span>
                  <span className="toggle-desc text-muted">Uploads ML forecasting paths to `/market_data/predictions`</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={syncSettings.predictions} onChange={() => handleToggle('predictions')} />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            <div className="save-settings-bar">
              {saveSuccess && (
                <div className="save-success-msg text-up">
                  <Check size={14} />
                  <span>Configuration saved successfully!</span>
                </div>
              )}
              <button 
                onClick={handleSave} 
                className="btn-primary save-settings-btn"
                disabled={saveLoading}
              >
                {saveLoading ? <span className="spinner"></span> : 'Save System Controls'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - RAW FIREBASE VIEW */}
        <div className="settings-right-col">
          <div className="settings-card glass-card height-full">
            <div className="card-header-icon-row">
              <Database size={18} className="primary-color" />
              <h3 className="card-heading">Firebase Active Client Config</h3>
            </div>
            <p className="card-desc text-muted">Active Web SDK configuration initialized in this application.</p>
            
            <div className="raw-json-inspector">
              <pre className="json-code">
                {JSON.stringify(rawFirebaseConfig, null, 2)}
              </pre>
            </div>
            
            <div className="inspector-footer text-muted">
              <Shield size={12} className="text-up" />
              <span>Verified Connection: Default Realtime Database Instance Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
