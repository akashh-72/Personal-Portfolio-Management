import React, { useState, useEffect } from 'react';
import { db, ref } from '../firebase';
import { onValue } from 'firebase/database';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info, Wallet, DollarSign, RefreshCw, X } from 'lucide-react';
import './Holdings.css';

export default function Holdings({ clientId, setActivePage, setSelectedStockSymbol, stockPrices, stockQuotes }) {
  const [holdings, setHoldings] = useState({});
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeAction, setTradeAction] = useState('BUY'); // BUY or SELL
  const [tradeQty, setTradeQty] = useState(10);
  const [tradePrice, setTradePrice] = useState(0);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');

  // Fetch holdings from Firebase Realtime Database
  useEffect(() => {
    const holdingsRef = ref(db, `users/${clientId}/holdings`);
    const unsubscribe = onValue(holdingsRef, (snapshot) => {
      const data = snapshot.val();
      setHoldings(data || {});
    });
    return () => unsubscribe();
  }, [clientId]);

  // Compute portfolio aggregates
  let totalInvested = 0;
  let totalCurrent = 0;
  
  Object.keys(holdings).forEach(key => {
    const stock = holdings[key];
    const livePrice = stockPrices[stock.symbol] || stock.avgPrice;
    totalInvested += stock.qty * stock.avgPrice;
    totalCurrent += stock.qty * livePrice;
  });

  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const handlePredictClick = (symbol) => {
    setSelectedStockSymbol(symbol);
    setActivePage('prediction');
  };

  const openTradeModal = (stock, action) => {
    const livePrice = stockPrices[stock.symbol] || stock.avgPrice;
    setSelectedStock(stock);
    setTradeAction(action);
    setTradeQty(10);
    setTradePrice(Number(livePrice.toFixed(2)));
    setTradeError('');
    setIsTradeModalOpen(true);
  };

  const closeTradeModal = () => {
    setIsTradeModalOpen(false);
    setSelectedStock(null);
    setTradeError('');
  };

  const handleTradeSubmit = async (e) => {
    e.preventDefault();
    if (tradeQty <= 0) {
      setTradeError('Quantity must be greater than zero.');
      return;
    }

    setTradeLoading(true);
    setTradeError('');

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          symbol: selectedStock.symbol,
          qty: Number(tradeQty),
          price: Number(tradePrice),
          action: tradeAction
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        closeTradeModal();
      } else {
        setTradeError(data.detail || 'Trade execution failed.');
      }
    } catch (err) {
      setTradeError('Backend server connection error. Verify Python app is running.');
    } finally {
      setTradeLoading(false);
    }
  };

  return (
    <div className="holdings-page-container">
      {/* 1. Header Banner */}
      <div className="holdings-banner-grid">
        <div className="banner-card glass-card">
          <div className="banner-card-label">
            <Wallet size={16} className="text-muted" />
            <span>Invested Valuation</span>
          </div>
          <div className="banner-card-val">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
        </div>

        <div className="banner-card glass-card">
          <div className="banner-card-label">
            <DollarSign size={16} className="text-muted" />
            <span>Current Asset Value</span>
          </div>
          <div className="banner-card-val">₹{totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
        </div>

        <div className={`banner-card glass-card ${totalPnL >= 0 ? 'gain-glow' : 'loss-glow'}`}>
          <div className="banner-card-label">
            <TrendingUp size={16} className={totalPnL >= 0 ? 'text-up' : 'text-down'} />
            <span>Net Portfolio Returns (P&L)</span>
          </div>
          <div className={`banner-card-val ${totalPnL >= 0 ? 'text-up' : 'text-down'}`}>
            ₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="banner-card-pct">
            <span className={`badge-pill ${totalPnL >= 0 ? 'badge-up' : 'badge-down'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}% ROI
            </span>
          </div>
        </div>
      </div>

      {/* 2. Holdings Table */}
      <div className="holdings-table-card glass-card">
        <div className="table-header-row">
          <h3 className="card-heading">Asset Holdings & Open Positions</h3>
          <div className="sync-indicator">
            <RefreshCw size={12} className="spin-animation text-up" />
            <span>Syncing live from Firebase</span>
          </div>
        </div>

        {Object.keys(holdings).length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Equity Name</th>
                  <th>Quantity</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Invested Value</th>
                  <th>Current Value</th>
                  <th>Day P&L (Est.)</th>
                  <th>Total P&L</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(holdings).map(key => {
                  const stock = holdings[key];
                  const quote = (stockQuotes && stockQuotes[stock.symbol]) || {};
                  const livePrice = quote.currentPrice || stockPrices[stock.symbol] || stock.avgPrice;
                  const invVal = stock.qty * stock.avgPrice;
                  const curVal = stock.qty * livePrice;
                  const pnl = curVal - invVal;
                  const pnlPct = (pnl / invVal) * 100;
                  
                  // Actual daily return and percentage from quote
                  const dayPnlPct = quote.changePct || 0.00;
                  const dayChange = quote.change || 0.00;
                  const dayPnl = stock.qty * dayChange;
                  const isDayUp = dayPnl >= 0;

                  return (
                    <tr key={stock.symbol}>
                      <td>
                        <div className="table-equity-name">
                          <span className="equity-symbol">{stock.symbol}</span>
                          <span className="equity-desc text-muted">{stock.name}</span>
                        </div>
                      </td>
                      <td>{stock.qty}</td>
                      <td>₹{stock.avgPrice.toFixed(2)}</td>
                      <td className="font-semibold text-primary-color">₹{livePrice.toFixed(2)}</td>
                      <td>₹{invVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="font-semibold">₹{curVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className={`font-semibold ${isDayUp ? 'text-up' : 'text-down'}`}>
                        <div className="day-pnl-cell">
                          <span>{isDayUp ? '+' : ''}₹{dayPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="pnl-pct-small">({isDayUp ? '+' : ''}{dayPnlPct.toFixed(2)}%)</span>
                        </div>
                      </td>
                      <td className={`font-semibold ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        <div className="pnl-cell">
                          <span>₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="pnl-pct-small">({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button 
                            onClick={() => openTradeModal(stock, 'BUY')} 
                            className="btn-action buy-btn-action"
                          >
                            Buy
                          </button>
                          <button 
                            onClick={() => openTradeModal(stock, 'SELL')} 
                            className="btn-action sell-btn-action"
                          >
                            Sell
                          </button>
                          <button 
                            onClick={() => handlePredictClick(stock.symbol)} 
                            className="btn-secondary btn-action-small predictor-btn-action"
                          >
                            AI Predict
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-holdings-list text-muted">
            <p>Your portfolio is currently empty.</p>
            <p>Click **Demo Quick Login** to seed data, or go to **TradingView** to execute sample market orders!</p>
          </div>
        )}
      </div>

      {/* 3. Trade Modal Container */}
      {isTradeModalOpen && selectedStock && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card glowing-border">
            <div className="modal-header">
              <h3 className="modal-title">Simulate Portfolio Adjustment</h3>
              <button onClick={closeTradeModal} className="modal-close-btn"><X size={18} /></button>
            </div>
            
            <div className="modal-stock-details">
              <span className="modal-stock-symbol">{selectedStock.symbol}</span>
              <span className="modal-stock-name text-muted">{selectedStock.name}</span>
            </div>

            {tradeError && (
              <div className="modal-error text-down">
                <Info size={16} />
                <span>{tradeError}</span>
              </div>
            )}

            <form onSubmit={handleTradeSubmit} className="modal-form">
              <div className="modal-action-selector">
                <button
                  type="button"
                  onClick={() => setTradeAction('BUY')}
                  className={`modal-action-btn buy ${tradeAction === 'BUY' ? 'active' : ''}`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setTradeAction('SELL')}
                  className={`modal-action-btn sell ${tradeAction === 'SELL' ? 'active' : ''}`}
                >
                  SELL
                </button>
              </div>

              <div className="modal-input-group">
                <label className="input-label">Quantity Shares</label>
                <input
                  type="number"
                  min="1"
                  value={tradeQty}
                  onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                />
              </div>

              <div className="modal-input-group">
                <label className="input-label">Trade Price (Simulated Tick)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(Math.max(0.1, parseFloat(e.target.value) || 0))}
                  required
                />
              </div>

              <div className="modal-summary">
                <span className="summary-label">Estimated Value:</span>
                <span className="summary-value">₹{(tradeQty * tradePrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <button
                type="submit"
                disabled={tradeLoading}
                className={`modal-submit-btn ${tradeAction === 'BUY' ? 'btn-gain' : 'btn-loss'}`}
              >
                {tradeLoading ? (
                  <span className="spinner"></span>
                ) : (
                  <span>Execute Simulated {tradeAction}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
