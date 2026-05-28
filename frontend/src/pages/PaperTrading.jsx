import React, { useState, useEffect } from 'react';
import { db, ref } from '../firebase';
import { onValue, set, push, remove } from 'firebase/database';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Coins, Search, ArrowUpRight, ArrowDownRight, RefreshCw, 
  ShoppingCart, DollarSign, Wallet, Percent, History, 
  TrendingUp, Star, ShieldAlert, Sparkles, CheckCircle2,
  LineChart, Play, ShieldCheck, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import './PaperTrading.css';

// Premium Custom Tooltip for the Candlestick Chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isGreen = data.isGreen;
    return (
      <div className="paper-chart-tooltip glass-card">
        <div className="tooltip-date">{data.date}</div>
        <div className="tooltip-grid">
          <div><span className="lbl">Open:</span> <span>₹{data.open.toFixed(2)}</span></div>
          <div><span className="lbl">High:</span> <span className="text-up">₹{data.high.toFixed(2)}</span></div>
          <div><span className="lbl">Low:</span> <span className="text-down">₹{data.low.toFixed(2)}</span></div>
          <div><span className="lbl">Close:</span> <span className={isGreen ? 'text-up bold' : 'text-down bold'}>₹{data.close.toFixed(2)}</span></div>
        </div>
        {(data.sma20 || data.ema50) && (
          <div className="tooltip-indicators">
            {data.sma20 && <div><span style={{ color: '#f59e0b' }}>SMA(20):</span> <span>₹{data.sma20.toFixed(2)}</span></div>}
            {data.ema50 && <div><span style={{ color: '#ec4899' }}>EMA(50):</span> <span>₹{data.ema50.toFixed(2)}</span></div>}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const AVAILABLE_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy & Conglomerate' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', sector: 'Information Technology' },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'Information Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Financial Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Financial Services' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', sector: 'Automotive' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services' }
];

export default function PaperTrading({ clientId, stockPrices, stockQuotes }) {
  // Navigation & View States
  const [activeStock, setActiveStock] = useState('RELIANCE');
  const [activeTab, setActiveTab] = useState('positions'); // positions, history, treasury
  
  // Collapsible panels states (Watchlist and Order desk)
  const [showWatchlist, setShowWatchlist] = useState(window.innerWidth > 950);
  const [showOrderDesk, setShowOrderDesk] = useState(window.innerWidth > 1300);
  
  // Database States
  const [balance, setBalance] = useState(5000);
  const [holdings, setHoldings] = useState({});
  const [transactions, setTransactions] = useState([]);
  
  // Chart & Indicators States
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [indicators, setIndicators] = useState({ showSma20: true, showEma50: true });
  
  // Search Watchlist States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [watchlist, setWatchlist] = useState([
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'SBIN'
  ]);
  
  // Trading Desk States
  const [tradeAction, setTradeAction] = useState('BUY'); // BUY or SELL
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState('MARKET'); // MARKET or LIMIT
  const [limitPrice, setLimitPrice] = useState(0);
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [tradeError, setTradeError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // 1. Firebase Listeners - Real-time synchronization
  useEffect(() => {
    if (!clientId) return;
    
    // Balance Listener (Deposit ₹5000 demo cash on new sessions)
    const balanceRef = ref(db, `users/${clientId}/paper/balance`);
    const unsubscribeBalance = onValue(balanceRef, (snapshot) => {
      const val = snapshot.val();
      if (val === null) {
        set(balanceRef, 5000.00);
        setBalance(5000.00);
      } else {
        setBalance(Number(val));
      }
    });

    // Holdings Listener
    const holdingsRef = ref(db, `users/${clientId}/paper/holdings`);
    const unsubscribeHoldings = onValue(holdingsRef, (snapshot) => {
      const data = snapshot.val();
      setHoldings(data || {});
    });

    // Transactions Listener
    const txRef = ref(db, `users/${clientId}/paper/transactions`);
    const unsubscribeTx = onValue(txRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTransactions(list);
      } else {
        setTransactions([]);
      }
    });

    return () => {
      unsubscribeBalance();
      unsubscribeHoldings();
      unsubscribeTx();
    };
  }, [clientId]);

  // 2. Fetch Historical Candlestick Chart Data from backend predictor API
  useEffect(() => {
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: activeStock, horizonDays: 7 })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Extract last 30 historical points to show in trading chart
          const hist = data.historicalData.slice(-30).map(pt => {
            const openVal = pt.open || pt.price * 0.995;
            const closeVal = pt.price;
            const highVal = pt.high || Math.max(openVal, closeVal) * 1.008;
            const lowVal = pt.low || Math.min(openVal, closeVal) * 0.992;
            const isGreen = closeVal >= openVal;
            
            return {
              date: pt.date,
              price: closeVal,
              open: openVal,
              close: closeVal,
              high: highVal,
              low: lowVal,
              sma20: pt.sma20,
              ema50: pt.ema50,
              isGreen: isGreen,
              wick: [lowVal, highVal],
              body: [Math.min(openVal, closeVal), Math.max(openVal, closeVal)]
            };
          });
          setChartData(hist);
        }
      } catch (err) {
        console.error("Error loading paper trading chart data:", err);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [activeStock]);

  // Real-time ticking chart effect: merges live scraped price from backend into the final candlestick
  const getLiveTickingChartData = () => {
    if (chartData.length === 0) return [];
    const ticks = [...chartData];
    const lastIdx = ticks.length - 1;
    const lastCandle = { ...ticks[lastIdx] };
    const liveLTP = stockPrices[activeStock] || lastCandle.close;
    
    // Smoothly overwrite close with ticking live NSE value
    lastCandle.close = liveLTP;
    lastCandle.price = liveLTP;
    lastCandle.high = Math.max(lastCandle.high, liveLTP);
    lastCandle.low = Math.min(lastCandle.low, liveLTP);
    lastCandle.isGreen = lastCandle.close >= lastCandle.open;
    lastCandle.wick = [lastCandle.low, lastCandle.high];
    lastCandle.body = [Math.min(lastCandle.open, lastCandle.close), Math.max(lastCandle.open, lastCandle.close)];
    
    ticks[lastIdx] = lastCandle;
    return ticks;
  };

  // 3. Search and Add to watch-list
  const handleWatchlistSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError('');

    try {
      const cleanSym = searchQuery.trim().toUpperCase();
      const response = await fetch(`/api/stocks/search?symbol=${cleanSym}`);
      if (response.ok) {
        const data = await response.json();
        // Add to watchlist if not present
        if (!watchlist.includes(data.symbol)) {
          setWatchlist(prev => [...prev, data.symbol]);
        }
        setActiveStock(data.symbol);
        setSearchQuery('');
      } else {
        setSearchError(`Stock "${cleanSym}" not found in NSE database.`);
      }
    } catch (err) {
      setSearchError('Error contacting real-time price feeds.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Quick Action: remove custom searches from watchlist
  const handleRemoveWatchlist = (sym, e) => {
    e.stopPropagation();
    if (['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'SBIN'].includes(sym)) return;
    setWatchlist(prev => prev.filter(s => s !== sym));
    if (activeStock === sym) {
      setActiveStock('RELIANCE');
    }
  };

  // 4. Submit Order Execution
  const currentStockPrice = stockPrices[activeStock] || 0;
  const activeQuote = stockQuotes[activeStock] || null;
  const executionPrice = orderType === 'LIMIT' ? Number(limitPrice) : currentStockPrice;
  const estimatedValue = quantity * executionPrice;

  const handleExecuteTrade = async (e) => {
    e.preventDefault();
    setTradeError('');
    setTradeSuccess('');
    
    if (quantity <= 0) {
      setTradeError('Quantity must be greater than zero.');
      return;
    }
    if (executionPrice <= 0) {
      setTradeError('Invalid execution price.');
      return;
    }

    setIsExecuting(true);

    try {
      const balanceRef = ref(db, `users/${clientId}/paper/balance`);
      const holdingsRef = ref(db, `users/${clientId}/paper/holdings/${activeStock}`);
      const txHistoryRef = ref(db, `users/${clientId}/paper/transactions`);

      const currentHolding = holdings[activeStock] || null;

      if (tradeAction === 'BUY') {
        if (estimatedValue > balance) {
          throw new Error(`Insufficient simulated funds. Estimated outlay ₹${estimatedValue.toFixed(2)} exceeds ₹${balance.toFixed(2)}.`);
        }

        const newBalance = balance - estimatedValue;
        let newQty = quantity;
        let newAvgPrice = executionPrice;

        if (currentHolding) {
          newQty = currentHolding.qty + quantity;
          newAvgPrice = ((currentHolding.qty * currentHolding.avgPrice) + estimatedValue) / newQty;
        }

        await set(balanceRef, Number(newBalance.toFixed(2)));
        await set(holdingsRef, {
          symbol: activeStock,
          name: activeQuote ? activeQuote.name : activeStock,
          qty: newQty,
          avgPrice: Number(newAvgPrice.toFixed(2)),
          sector: activeQuote ? activeQuote.sector : 'NSE Equity'
        });

        await push(txHistoryRef, {
          symbol: activeStock,
          qty: quantity,
          price: Number(executionPrice.toFixed(2)),
          action: 'BUY',
          orderType: orderType,
          timestamp: new Date().toISOString()
        });

        setTradeSuccess(`Successfully BOUGHT ${quantity} shares of ${activeStock}!`);
      } else {
        if (!currentHolding || currentHolding.qty < quantity) {
          const owned = currentHolding ? currentHolding.qty : 0;
          throw new Error(`Insufficient simulated inventory. You hold ${owned} shares but tried to sell ${quantity}.`);
        }

        const newBalance = balance + estimatedValue;
        const newQty = currentHolding.qty - quantity;

        if (newQty === 0) {
          await remove(holdingsRef);
        } else {
          await set(holdingsRef, {
            ...currentHolding,
            qty: newQty
          });
        }

        await set(balanceRef, Number(newBalance.toFixed(2)));
        await push(txHistoryRef, {
          symbol: activeStock,
          qty: quantity,
          price: Number(executionPrice.toFixed(2)),
          action: 'SELL',
          orderType: orderType,
          timestamp: new Date().toISOString()
        });

        setTradeSuccess(`Successfully SOLD ${quantity} shares of ${activeStock}!`);
      }
    } catch (err) {
      setTradeError(err.message || 'Trade routing failure.');
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        setTradeSuccess('');
        setTradeError('');
      }, 5000);
    }
  };

  // Exit/Liquidate Holdings shortcut button
  const handleLiquidateHolding = (symbol, qty, price) => {
    setActiveStock(symbol);
    setTradeAction('SELL');
    setQuantity(qty);
    setOrderType('MARKET');
    // Scroll desk to focus or execute directly
    const desk = document.getElementById('trade-terminal-action-form');
    if (desk) desk.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset demo account
  const resetPaperPortfolio = () => {
    if (window.confirm("Confirm reset of Paper Trading account back to ₹5,000.00? All holdings and transactions will be cleared.")) {
      set(ref(db, `users/${clientId}/paper/balance`), 5000.00);
      remove(ref(db, `users/${clientId}/paper/holdings`));
      remove(ref(db, `users/${clientId}/paper/transactions`));
      setTradeSuccess("Simulated Account successfully reset to ₹5,000.00!");
      setTimeout(() => setTradeSuccess(''), 4000);
    }
  };

  // Calculations for valuation
  let holdingsInvested = 0;
  let holdingsMarketVal = 0;
  Object.keys(holdings).forEach(sym => {
    const hold = holdings[sym];
    const liveRate = stockPrices[sym] || hold.avgPrice;
    holdingsInvested += hold.qty * hold.avgPrice;
    holdingsMarketVal += hold.qty * liveRate;
  });

  const totalPortfolioValue = balance + holdingsMarketVal;
  const netPnL = totalPortfolioValue - 5000.00;
  const netPnLPct = (netPnL / 5000.00) * 100;
  const isProfit = netPnL >= 0;

  const currentTickingData = getLiveTickingChartData();
  const currentLTP = currentStockPrice;
  const currentChange = activeQuote ? activeQuote.change : 0;
  const currentChangePct = activeQuote ? activeQuote.changePct : 0;

  return (
    <div className="paper-trading-tv-container">
      {/* 1. Header Navigation Indicators Bar */}
      <header className="terminal-header glass-card">
        <div className="terminal-logo-side">
          <div className="logo-pulse"></div>
          <span className="term-logo">QUANTUM</span>
          <span className="term-accent">PAPER-TRADER</span>
          
          <div className="stock-marquee font-mono">
            <span className="active-symbol">{activeStock}</span>
            <span className="active-ltp">₹{currentLTP.toFixed(2)}</span>
            <span className={`active-pct ${currentChangePct >= 0 ? 'text-up' : 'text-down'}`}>
              {currentChangePct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{currentChangePct >= 0 ? '+' : ''}{currentChangePct.toFixed(2)}%</span>
            </span>
          </div>
        </div>

        <div className="terminal-controls-side">
          <div className="indicator-pill font-mono">
            <span className="lbl text-muted">PORTFOLIO VALUATION:</span>
            <span className="val bold text-accent">₹{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`badge ${isProfit ? 'badge-up' : 'badge-down'}`}>
              {isProfit ? '+' : ''}{netPnLPct.toFixed(2)}%
            </span>
          </div>
          <button className="btn-tv-action reset" onClick={resetPaperPortfolio}>
            <RefreshCw size={12} className="spin-on-hover" />
            <span>Reset Balance</span>
          </button>
        </div>
      </header>

      {/* 2. Three-Column TradingView Layout Grid */}
      <div className={`terminal-grid ${showWatchlist ? 'watchlist-open' : 'watchlist-closed'} ${showOrderDesk ? 'orderdesk-open' : 'orderdesk-closed'}`}>
        
        {/* Column A: Watchlist & Search Sidebar (Left) */}
        {showWatchlist && (
          <aside className="watchlist-aside glass-card">
            <div className="aside-title">
            <Star size={14} className="title-icon text-accent" />
            <span>Watchlist Terminal</span>
          </div>

          <form onSubmit={handleWatchlistSearch} className="watchlist-search-form">
            <div className="search-input-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search NSE Stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchLoading}
                className="search-input"
              />
              <button type="submit" className="search-btn" disabled={searchLoading}>
                {searchLoading ? <span className="spinner-small"></span> : 'Add'}
              </button>
            </div>
            {searchError && <span className="search-err">{searchError}</span>}
          </form>

          <ul className="watchlist-items-list">
            {watchlist.map(sym => {
              const liveRate = stockPrices[sym] || 0;
              const quote = stockQuotes[sym];
              const pct = quote ? quote.changePct : 0;
              const isStockUp = pct >= 0;
              const isSelected = activeStock === sym;

              return (
                <li 
                  key={sym} 
                  className={`watchlist-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setActiveStock(sym);
                    setLimitPrice(liveRate);
                  }}
                >
                  <div className="item-left">
                    <span className="symbol-name bold font-mono">{sym}</span>
                    <span className="desc-name text-muted truncate">
                      {quote ? quote.name : AVAILABLE_STOCKS.find(s => s.symbol === sym)?.name || sym}
                    </span>
                  </div>
                  
                  <div className="item-right font-mono">
                    <span className="price bold">₹{liveRate.toFixed(2)}</span>
                    <span className={`change-pct ${isStockUp ? 'text-up' : 'text-down'}`}>
                      {isStockUp ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                    {!['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'TATAMOTORS', 'SBIN'].includes(sym) && (
                      <button 
                        className="btn-item-delete"
                        onClick={(e) => handleRemoveWatchlist(sym, e)}
                        title="Remove custom stock search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
        )}

        {/* Column B: Interactive Chart Workspace & Bottom Tabs (Center) */}
        <section className="chart-center-workspace">
          {/* Top Panel: Candlestick Chart Drawer */}
          <div className="chart-block glass-card">
            <div className="chart-header">
              <div className="chart-header-left">
                <span className="chart-symbol bold font-mono">{activeStock}</span>
                <span className="chart-interval-badge">D</span>
                <span className="chart-type-badge font-mono">CANDLESTICK</span>
                
                {/* Tech indicator toggles */}
                <div className="indicator-toggles">
                  <button 
                    className={`btn-indicator ${indicators.showSma20 ? 'active' : ''}`}
                    onClick={() => setIndicators(prev => ({ ...prev, showSma20: !prev.showSma20 }))}
                  >
                    {indicators.showSma20 ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>SMA(20)</span>
                  </button>
                  <button 
                    className={`btn-indicator ${indicators.showEma50 ? 'active' : ''}`}
                    onClick={() => setIndicators(prev => ({ ...prev, showEma50: !prev.showEma50 }))}
                  >
                    {indicators.showEma50 ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span style={{ color: '#ec4899', fontWeight: '600' }}>EMA(50)</span>
                  </button>
                  
                  {/* Collapsible panel buttons */}
                  <button 
                    className={`btn-indicator panel-toggle ${showWatchlist ? 'active' : ''}`}
                    onClick={() => setShowWatchlist(!showWatchlist)}
                    title={showWatchlist ? "Hide Watchlist Sidebar" : "Show Watchlist Sidebar"}
                  >
                    {showWatchlist ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Watchlist</span>
                  </button>
                  <button 
                    className={`btn-indicator panel-toggle ${showOrderDesk ? 'active' : ''}`}
                    onClick={() => setShowOrderDesk(!showOrderDesk)}
                    title={showOrderDesk ? "Hide Order Desk" : "Show Order Desk"}
                  >
                    {showOrderDesk ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>Order Desk</span>
                  </button>
                </div>
              </div>
              
              <div className="chart-header-right text-muted font-mono">
                {activeQuote?.sector || 'NSE Equity'}
              </div>
            </div>

            <div className="chart-canvas-wrapper">
              {chartLoading ? (
                <div className="chart-loader">
                  <span className="spinner-large"></span>
                  <span className="text-muted">Loading live Indian stock market historical charts...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="chart-loader">
                  <LineChart className="icon-tv-empty" size={36} />
                  <span className="text-muted">No historical data available for {activeStock}.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={currentTickingData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    
                    {/* Candlestick Wicks */}
                    <Bar dataKey="wick" fill="#8884d8" strokeWidth={0} barSize={2}>
                      {currentTickingData.map((entry, index) => (
                        <Cell key={`wick-${index}`} fill={entry.isGreen ? 'var(--color-gain)' : 'var(--color-loss)'} />
                      ))}
                    </Bar>
                    
                    {/* Candlestick Bodies */}
                    <Bar dataKey="body" fill="#8884d8" strokeWidth={0} barSize={10}>
                      {currentTickingData.map((entry, index) => (
                        <Cell key={`body-${index}`} fill={entry.isGreen ? 'var(--color-gain)' : 'var(--color-loss)'} />
                      ))}
                    </Bar>
                    
                    {/* Indicators Overlays */}
                    {indicators.showSma20 && (
                      <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} activeDot={false} />
                    )}
                    {indicators.showEma50 && (
                      <Line type="monotone" dataKey="ema50" stroke="#ec4899" strokeWidth={1.5} dot={false} activeDot={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom Panel: Workspace Tabs Drawer */}
          <div className="bottom-tabs-block glass-card">
            <nav className="tab-triggers-bar">
              <button 
                onClick={() => setActiveTab('positions')} 
                className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
              >
                <Wallet size={14} className="icon-tab" />
                <span>Simulated Inventory ({Object.keys(holdings).length})</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('history')} 
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              >
                <History size={14} className="icon-tab" />
                <span>Trade Logs ({transactions.length})</span>
              </button>

              <button 
                onClick={() => setActiveTab('treasury')} 
                className={`tab-btn ${activeTab === 'treasury' ? 'active' : ''}`}
              >
                <Coins size={14} className="icon-tab" />
                <span>Simulated Treasury</span>
              </button>
            </nav>

            <div className="tab-content-panel">
              {/* Tab 1: Positions */}
              {activeTab === 'positions' && (
                Object.keys(holdings).length === 0 ? (
                  <div className="tab-empty">
                    <Wallet size={28} className="icon-tab-empty" />
                    <span>No active simulated holdings. Submit orders on the right execution desk!</span>
                  </div>
                ) : (
                  <div className="tab-table-wrapper">
                    <table className="tab-data-table">
                      <thead>
                        <tr>
                          <th>Stock</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Avg Cost</th>
                          <th className="text-right">LTP Rate</th>
                          <th className="text-right">Invested</th>
                          <th className="text-right">Live Return</th>
                          <th className="text-center">Quick Liquidation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(holdings).map(symbol => {
                          const hold = holdings[symbol];
                          const livePrice = stockPrices[symbol] || hold.avgPrice;
                          const invested = hold.qty * hold.avgPrice;
                          const currentVal = hold.qty * livePrice;
                          const pnl = currentVal - invested;
                          const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                          const isUp = pnl >= 0;

                          return (
                            <tr key={symbol}>
                              <td className="bold font-mono">{symbol}</td>
                              <td className="text-right font-mono">{hold.qty}</td>
                              <td className="text-right font-mono">₹{hold.avgPrice.toFixed(2)}</td>
                              <td className="text-right font-mono text-accent">₹{livePrice.toFixed(2)}</td>
                              <td className="text-right font-mono text-muted">₹{invested.toFixed(2)}</td>
                              <td className={`text-right font-mono bold ${isUp ? 'text-up' : 'text-down'}`}>
                                {isUp ? '+' : ''}₹{pnl.toFixed(2)} ({isUp ? '+' : ''}{pnlPct.toFixed(2)}%)
                              </td>
                              <td className="text-center">
                                <button
                                  onClick={() => handleLiquidateHolding(symbol, hold.qty, livePrice)}
                                  className="btn-table-liquidate"
                                >
                                  Liquidate
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Tab 2: Transaction History */}
              {activeTab === 'history' && (
                transactions.length === 0 ? (
                  <div className="tab-empty">
                    <History size={28} className="icon-tab-empty" />
                    <span>No simulated transactions recorded in this session.</span>
                  </div>
                ) : (
                  <div className="tab-timeline-wrapper">
                    {transactions.slice(0, 20).map((tx) => {
                      const isBuy = tx.action === 'BUY';
                      const formattedTime = new Date(tx.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      });

                      return (
                        <div key={tx.id} className="tab-timeline-item font-mono">
                          <div className="timeline-item-left">
                            <span className={`timeline-badge ${isBuy ? 'buy' : 'sell'}`}>{tx.action}</span>
                            <span className="bold text-accent">{tx.symbol}</span>
                            <span className="text-muted">({tx.orderType})</span>
                          </div>
                          
                          <div className="timeline-item-center text-muted">
                            {tx.qty} shares @ ₹{tx.price.toFixed(2)}
                          </div>
                          
                          <div className="timeline-item-right bold text-accent">
                            ₹{(tx.qty * tx.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="time text-muted">{formattedTime}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Tab 3: simulated treasury */}
              {activeTab === 'treasury' && (
                <div className="tab-treasury-grid">
                  <div className="treasury-card">
                    <span className="lbl text-muted">Simulated Liquid Cash</span>
                    <span className="val font-mono">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="desc">Ready simulated credit reserves</span>
                  </div>
                  <div className="treasury-card">
                    <span className="lbl text-muted">Simulated Inventory Assets</span>
                    <span className="val font-mono">₹{holdingsMarketVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="desc">Valued at live NSE scraped market quotes</span>
                  </div>
                  <div className="treasury-card">
                    <span className="lbl text-muted">Original Deposit Grant</span>
                    <span className="val font-mono">₹5,000.00</span>
                    <span className="desc">Programmatically credited demo cash grant</span>
                  </div>
                  <div className="treasury-card buttons-box">
                    <button className="btn-tv-action reset-large" onClick={resetPaperPortfolio}>
                      <RefreshCw size={14} />
                      <span>Reset Simulated Treasury</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Column C: Simulated Order Execution Desk (Right) */}
        {showOrderDesk && (
          <aside className="order-desk-aside glass-card">
          <div className="aside-title">
            <ShoppingCart size={14} className="title-icon text-accent" />
            <span>Order Ticket Execution</span>
          </div>

          {tradeSuccess && (
            <div className="desk-alert success">
              <CheckCircle2 size={14} className="icon" />
              <span>{tradeSuccess}</span>
            </div>
          )}

          {tradeError && (
            <div className="desk-alert error">
              <ShieldAlert size={14} className="icon" />
              <span>{tradeError}</span>
            </div>
          )}

          <form id="trade-terminal-action-form" onSubmit={handleExecuteTrade} className="terminal-desk-form">
            {/* Symbol display */}
            <div className="form-row border-bottom">
              <span className="form-lbl">Active Symbol</span>
              <span className="form-val bold font-mono text-accent">{activeStock}</span>
            </div>

            {/* Toggle Actions */}
            <div className="terminal-action-toggle">
              <button 
                type="button" 
                className={`btn-toggle buy ${tradeAction === 'BUY' ? 'active' : ''}`}
                onClick={() => setTradeAction('BUY')}
              >
                BUY / LONG
              </button>
              <button 
                type="button" 
                className={`btn-toggle sell ${tradeAction === 'SELL' ? 'active' : ''}`}
                onClick={() => setTradeAction('SELL')}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Quantity inputs */}
            <div className="form-group">
              <label className="form-lbl">Shares Quantity</label>
              <div className="qty-picker font-mono">
                <button 
                  type="button" 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 5))}
                  className="btn-qty-adj"
                >
                  -5
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="qty-input font-mono bold"
                />
                <button 
                  type="button" 
                  onClick={() => setQuantity(prev => prev + 5)}
                  className="btn-qty-adj"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Trigger Type Selection */}
            <div className="form-group">
              <label className="form-lbl">Trigger Mode</label>
              <select 
                value={orderType} 
                onChange={(e) => {
                  setOrderType(e.target.value);
                  if (e.target.value === 'LIMIT') setLimitPrice(currentLTP);
                }}
                className="select-trigger"
              >
                <option value="MARKET">Market Rate LTP</option>
                <option value="LIMIT">Limit Trigger price</option>
              </select>
            </div>

            {orderType === 'LIMIT' && (
              <div className="form-group slide-down-anim">
                <label className="form-lbl">Limit Rate Target (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="input-limit font-mono bold"
                />
              </div>
            )}

            {/* Live Financial Breakdown Summary */}
            <div className="financials-breakdown glass-card">
              <div className="breakdown-row font-mono">
                <span className="lbl text-muted">Demo Balance Available</span>
                <span className="val">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-row font-mono">
                <span className="lbl text-muted">LTP Share Quote</span>
                <span className="val text-accent">₹{currentLTP.toFixed(2)}</span>
              </div>
              <div className="breakdown-row font-mono">
                <span className="lbl text-muted">Execution Price</span>
                <span className="val text-accent">₹{executionPrice.toFixed(2)}</span>
              </div>
              <hr className="breakdown-line" />
              <div className="breakdown-row total font-mono">
                <span className="lbl">Outlay Cost</span>
                <span className="val bold text-accent">₹{estimatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Execute Button */}
            <button 
              type="submit" 
              className={`btn-terminal-submit ${tradeAction === 'BUY' ? 'buy' : 'sell'}`}
              disabled={isExecuting || executionPrice <= 0}
            >
              {isExecuting ? (
                <span className="spinner-small"></span>
              ) : (
                <span>Execute Simulated {tradeAction}</span>
              )}
            </button>
          </form>
        </aside>
        )}

      </div>
    </div>
  );
}
