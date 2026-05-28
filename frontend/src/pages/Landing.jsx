import React, { useEffect, useState } from 'react';
import { TrendingUp, Activity, ShieldCheck, Zap, ChevronRight, BarChart3, LineChart, Code2, Cpu, ArrowUpRight, ChevronDown, ChevronUp, CheckCircle2, MessageSquare } from 'lucide-react';
import './Landing.css';

export default function Landing({ onGetStarted, onViewDemo }) {
  const [marketTrends, setMarketTrends] = useState({
    NIFTY50: { value: 23907.15, change: 341.7, pct: 1.45, isUp: true },
    SENSEX: { value: 75867.8, change: 1084.36, pct: 1.45, isUp: true },
    BANKNIFTY: { value: 54853.85, change: 784.01, pct: 1.45, isUp: true },
    NIFTY_IT: { value: 28906.70, change: 413.16, pct: 1.45, isUp: true }
  });

  // Dynamic simulation inside the interactive portfolio mockup card
  const [mockPrice, setMockPrice] = useState(2852.40);
  const [mockPnl, setMockPnl] = useState(18432.00);

  // FAQ Accordion index
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.48) * 1.5;
      setMockPrice(prev => Number((prev + delta).toFixed(2)));
      setMockPnl(prev => Number((prev + delta * 5).toFixed(2)));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Poll live index details
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const response = await fetch('/api/market-trends');
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setMarketTrends(data);
          }
        }
      } catch (e) {
        console.error("Public indices fetch error:", e);
      }
    };
    fetchTrends();
    const interval = setInterval(fetchTrends, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (idx) => {
    setFaqOpenIndex(faqOpenIndex === idx ? null : idx);
  };

  const testimonials = [
    {
      name: 'Akash Patil',
      role: 'Quantitative Software Engineer',
      text: 'Bypassing Yahoo Finance blocks with Python multithreading scraper latency under 2 seconds is pure engineering. The Recharts overlay bounds look incredibly clean.'
    },
    {
      name: 'Neha Sharma',
      role: 'Algorithmic Trader',
      text: 'Linking SmartConnect directly to view local cash balances and simulate limit order positions has completely cleaned up my trade sandboxing workflow.'
    },
    {
      name: 'Vikram Malhotra',
      role: 'Portfolio Manager',
      text: 'A secure, non-custodial sandbox that caches secret keys inside my own Firebase node is the best design choice. It is clean, responsive, and completely transparent.'
    }
  ];

  const faqs = [
    {
      q: 'Is my Angel One API login credential safe?',
      a: 'Absolutely. QuantPortfolio operates under a strictly non-custodial and serverless architecture. Your Client ID, passwords, and TOTP secret keys are cached locally in your own dedicated Firebase Realtime Database node. Credentials are never sent to or stored on third-party analytical servers.'
    },
    {
      q: 'How does the Google Finance fallback scraper bypass limits?',
      a: 'We leverage a multithreaded concurrent ThreadPoolExecutor in Python that queries multiple public nodes simultaneously, parsing prices and day trends in under 2 seconds. This bypasses the typical "429 Too Many Requests" blockages faced by standard scrapers.'
    },
    {
      q: 'What model architecture drives the predictive chart wicks?',
      a: 'We pull official daily historical candles directly via Angel One API or scrape Google. Our statistical backend fits moving average boundaries (SMA 20, EMA 50) and compiles regression boundaries representing forecasted price wicks over the upcoming 7 trading days.'
    }
  ];

  return (
    <div className="landing-page-container">
      {/* 1. HERO SECTION WITH MAJESTIC TYPOGRAPHY & FLOATING MOCKUP */}
      <section className="landing-hero-section">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        
        <div className="hero-text-content">
          <div className="hero-badge-container">
            <div className="hero-badge glowing-indicator">
              <Activity size={12} className="badge-icon" />
              <span>Quantitative Portfolio Tracker</span>
            </div>
          </div>
          
          <h1 className="hero-title">
            Quant Portfolio <br />
            <span className="gradient-text">Tracker & Predictor</span>
          </h1>
          
          <p className="hero-subtitle">
            Securely link your Angel One broker credentials to synchronize holdings, scrape real-time index trends, and run regression-based prediction models on a highly refined dashboard.
          </p>
          
          <div className="hero-actions">
            <button onClick={onGetStarted} className="btn-primary hero-btn-main">
              <span>Initialize Workspace</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={onViewDemo} className="btn-secondary hero-btn-demo">
              <Activity size={15} className="text-up" />
              <span>Explore Public Demo</span>
            </button>
          </div>
        </div>

        {/* 2. INTERACTIVE TERMINAL MOCKUP CARD */}
        <div className="hero-mockup-wrapper">
          <div className="terminal-mockup glass-card">
            {/* Terminal Header */}
            <div className="mockup-header-bar">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="mockup-header-tab">
                <Activity size={12} className="text-primary-color" />
                <span>portfolio-sandbox-v1.0.0</span>
              </div>
              <div className="mockup-header-status">
                <span className="live-dot"></span>
                <span className="status-lbl">SmartAPI Linked</span>
              </div>
            </div>

            {/* Terminal Content Layout */}
            <div className="mockup-content-layout">
              {/* Balance Bar */}
              <div className="mockup-balance-section">
                <div className="mock-bal-unit">
                  <span className="mock-lbl text-muted">Total Net Portfolio</span>
                  <span className="mock-val">₹12,85,420.00</span>
                </div>
                <div className="mock-bal-unit">
                  <span className="mock-lbl text-muted">Today's Returns</span>
                  <span className="mock-val-pnl text-up">+₹{mockPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="mock-bal-unit">
                  <span className="mock-lbl text-muted">LTP: RELIANCE</span>
                  <span className="mock-val-price primary-color">₹{mockPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Chart simulation / indicators */}
              <div className="mockup-grid">
                {/* Simulated Chart */}
                <div className="mock-chart-card glass-card">
                  <div className="card-header-mini">
                    <span className="mini-card-title">Regression Forecast Bounds</span>
                    <span className="mini-card-badge">Signal: Neutral</span>
                  </div>
                  
                  <div className="mock-bars-canvas">
                    {/* Simulated Candlesticks */}
                    <div className="mock-bar-candle green" style={{ height: '70px' }}>
                      <span className="wick" style={{ height: '110px' }}></span>
                    </div>
                    <div className="mock-bar-candle red" style={{ height: '80px' }}>
                      <span className="wick" style={{ height: '130px' }}></span>
                    </div>
                    <div className="mock-bar-candle green" style={{ height: '95px' }}>
                      <span className="wick" style={{ height: '140px' }}></span>
                    </div>
                    <div className="mock-bar-candle green" style={{ height: '120px' }}>
                      <span className="wick" style={{ height: '160px' }}></span>
                    </div>
                    <div className="mock-bar-candle red" style={{ height: '105px' }}>
                      <span className="wick" style={{ height: '150px' }}></span>
                    </div>
                    <div className="mock-bar-candle green animate-tick" style={{ height: `${mockPrice % 120 + 40}px` }}>
                      <span className="wick" style={{ height: `${mockPrice % 120 + 70}px` }}></span>
                    </div>
                  </div>

                  <div className="chart-footer-metrics">
                    <span className="metric text-muted">Interval: 1D</span>
                    <span className="metric text-muted">Indicators: SMA/EMA</span>
                    <span className="metric text-up">Confidence: 91%</span>
                  </div>
                </div>

                {/* Simulated order book desk */}
                <div className="mock-book-card glass-card">
                  <span className="mini-card-title border-bot">Limits Order Panel</span>
                  <div className="mock-book-list">
                    <div className="mock-book-row">
                      <span className="lbl text-muted">Shares Qty</span>
                      <span className="val">100</span>
                    </div>
                    <div className="mock-book-row">
                      <span className="lbl text-muted">Limit Price</span>
                      <span className="val">₹{mockPrice.toFixed(2)}</span>
                    </div>
                    <div className="mock-book-row border-top-dash">
                      <span className="lbl text-muted">Position Size</span>
                      <span className="val-bold">₹{(100 * mockPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <button type="button" className="mock-submit-btn">Execute Limit Order</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE MARKET INDICATOR BAR */}
      <section className="landing-indices-bar-section glass-card">
        <div className="indices-bar-header">
          <div className="live-dot-unit">
            <span className="live-pulse-dot"></span>
            <span className="live-lbl">NSE Indices Trends</span>
          </div>
          <div className="header-divider"></div>
          <span className="indices-desc text-muted">Synced every 4 seconds from live market quotes</span>
        </div>
        
        <div className="indices-scroll-row">
          {Object.entries(marketTrends).map(([name, data]) => (
            <div key={name} className="index-pill-card glass-card">
              <span className="pill-name">{name}</span>
              <span className="pill-price">₹{Number(data.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`pill-pct ${data.isUp ? 'text-up' : 'text-down'}`}>
                {data.isUp ? '+' : ''}{data.pct}% {data.isUp ? '▲' : '▼'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLATFORM FEATURES SECTION */}
      <section className="landing-features-section">
        <div className="section-header">
          <h2 className="section-title">Framework Capabilities</h2>
          <p className="section-subtitle text-muted">A structured visual sandbox built cleanly with custom CSS layouts and responsive states.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper p-primary">
              <LineChart size={22} />
            </div>
            <h3 className="feature-title">Real-Time Quotes Scraper</h3>
            <p className="feature-desc text-muted">
              Retrieve live stock quotes via high-performance Google Finance scraping. Fallback logic automatically resolves prices in under 2 seconds.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper p-accent">
              <Cpu size={22} />
            </div>
            <h3 className="feature-title">Trend Prediction Models</h3>
            <p className="feature-desc text-muted">
              Generate 7-day forecast envelopes. Models fit historical daily candlesticks with SMA and EMA boundaries to project potential price ranges.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper p-gain">
              <ShieldCheck size={22} />
            </div>
            <h3 className="feature-title">Secure Broker Integration</h3>
            <p className="feature-desc text-muted">
              Link your Angel One Client ID to cache credentials safely in your Firebase database node, view holdings, and place mock limit orders.
            </p>
          </div>
        </div>
      </section>

      {/* 5. TECHNOLOGY STACK BLOCK */}
      <section className="landing-tech-section glass-card">
        <div className="tech-meta">
          <Activity size={24} className="tech-meta-icon" />
          <h4 className="tech-meta-title">Integrated Tech Architecture</h4>
          <p className="tech-meta-desc text-muted">Built using a responsive React client-side client layer proxied to a FastAPI statistical prediction backend.</p>
        </div>
        
        <div className="tech-grid">
          <div className="tech-unit glass-card">
            <span className="tech-unit-lbl text-muted">FRAMEWORK</span>
            <span className="tech-unit-val">React + Vite</span>
          </div>
          <div className="tech-unit glass-card">
            <span className="tech-unit-lbl text-muted">PREDICTOR BACKEND</span>
            <span className="tech-unit-val">FastAPI (Python)</span>
          </div>
          <div className="tech-unit glass-card">
            <span className="tech-unit-lbl text-muted">CHARTS ENGINE</span>
            <span className="tech-unit-val">Recharts Core</span>
          </div>
          <div className="tech-unit glass-card">
            <span className="tech-unit-lbl text-muted">STORAGE DATA NODE</span>
            <span className="tech-unit-val">Firebase RTDB</span>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS SECTION */}
      <section className="landing-features-section">
        <div className="section-header">
          <h2 className="section-title">Endorsed by Technical Traders</h2>
          <p className="section-subtitle text-muted">Here is what developers and portfolio quants say about the sandboxed workspace.</p>
        </div>

        <div className="features-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="feature-card glass-card testimonial-card">
              <div className="testimonial-header">
                <MessageSquare size={16} className="text-primary-color" />
                <div className="testimonial-profile">
                  <span className="t-name">{t.name}</span>
                  <span className="t-role text-muted">{t.role}</span>
                </div>
              </div>
              <p className="t-text text-muted">"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. DEDICATED FAQ ACCORDION SECTION */}
      <section className="landing-features-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle text-muted">Core answers regarding account synchronization, database safety, and data refreshes.</p>
        </div>

        <div className="landing-faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div key={idx} className={`faq-item glass-card ${isOpen ? 'active' : ''}`} onClick={() => toggleFaq(idx)}>
                <div className="faq-question-bar">
                  <span className="faq-question">{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} className="faq-arrow" /> : <ChevronDown size={16} className="faq-arrow" />}
                </div>
                <div className={`faq-answer-panel ${isOpen ? 'open' : ''}`}>
                  <p className="faq-answer text-muted">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FINAL BOTTOM CALL-TO-ACTION CARD BLOCK */}
      <section className="landing-bottom-cta glass-card text-center">
        <div className="cta-glow"></div>
        <span className="cta-badge">SECURED • SANDBOXED • COMPREHENSIVE</span>
        <h2 className="cta-title">Ready to Initialize Your Trading Sandbox?</h2>
        <p className="cta-desc text-muted">
          Connect your Client ID securely, cache values inside your own Firebase node, and run regression bounds forecasting instantly.
        </p>
        <button onClick={onGetStarted} className="btn-primary cta-btn">
          <span>Get Started Now</span>
          <ChevronRight size={15} />
        </button>
      </section>
    </div>
  );
}
