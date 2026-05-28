import React from 'react';
import { LayoutDashboard, Wallet, LineChart, Cpu, Settings as SettingsIcon, Coins, User } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ activePage, setActivePage, isCollapsed, clientId }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'holdings', label: 'Holdings', icon: Wallet },
    { id: 'tradingview', label: 'TradingView', icon: LineChart },
    { id: 'papertrading', label: 'Paper Trading', icon: Coins },
    { id: 'prediction', label: 'AI Predictor', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <li key={item.id} className="menu-item-container" data-tooltip={item.label}>
                <button
                  onClick={() => setActivePage(item.id)}
                  className={`menu-item-btn ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={20} className="menu-icon" />
                  <span className="menu-label">{item.label}</span>
                  {isActive && <div className="active-glow-indicator"></div>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button 
          onClick={() => setActivePage('profile')} 
          className={`sidebar-profile-card ${activePage === 'profile' ? 'active' : ''}`}
          title={isCollapsed ? "Client Profile" : ""}
        >
          <div className="profile-avatar-wrapper">
            <User size={18} className="profile-avatar-icon" />
            <span className="profile-avatar-glow"></span>
          </div>
          {!isCollapsed && (
            <div className="profile-meta-info">
              <span className="profile-meta-name">{clientId === 'ANGEL-DEMO-99' ? 'Akash Patil' : 'Client Account'}</span>
              <span className="profile-meta-role">{clientId || 'Session Active'}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
