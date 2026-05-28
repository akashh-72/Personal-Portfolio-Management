import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, FileText, Cpu, ShieldCheck, Activity, Key, Globe, CheckCircle2, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import './Profile.css';

export default function Profile({ clientId }) {
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [ping, setPing] = useState(24);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProfile = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/profile?clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setError('');
      } else {
        setError('Failed to fetch account profile data.');
      }
    } catch (err) {
      setError('Unable to establish communication with the backend Quant Engine.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Simulate real-time websocket heartbeat ping variations
    const pingInterval = setInterval(() => {
      setPing(prev => {
        const delta = Math.floor(Math.random() * 7) - 3; // -3ms to +3ms
        const next = prev + delta;
        return next > 8 && next < 45 ? next : prev;
      });
    }, 3000);

    return () => clearInterval(pingInterval);
  }, [clientId]);

  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (isLoading) {
    return (
      <div className="profile-skeleton-loading glass-card">
        <div className="skeleton skeleton-avatar"></div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-grid"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error-container glass-card">
        <AlertCircle className="text-down" size={36} />
        <h3>System Communication Error</h3>
        <p>{error}</p>
        <button onClick={fetchProfile} className="btn-primary" style={{ marginTop: '16px' }}>
          <RefreshCw size={14} style={{ marginRight: '8px' }} /> Retry Connection
        </button>
      </div>
    );
  }

  const initials = profileData?.name
    ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'AP';

  return (
    <div className="profile-page-container">
      {/* 1. Profile Hero Section */}
      <div className="profile-hero-card glass-card">
        <div className="profile-avatar-row">
          <div className="large-avatar-glow">
            <span className="avatar-initials">{initials}</span>
            <div className="avatar-active-ring glowing-indicator"></div>
          </div>
          
          <div className="profile-hero-meta">
            <div className="profile-name-badge-row">
              <h2 className="profile-user-name">{profileData?.name}</h2>
              <span className={`connection-badge ${profileData?.isLive ? 'live-badge' : 'demo-badge'}`}>
                <span className="badge-dot"></span>
                {profileData?.isLive ? 'Institutional Tier' : 'Demo Simulator'}
              </span>
            </div>
            
            <p className="profile-user-client-id">Client Account ID: <strong className="text-primary">{profileData?.clientId}</strong></p>
            
            <div className="profile-quick-stats">
              <div className="stat-pill">
                <ShieldCheck size={13} className="text-up" />
                <span>Broker: {profileData?.broker}</span>
              </div>
              <div className="stat-pill">
                <Activity size={13} className="text-up" />
                <span>Status: {profileData?.status}</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchProfile} 
          className={`btn-profile-refresh ${isRefreshing ? 'spinning' : ''}`}
          title="Refresh Profile Parameters"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 2. Main Content Grid */}
      <div className="profile-details-grid">
        {/* Left Card: Account Metadata */}
        <div className="profile-meta-card glass-card">
          <div className="card-header-meta">
            <div className="meta-icon glowing-indicator"><User size={18} /></div>
            <h3 className="panel-heading">Account Specifications</h3>
          </div>
          
          <div className="details-list">
            <div className="detail-item">
              <div className="detail-label-row">
                <User size={14} className="detail-icon" />
                <span>Full Legal Name</span>
              </div>
              <span className="detail-value">{profileData?.name}</span>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Mail size={14} className="detail-icon" />
                <span>Registered Email</span>
              </div>
              <span className="detail-value">{profileData?.email}</span>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Phone size={14} className="detail-icon" />
                <span>Mobile Number</span>
              </div>
              <span className="detail-value">{profileData?.mobile}</span>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <FileText size={14} className="detail-icon" />
                <span>PAN Registration Card</span>
              </div>
              <span className="detail-value font-monospace">{profileData?.pan}</span>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Cpu size={14} className="detail-icon" />
                <span>Demat DP Coordinate ID</span>
              </div>
              <div className="detail-copy-row">
                <span className="detail-value font-monospace">{profileData?.dpId}</span>
                <button 
                  onClick={() => handleCopyText(profileData?.dpId, 'dpId')} 
                  className="btn-copy-mini"
                  title="Copy DP ID"
                >
                  {copiedField === 'dpId' ? <CheckCircle2 size={12} className="text-up" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Institutional Integrations */}
        <div className="profile-meta-card glass-card">
          <div className="card-header-meta">
            <div className="meta-icon glowing-indicator"><Globe size={18} /></div>
            <h3 className="panel-heading">Broker Gateway Configuration</h3>
          </div>

          <div className="details-list">
            <div className="detail-item">
              <div className="detail-label-row">
                <ShieldCheck size={14} className="detail-icon" />
                <span>Account Type Tier</span>
              </div>
              <span className="detail-value">{profileData?.accountType}</span>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Key size={14} className="detail-icon" />
                <span>Programmatic API Key</span>
              </div>
              <div className="detail-copy-row">
                <span className="detail-value font-monospace">
                  {profileData?.isLive ? '••••••••••••••••••••' : 'quantum-simulated-key-99'}
                </span>
                <button 
                  onClick={() => handleCopyText(profileData?.isLive ? 'ANGEL-ONE-LIVE-KEY-SECRET' : 'quantum-simulated-key-99', 'apiKey')} 
                  className="btn-copy-mini"
                  title="Copy API Token Key"
                >
                  {copiedField === 'apiKey' ? <CheckCircle2 size={12} className="text-up" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Activity size={14} className="detail-icon" />
                <span>API Heartbeat Connection Ping</span>
              </div>
              <div className="detail-ping-indicator">
                <div className="ping-wave-glow glowing-indicator"></div>
                <span className="detail-value text-up font-monospace">{ping} ms (Excellent)</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Globe size={14} className="detail-icon" />
                <span>Exchanges Segments Enabled</span>
              </div>
              <div className="exchanges-badge-grid">
                {profileData?.exchanges.map(ex => (
                  <span key={ex} className="exchange-segment-badge">{ex}</span>
                ))}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label-row">
                <Key size={14} className="detail-icon" />
                <span>Last Gateway Login Coordinates</span>
              </div>
              <span className="detail-value font-monospace">{profileData?.lastLogin}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
