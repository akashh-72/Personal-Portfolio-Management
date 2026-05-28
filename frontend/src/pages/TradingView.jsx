import React, { useState, useEffect } from 'react';
import { db, ref } from '../firebase';
import { onValue, set } from 'firebase/database';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Award, ArrowUp, ArrowDown, ShieldCheck, ChevronRight, Activity, Plus, Minus, Search, Star, Trash2 } from 'lucide-react';
import './TradingView.css';

// Stock metadata reference
const AVAILABLE_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy & Conglomerate' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', sector: 'Information Technology' },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'Information Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Financial Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Financial Services' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', sector: 'Automotive' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services' }
];

// Premium glassmorphic custom tooltip for the candlestick OHLC chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isGreen = data.isGreen;
    return (
      <div className="tradingview-custom-tooltip glass-card" style={{
        padding: '12px 16px',
        background: 'rgba(13, 18, 34, 0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        fontSize: '0.82rem',
        color: 'var(--text-primary)',
        minWidth: '180px'
      }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', color: 'var(--text-secondary)' }}>
          {data.date}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>O: </span>
            <span style={{ fontWeight: '500' }}>₹{data.open.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>H: </span>
            <span style={{ fontWeight: '500', color: 'var(--text-gain)' }}>₹{data.high.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>L: </span>
            <span style={{ fontWeight: '500', color: 'var(--text-loss)' }}>₹{data.low.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>C: </span>
            <span style={{ fontWeight: '600', color: isGreen ? 'var(--text-gain)' : 'var(--text-loss)' }}>₹{data.close.toFixed(2)}</span>
          </div>
        </div>
        
        {(data.sma20 || data.ema50) && (
          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.sma20 && (
              <div>
                <span style={{ color: '#f59e0b' }}>SMA(20): </span>
                <span style={{ fontWeight: '500' }}>₹{data.sma20.toFixed(2)}</span>
              </div>
            )}
            {data.ema50 && (
              <div>
                <span style={{ color: '#ec4899' }}>EMA(50): </span>
                <span style={{ fontWeight: '500' }}>₹{data.ema50.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function TradingView({ clientId, initialSymbol, stockPrices, stockQuotes }) {
  const [activeStock, setActiveStock] = useState(initialSymbol || 'RELIANCE');
  const [stocksList, setStocksList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [indicators, setIndicators] = useState({ showSma20: true, showEma50: true });
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [tradeAction, setTradeAction] = useState('BUY');
  const [tradeQty, setTradeQty] = useState(10);
  const [tradePrice, setTradePrice] = useState(0);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [tradeError, setTradeError] = useState('');

  // Search & Wishlist states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  // Sync wishlist from Firebase database in real-time
  useEffect(() => {
    const wishlistRef = ref(db, `users/${clientId}/wishlist`);
    const unsubscribe = onValue(wishlistRef, (snapshot) => {
      const data = snapshot.val();
      setWishlist(data ? Object.keys(data) : []);
    });
    return () => unsubscribe();
  }, [clientId]);

  // 1. Sync stocksList dynamically from global stockQuotes prop
  useEffect(() => {
    if (stockQuotes && Object.keys(stockQuotes).length > 0) {
      const list = Object.values(stockQuotes);
      setStocksList(list);
      
      // Set initial trade price based on active stock price
      const activeItem = list.find(s => s.symbol === activeStock);
      if (activeItem) {
        setTradePrice(stockPrices[activeStock] || activeItem.currentPrice);
      }
    }
  }, [stockQuotes, activeStock]);

  // 2. Fetch historical/predicted chart data
  useEffect(() => {
    const loadChartData = async () => {
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: activeStock, horizonDays: 7 })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Extract the last 30 historical points to show in candle chart
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
              // Recharts Range values for custom bars
              wick: [lowVal, highVal],
              body: [Math.min(openVal, closeVal), Math.max(openVal, closeVal)]
            };
          });
          setChartData(hist);
        }
      } catch (err) {
        console.error("Error loading chart data:", err);
      }
    };

    loadChartData();
  }, [activeStock]);

  // 3. Generate dynamic simulated order book depth
  useEffect(() => {
    const activeItem = stocksList.find(s => s.symbol === activeStock);
    if (!activeItem) return;

    const base = stockPrices[activeStock] || activeItem.currentPrice;

    const generateBook = () => {
      const bids = [];
      const asks = [];
      
      // 5 levels deep
      for (let i = 1; i <= 5; i++) {
        const spread = base * 0.0003 * i;
        const bidPrice = Number((base - spread).toFixed(2));
        const askPrice = Number((base + spread).toFixed(2));
        
        bids.push({
          price: bidPrice,
          qty: Math.floor(Math.random() * 850) + 150,
          depth: 100 - i * 15
        });

        asks.push({
          price: askPrice,
          qty: Math.floor(Math.random() * 850) + 150,
          depth: 100 - i * 15
        });
      }
      setOrderBook({ bids, asks });
    };

    generateBook();
    const interval = setInterval(generateBook, 3500);
    return () => clearInterval(interval);
  }, [stocksList, activeStock]);

  // Search and Wishlist Handlers
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const response = await fetch(`/api/stocks/search?symbol=${searchQuery.trim().toUpperCase()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
      } else {
        const err = await response.json();
        setSearchError(err.detail || "Stock not found.");
      }
    } catch (err) {
      setSearchError("Unable to connect to search API.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddToWishlist = async (sym) => {
    try {
      const symbolRef = ref(db, `users/${clientId}/wishlist/${sym}`);
      await set(symbolRef, true);
    } catch (e) {
      console.error("Error adding to wishlist:", e);
    }
  };

  const handleRemoveFromWishlist = async (sym) => {
    try {
      const symbolRef = ref(db, `users/${clientId}/wishlist/${sym}`);
      await set(symbolRef, null);
      // If activeStock was the removed wishlist stock, reset to RELIANCE
      if (activeStock === sym) {
        setActiveStock('RELIANCE');
      }
    } catch (e) {
      console.error("Error removing from wishlist:", e);
    }
  };

  // 4. Handle trade submit
  const handleTrade = async (e) => {
    e.preventDefault();
    if (tradeQty <= 0) {
      setTradeError("Quantity must be positive.");
      return;
    }

    setTradeLoading(true);
    setTradeError('');
    setTradeSuccess(false);

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          symbol: activeStock,
          qty: Number(tradeQty),
          price: Number(tradePrice),
          action: tradeAction
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTradeSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setTradeSuccess(false), 3000);
      } else {
        setTradeError(data.detail || "Order execution failed.");
      }
    } catch (err) {
      setTradeError("Unable to execute trade. Python backend must be running.");
    } finally {
      setTradeLoading(false);
    }
  };

  const activeItem = stocksList.find(s => s.symbol === activeStock) || {
    symbol: activeStock,
    name: 'Reliance Industries Ltd.',
    currentPrice: 2850.0,
    basePrice: 2850.0 * 0.99,
    sector: 'Energy & Conglomerate'
  };

  const livePrice = stockPrices[activeStock] || activeItem.currentPrice || activeItem.basePrice;
  const change = livePrice - (activeItem.basePrice || activeItem.currentPrice * 0.99);
  const changePct = (((change / (activeItem.basePrice || activeItem.currentPrice * 0.99)) * 100) || 0).toFixed(2);

  const selectedStockData = {
    ...activeItem,
    currentPrice: livePrice,
    change: change,
    changePct: changePct
  };

  return (
    <div className="tradingview-container">
      {/* WATCHLIST COLUMN (LEFT) */}
      <div className="watchlist-panel glass-card">
        <h3 className="panel-title">Market Terminal</h3>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="watchlist-search-form">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search NSE Ticker..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" disabled={searchLoading} className="search-btn">
              {searchLoading ? <span className="spinner-small"></span> : "Go"}
            </button>
          </div>
        </form>

        {/* Search Error */}
        {searchError && (
          <div className="search-error-msg">
            {searchError}
          </div>
        )}

        {/* Search Result Card */}
        {searchResult && (
          <div className="search-result-card glass-card">
            <div className="search-result-header">
              <div className="search-result-meta">
                <span className="search-result-symbol">{searchResult.symbol}</span>
                <span className="search-result-name text-muted">{searchResult.name}</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (wishlist.includes(searchResult.symbol)) {
                    handleRemoveFromWishlist(searchResult.symbol);
                  } else {
                    handleAddToWishlist(searchResult.symbol);
                  }
                }}
                className={`wishlist-toggle-btn ${wishlist.includes(searchResult.symbol) ? 'in-wishlist' : ''}`}
                title={wishlist.includes(searchResult.symbol) ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Star size={15} fill={wishlist.includes(searchResult.symbol) ? "var(--color-primary)" : "none"} />
              </button>
            </div>
            <div className="search-result-body">
              <span className="search-result-price">₹{searchResult.currentPrice.toFixed(2)}</span>
              <span className="search-result-sector text-muted">{searchResult.sector || 'NSE Segment'}</span>
            </div>
            <div className="search-result-footer">
              <button 
                type="button" 
                onClick={() => {
                  setActiveStock(searchResult.symbol);
                  setTradeQty(10);
                  setTradeSuccess(false);
                  setSearchQuery('');
                  setSearchResult(null);
                }}
                className="view-chart-btn"
              >
                <span>View Dynamic Chart</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        <div className="watchlist-list-container">
          {/* Core Stocks Section */}
          <div className="watchlist-section-header">Core Market</div>
          <div className="watchlist-list">
            {stocksList.filter(s => !wishlist.includes(s.symbol)).map(stock => {
              const isSelected = stock.symbol === activeStock;
              const livePriceVal = stockPrices[stock.symbol] || stock.currentPrice;
              const changeVal = livePriceVal - stock.basePrice;
              const changePctVal = ((changeVal / stock.basePrice) * 100).toFixed(2);
              const isUpVal = changeVal >= 0;
              
              return (
                <div 
                  key={stock.symbol} 
                  className={`watchlist-item ${isSelected ? 'active-item' : ''}`}
                  onClick={() => {
                    setActiveStock(stock.symbol);
                    setTradeQty(10);
                    setTradeSuccess(false);
                  }}
                >
                  <div className="watchlist-left">
                    <span className="watchlist-symbol">{stock.symbol}</span>
                    <span className="watchlist-name text-muted">{stock.name.split(' ')[0]}</span>
                  </div>
                  <div className="watchlist-right">
                    <span className="watchlist-price">₹{livePriceVal.toFixed(2)}</span>
                    <span className={`watchlist-pct ${isUpVal ? 'text-up' : 'text-down'}`}>
                      {isUpVal ? '+' : ''}{changePctVal}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wishlist Section */}
          <div className="watchlist-section-header">Your Wishlist</div>
          <div className="watchlist-list">
            {wishlist.length === 0 ? (
              <div className="empty-wishlist text-muted">
                No custom stocks added yet. Search a ticker and click the star to add!
              </div>
            ) : (
              stocksList.filter(s => wishlist.includes(s.symbol)).map(stock => {
                const isSelected = stock.symbol === activeStock;
                const livePriceVal = stockPrices[stock.symbol] || stock.currentPrice;
                const changeVal = livePriceVal - stock.basePrice;
                const changePctVal = ((changeVal / stock.basePrice) * 100).toFixed(2);
                const isUpVal = changeVal >= 0;
                
                return (
                  <div 
                    key={stock.symbol} 
                    className={`watchlist-item wishlist-item-row ${isSelected ? 'active-item' : ''}`}
                    onClick={() => {
                      setActiveStock(stock.symbol);
                      setTradeQty(10);
                      setTradeSuccess(false);
                    }}
                  >
                    <div className="watchlist-left">
                      <span className="watchlist-symbol">{stock.symbol}</span>
                      <span className="watchlist-name text-muted">{stock.name.split(' ')[0]}</span>
                    </div>
                    <div className="watchlist-right-with-actions">
                      <div className="watchlist-right">
                        <span className="watchlist-price">₹{livePriceVal.toFixed(2)}</span>
                        <span className={`watchlist-pct ${isUpVal ? 'text-up' : 'text-down'}`}>
                          {isUpVal ? '+' : ''}{changePctVal}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering activeStock set
                          handleRemoveFromWishlist(stock.symbol);
                        }}
                        className="watchlist-delete-btn"
                        title="Remove from Wishlist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CHART STATION (CENTER) */}
      <div className="chart-station-wrapper">
        {/* Ticker Header */}
        <div className="ticker-header-bar glass-card">
          <div className="ticker-meta">
            <span className="ticker-sym">{selectedStockData.symbol}</span>
            <span className="ticker-desc text-muted">{selectedStockData.name}</span>
          </div>
          <div className="ticker-stats">
            <div className="stat-unit">
              <span className="stat-label">LTP (Last Traded Price)</span>
              <span className="stat-val primary-color">₹{selectedStockData.currentPrice.toFixed(2)}</span>
            </div>
            <div className="stat-unit">
              <span className="stat-label">Change (24h)</span>
              <span className={`stat-val ${selectedStockData.change >= 0 ? 'text-up' : 'text-down'}`}>
                {selectedStockData.change >= 0 ? '+' : ''}{selectedStockData.change.toFixed(2)} ({selectedStockData.changePct}%)
              </span>
            </div>
            <div className="stat-unit">
              <span className="stat-label">Sector</span>
              <span className="stat-val text-muted">{selectedStockData.sector}</span>
            </div>
          </div>
        </div>

        {/* Recharts Candlestick Board */}
        <div className="chart-board-card glass-card">
          <div className="chart-controls">
            <h4 className="chart-board-title">Advanced Composed Candlestick Chart</h4>
            <div className="indicator-toggles">
              <label className="toggle-label">
                <input 
                  type="checkbox" 
                  checked={indicators.showSma20} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, showSma20: e.target.checked }))} 
                />
                <span className="checkbox-custom sma20"></span>
                <span>SMA (20)</span>
              </label>
              
              <label className="toggle-label">
                <input 
                  type="checkbox" 
                  checked={indicators.showEma50} 
                  onChange={(e) => setIndicators(prev => ({ ...prev, showEma50: e.target.checked }))} 
                />
                <span className="checkbox-custom ema50"></span>
                <span>EMA (50)</span>
              </label>
            </div>
          </div>

          <div className="composed-chart-canvas">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                   <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['dataMin - 15', 'dataMax + 15']}
                    tickFormatter={(v) => `₹${Number(v).toFixed(0)}`}
                  />
                  <YAxis yAxisId="vol" hide={true} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Real Candlestick Wicks */}
                  <Bar dataKey="wick" fill="#10b981" barSize={2} legendType="none">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`wick-cell-${index}`} 
                        fill={entry.isGreen ? 'var(--color-gain)' : 'var(--color-loss)'} 
                      />
                    ))}
                  </Bar>

                  {/* Real Candlestick Bodies */}
                  <Bar dataKey="body" fill="#10b981" barSize={10} name="OHLC Candle">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`body-cell-${index}`} 
                        fill={entry.isGreen ? 'var(--color-gain)' : 'var(--color-loss)'}
                        stroke={entry.isGreen ? 'var(--color-gain)' : 'var(--color-loss)'}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                  
                  {/* EMA/SMA overlays */}
                  {indicators.showSma20 && (
                    <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} activeDot={false} name="SMA 20" />
                  )}
                  {indicators.showEma50 && (
                    <Line type="monotone" dataKey="ema50" stroke="#ec4899" strokeWidth={1.5} dot={false} activeDot={false} name="EMA 50" />
                  )}
                  
                  {/* Premium line chart showing the closing LTP path for reference and anchor */}
                  <Line type="monotone" dataKey="price" stroke="rgba(59, 130, 246, 0.45)" strokeWidth={2} dot={false} name="LTP Close Path" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-loading-state">
                <span className="spinner"></span>
                <span>Calculating technical parameters...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEPTH & ORDER COLUMN (RIGHT) */}
      <div className="order-desk-panel glass-card">
        {/* Order Book */}
        <div className="order-book-section">
          <h4 className="section-title">Live Market Depth</h4>
          
          <div className="order-book-table">
            <div className="book-header">
              <span>Bid Size</span>
              <span>Bid Price</span>
              <span>Ask Price</span>
              <span>Ask Size</span>
            </div>
            
            <div className="book-bids-asks">
              {orderBook.bids.map((bid, idx) => {
                const ask = orderBook.asks[idx] || { price: 0, qty: 0, depth: 0 };
                return (
                  <div key={idx} className="book-row">
                    {/* Bid */}
                    <div className="bid-cell">
                      <div className="depth-fill bid" style={{ width: `${bid.depth}%` }}></div>
                      <span className="qty">{bid.qty}</span>
                      <span className="price text-up">₹{bid.price.toFixed(2)}</span>
                    </div>
                    {/* Ask */}
                    <div className="ask-cell">
                      <div className="depth-fill ask" style={{ width: `${ask.depth}%` }}></div>
                      <span className="price text-down">₹{ask.price.toFixed(2)}</span>
                      <span className="qty">{ask.qty}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trade Form */}
        <div className="trade-desk-section">
          <h4 className="section-title">Execution Terminal</h4>

          {tradeError && <div className="trade-error text-down">{tradeError}</div>}
          {tradeSuccess && <div className="trade-success text-up">Simulated order placed successfully!</div>}

          <form onSubmit={handleTrade} className="trade-form">
            <div className="trade-action-toggle">
              <button 
                type="button" 
                onClick={() => setTradeAction('BUY')} 
                className={`action-btn buy ${tradeAction === 'BUY' ? 'active' : ''}`}
              >
                BUY
              </button>
              <button 
                type="button" 
                onClick={() => setTradeAction('SELL')} 
                className={`action-btn sell ${tradeAction === 'SELL' ? 'active' : ''}`}
              >
                SELL
              </button>
            </div>

            <div className="qty-picker">
              <span className="picker-label">Shares Qty</span>
              <div className="picker-controls">
                <button type="button" onClick={() => setTradeQty(q => Math.max(1, q - 5))} className="picker-btn">
                  <Minus size={14} />
                </button>
                <input 
                  type="number" 
                  value={tradeQty} 
                  onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 0))}
                  required 
                />
                <button type="button" onClick={() => setTradeQty(q => q + 5)} className="picker-btn">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="price-input-group">
              <span className="picker-label">Limit Execution Price</span>
              <input 
                type="number" 
                step="0.01" 
                value={Number(tradePrice.toFixed(2))} 
                onChange={(e) => setTradePrice(parseFloat(e.target.value) || 0)}
                required 
              />
            </div>

            <div className="order-cost-summary">
              <span className="summary-label">Estimated Position Value</span>
              <span className="summary-val">₹{(tradeQty * tradePrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            <button 
              type="submit" 
              className={`submit-order-btn ${tradeAction === 'BUY' ? 'buy' : 'sell'}`}
              disabled={tradeLoading}
            >
              {tradeLoading ? (
                <span className="spinner"></span>
              ) : (
                <span>Place simulated {tradeAction} order</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
