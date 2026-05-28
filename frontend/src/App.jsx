import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Holdings from './pages/Holdings';
import TradingView from './pages/TradingView';
import Prediction from './pages/Prediction';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import About from './pages/About';
import Contact from './pages/Contact';
import PaperTrading from './pages/PaperTrading';
import Profile from './pages/Profile';
import './App.css';
import { db, ref } from './firebase';
import { onValue } from 'firebase/database';
import { Sun, Moon } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [clientId, setClientId] = useState(localStorage.getItem('clientId') || '');
  const [activePage, setActivePage] = useState(localStorage.getItem('activePage') || 'dashboard');
  
  // Collapsible sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('isSidebarCollapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [selectedStockSymbol, setSelectedStockSymbol] = useState('RELIANCE');
  const [marketTrends, setMarketTrends] = useState({});
  const [stockQuotes, setStockQuotes] = useState({});
  const [wishlist, setWishlist] = useState([]);
  
  // Custom states for premium layout overhaul
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [publicPage, setPublicPage] = useState('landing');
  
  // Real-time dynamic stock prices synced from backend
  const [stockPrices, setStockPrices] = useState({
    RELIANCE: 2850.00,
    TCS: 3850.00,
    INFY: 1420.00,
    HDFCBANK: 1580.00,
    ICICIBANK: 1120.00,
    TATAMOTORS: 950.00,
    SBIN: 780.00
  });

  // Apply theme dynamically to root document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleLoginSuccess = (id) => {
    setClientId(id);
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('clientId', id);
    localStorage.setItem('activePage', 'dashboard');
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setClientId('');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('clientId');
    localStorage.removeItem('activePage');
    setPublicPage('landing'); // Redirect to landing page on logout
  };

  useEffect(() => {
    if (isLoggedIn && activePage) {
      localStorage.setItem('activePage', activePage);
    }
  }, [activePage, isLoggedIn]);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      const nextVal = !isSidebarCollapsed;
      setIsSidebarCollapsed(nextVal);
      localStorage.setItem('isSidebarCollapsed', String(nextVal));
    }
  };

  // Sync wishlist from Firebase
  useEffect(() => {
    if (!isLoggedIn) return;
    const wishlistRef = ref(db, `users/${clientId}/wishlist`);
    const unsubscribe = onValue(wishlistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWishlist(Object.keys(data));
      } else {
        setWishlist([]);
      }
    });
    return () => unsubscribe();
  }, [clientId, isLoggedIn]);

  // central periodic polling of actual real-time stock prices (merged with wishlist)
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchLiveQuotes = async () => {
      try {
        const response = await fetch('/api/stocks');
        if (response.ok) {
          let data = await response.json();
          
          // Fetch quotes for wishlist symbols in parallel
          const wishQuotes = await Promise.all(
            wishlist.map(async (sym) => {
              if (data.some(s => s.symbol === sym)) return null;
              try {
                const res = await fetch(`/api/stocks/search?symbol=${sym}`);
                if (res.ok) return await res.json();
              } catch (e) {
                console.error("Wishlist search error for", sym, e);
              }
              return null;
            })
          );
          
          const activeWishQuotes = wishQuotes.filter(q => q !== null);
          data = [...data, ...activeWishQuotes];

          const pricesMap = {};
          const quotesMap = {};
          data.forEach(stock => {
            pricesMap[stock.symbol] = stock.currentPrice;
            quotesMap[stock.symbol] = stock;
          });
          setStockPrices(pricesMap);
          setStockQuotes(quotesMap);
        }
      } catch (err) {
        console.error("Error polling real-time quotes:", err);
      }
    };

    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn, wishlist]);

  // central periodic polling of actual real-time index trends
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchMarketTrends = async () => {
      try {
        const response = await fetch('/api/market-trends');
        if (response.ok) {
          const data = await response.json();
          setMarketTrends(data);
        }
      } catch (err) {
        console.error("Error polling real-time market trends:", err);
      }
    };

    fetchMarketTrends();
    const interval = setInterval(fetchMarketTrends, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Instant premium demo quick-login pipeline for public landers
  const handleDemoLogin = async () => {
    const demoId = 'ANGEL-DEMO-99';
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: demoId,
          password: 'Password123',
          totpKey: 'DUMMYTOTPKEY',
          apiKey: 'DUMMYAPIKEY123',
          isDemo: true
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        handleLoginSuccess(data.clientId);
      }
    } catch (err) {
      console.error("Demo login pipeline failed:", err);
    }
  };

  // 1. PUBLIC ROUTING SEGMENT (LOGGED OUT VIEW)
  if (!isLoggedIn) {
    return (
      <div className="public-layout">
        {/* Floating Navbar */}
        <header className="public-navbar">
          <div className="public-navbar-left">
            <div className="brand-logo" onClick={() => setPublicPage('landing')} style={{ cursor: 'pointer' }}>
              <div className="logo-glow"></div>
              <span className="logo-text">QUANTUM</span>
              <span className="logo-accent">PORTFOLIO</span>
            </div>
          </div>
          
          <div className="public-navbar-right">
            <nav className="public-nav-links">
              <button 
                onClick={() => setPublicPage('landing')} 
                className={`public-nav-link ${publicPage === 'landing' ? 'active' : ''}`}
              >
                Home
              </button>
              <button 
                onClick={() => setPublicPage('about')} 
                className={`public-nav-link ${publicPage === 'about' ? 'active' : ''}`}
              >
                About Us
              </button>
              <button 
                onClick={() => setPublicPage('contact')} 
                className={`public-nav-link ${publicPage === 'contact' ? 'active' : ''}`}
              >
                Contact Us
              </button>
            </nav>
            
            <div className="public-nav-actions">
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
              <button onClick={() => setPublicPage('login')} className="public-btn-signin">
                Sign In
              </button>
              <button onClick={() => setPublicPage('login')} className="btn-primary public-btn-getstarted">
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Public Page Wrapper */}
        <main className="public-main-content">
          {publicPage === 'landing' && <Landing onGetStarted={() => setPublicPage('login')} onViewDemo={handleDemoLogin} />}
          {publicPage === 'about' && <About />}
          {publicPage === 'contact' && <Contact />}
          {publicPage === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
        </main>

        {/* Premium Sitemap Footer */}
        <footer className="public-footer">
          <div className="footer-grid">
            <div className="footer-column">
              <div className="footer-brand">
                <span className="logo-text">QUANTUM</span>
                <span className="logo-accent">PORTFOLIO</span>
              </div>
              <p className="footer-desc text-muted">
                Professional algorithmic trading workspace and statistical position manager linking active broker APIs with live scrapers securely.
              </p>
            </div>
            <div className="footer-column">
              <span className="footer-title">Platform</span>
              <div className="footer-links">
                <button onClick={() => setPublicPage('landing')} className="footer-link">Home Terminal</button>
                <button onClick={() => setPublicPage('about')} className="footer-link">System Pipelines</button>
                <button onClick={() => setPublicPage('contact')} className="footer-link">Technical FAQs</button>
              </div>
            </div>
            <div className="footer-column">
              <span className="footer-title">Portal Gateway</span>
              <div className="footer-links">
                <button onClick={() => setPublicPage('login')} className="footer-link">Client Sign In</button>
                <button onClick={handleDemoLogin} className="footer-link">One-Click Demo</button>
              </div>
            </div>
            <div className="footer-column">
              <span className="footer-title">Operations Link</span>
              <div className="footer-links">
                <span className="footer-link text-muted">BKC HUB, Mumbai, IN</span>
                <span className="footer-link text-muted">devops@quantumportfolio.io</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">© 2026 Quantum Portfolio. Engineered with institutional precision. All rights reserved.</span>
            <div className="footer-badge">
              <span className="footer-badge-dot"></span>
              <span className="text-up">Live API online</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 2. PRIVATE ROUTING SEGMENT (LOGGED IN VIEW)
  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
      <Navbar 
        clientId={clientId} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <Sidebar 
        activePage={activePage} 
        setActivePage={(pageId) => {
          setActivePage(pageId);
          setIsMobileSidebarOpen(false);
        }} 
        isCollapsed={isSidebarCollapsed}
        clientId={clientId}
      />
      
      <main className="main-content">
        {activePage === 'dashboard' && (
          <Dashboard 
            clientId={clientId} 
            setActivePage={setActivePage} 
            setSelectedStockSymbol={setSelectedStockSymbol} 
            stockPrices={stockPrices}
            marketTrends={marketTrends}
            stockQuotes={stockQuotes}
          />
        )}
        
        {activePage === 'holdings' && (
          <Holdings 
            clientId={clientId} 
            setActivePage={setActivePage} 
            setSelectedStockSymbol={setSelectedStockSymbol} 
            stockPrices={stockPrices}
            stockQuotes={stockQuotes}
          />
        )}
        
        {activePage === 'tradingview' && (
          <TradingView 
            clientId={clientId} 
            initialSymbol={selectedStockSymbol} 
            stockPrices={stockPrices}
            stockQuotes={stockQuotes}
          />
        )}
        
        {activePage === 'papertrading' && (
          <PaperTrading 
            clientId={clientId} 
            stockPrices={stockPrices}
            stockQuotes={stockQuotes}
          />
        )}
        
        {activePage === 'prediction' && (
          <Prediction 
            initialSymbol={selectedStockSymbol} 
          />
        )}
        
        {activePage === 'settings' && (
          <Settings 
            clientId={clientId} 
          />
        )}
        
        {activePage === 'profile' && (
          <Profile 
            clientId={clientId} 
          />
        )}
      </main>
    </div>
  );
}
