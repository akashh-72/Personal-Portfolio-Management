import React from 'react';
import { LogOut, ShieldCheck, Activity, Sun, Moon, Menu } from 'lucide-react';
import './Navbar.css';

export default function Navbar({ clientId, onLogout, theme, toggleTheme, isSidebarCollapsed, toggleSidebar }) {
  return (
    <header className="navbar-header">
      <div className="navbar-left">
        <button 
          onClick={toggleSidebar} 
          className="btn-sidebar-toggle" 
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu size={18} />
        </button>
        <div className="brand-logo">
          <div className="logo-glow"></div>
          <span className="logo-text">QUANTUM</span>
          <span className="logo-accent">PORTFOLIO</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="connection-status">
          <Activity size={14} className="text-up pulse-animation" />
          <span className="status-label">Angel One Live API:</span>
          <span className="status-value text-up">Connected</span>
        </div>

        {/* Apple-style Theme Switcher Toggle */}
        <button 
          onClick={toggleTheme} 
          className={`apple-theme-switch ${theme}`} 
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <div className="switch-knob">
            {theme === 'dark' ? <Moon size={9} style={{ color: 'var(--text-primary)' }} /> : <Sun size={9} style={{ color: '#f59e0b' }} />}
          </div>
          <div className="switch-icons">
            <Sun size={10} className="switch-icon-sun" />
            <Moon size={10} className="switch-icon-moon" />
          </div>
        </button>

        <div className="user-profile-badge">
          <ShieldCheck size={16} className="profile-icon" />
          <span className="profile-id">{clientId}</span>
        </div>

        <button onClick={onLogout} className="logout-btn" title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
