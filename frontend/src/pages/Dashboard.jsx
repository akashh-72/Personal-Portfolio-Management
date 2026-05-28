import React, { useState, useEffect } from 'react';
import { db, ref } from '../firebase';
import { onValue } from 'firebase/database';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Wallet, Percent, ChevronRight } from 'lucide-react';
import './Dashboard.css';

const CHART_COLORS = ['#3b82f6', '#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#ec4899'];

export default function Dashboard({ clientId, setActivePage, setSelectedStockSymbol, stockPrices, marketTrends: propMarketTrends, stockQuotes }) {
  const [holdings, setHoldings] = useState({});
  const [marketTrends, setMarketTrends] = useState({
    NIFTY50: { value: 22624.15, change: 118.40, pct: 0.53, isUp: true },
    SENSEX: { value: 74435.80, change: 395.20, pct: 0.53, isUp: true },
    NIFTY_IT: { value: 34185.50, change: -245.10, pct: -0.71, isUp: false },
    BANKNIFTY: { value: 48512.30, change: 488.70, pct: 1.02, isUp: true }
  });

  // Listen to holdings from Firebase in real-time
  useEffect(() => {
    const holdingsRef = ref(db, `users/${clientId}/holdings`);
    const unsubscribe = onValue(holdingsRef, (snapshot) => {
      const data = snapshot.val();
      setHoldings(data || {});
    });
    return () => unsubscribe();
  }, [clientId]);

  // Sync marketTrends from backend props when available
  useEffect(() => {
    if (propMarketTrends && Object.keys(propMarketTrends).length > 0) {
      setMarketTrends(propMarketTrends);
    }
  }, [propMarketTrends]);

  // Simulate market price movements in background only if backend trends are not available yet
  useEffect(() => {
    if (propMarketTrends && Object.keys(propMarketTrends).length > 0) return;

    const interval = setInterval(() => {
      setMarketTrends(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(index => {
          const changeVal = (Math.random() - 0.48) * 15;
          const currentVal = next[index].value + changeVal;
          const totalChange = next[index].change + changeVal;
          const pct = (totalChange / (currentVal - totalChange)) * 100;
          next[index] = {
            value: Number(currentVal.toFixed(2)),
            change: Number(totalChange.toFixed(2)),
            pct: Number(pct.toFixed(2)),
            isUp: totalChange >= 0
          };
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [propMarketTrends]);

  // Compute portfolio metrics
  let investedValue = 0;
  let currentValue = 0;
  const sectorDataMap = {};

  Object.keys(holdings).forEach(key => {
    const holding = holdings[key];
    const livePrice = stockPrices[holding.symbol] || holding.avgPrice;
    investedValue += holding.qty * holding.avgPrice;
    currentValue += holding.qty * livePrice;

    // Aggregate by Sector
    const sector = holding.sector || 'Other';
    const val = holding.qty * livePrice;
    sectorDataMap[sector] = (sectorDataMap[sector] || 0) + val;
  });

  const totalGain = currentValue - investedValue;
  const gainPct = investedValue > 0 ? (totalGain / investedValue) * 100 : 0;
  
  // Format data for Recharts Pie
  const pieData = Object.keys(sectorDataMap).map(sector => ({
    name: sector,
    value: Math.round(sectorDataMap[sector])
  }));

  // Historical valuation data (Sample 7 months area chart)
  const historyData = [
    { month: 'Nov', valuation: investedValue * 0.88, invested: investedValue * 0.90 },
    { month: 'Dec', valuation: investedValue * 0.92, invested: investedValue * 0.92 },
    { month: 'Jan', valuation: investedValue * 0.98, invested: investedValue * 0.95 },
    { month: 'Feb', valuation: investedValue * 0.96, invested: investedValue * 0.97 },
    { month: 'Mar', valuation: investedValue * 1.02, invested: investedValue * 0.99 },
    { month: 'Apr', valuation: investedValue * 1.05, invested: investedValue * 1.00 },
    { month: 'May (Live)', valuation: currentValue, invested: investedValue }
  ];

  const handlePredictClick = (symbol) => {
    setSelectedStockSymbol(symbol);
    setActivePage('prediction');
  };

  return (
    <div className="dashboard-page-container">
      {/* 1. Live Indices Ticker */}
      <div className="indices-grid">
        {Object.keys(marketTrends).map(key => {
          const index = marketTrends[key];
          return (
            <div key={key} className={`index-card glass-card ${index.isUp ? 'gain-glow' : 'loss-glow'}`}>
              <div className="index-info">
                <span className="index-title">{key.replace('_', ' ')}</span>
                <span className={`index-pct ${index.isUp ? 'text-up' : 'text-down'}`}>
                  {index.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {index.isUp ? '+' : ''}{index.pct}%
                </span>
              </div>
              <div className="index-price-row">
                <span className="index-price">₹{index.value.toLocaleString('en-IN')}</span>
                <span className={`index-change ${index.isUp ? 'text-up' : 'text-down'}`}>
                  {index.isUp ? '+' : ''}{index.change.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Core Metrics Summary */}
      <div className="metrics-summary-grid">
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-label">Net Worth (Current)</span>
            <div className="metric-icon-bg primary"><DollarSign size={18} /></div>
          </div>
          <div className="metric-value">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="metric-subtext">
            <span className="text-muted">Total Capital Assets Valuation</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-label">Invested Capital</span>
            <div className="metric-icon-bg secondary"><Wallet size={18} /></div>
          </div>
          <div className="metric-value">₹{investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="metric-subtext">
            <span className="text-muted">Net Purchase Valuation</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-label">Total Returns</span>
            <div className="metric-icon-bg accent"><TrendingUp size={18} /></div>
          </div>
          <div className={`metric-value ${totalGain >= 0 ? 'text-up' : 'text-down'}`}>
            ₹{totalGain.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="metric-subtext">
            <span className={`badge-pill ${totalGain >= 0 ? 'badge-up' : 'badge-down'}`}>
              {totalGain >= 0 ? '+' : ''}{gainPct.toFixed(2)}% Overall
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recharts Visualizations Grid */}
      <div className="charts-visual-grid">
        {/* Line / Area Performance Chart */}
        <div className="chart-container-card glass-card">
          <h3 className="card-heading">Portfolio Valuation Trend</h3>
          <div className="recharts-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Portfolio Value']}
                />
                <Area type="monotone" dataKey="valuation" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#valGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie / Donut Asset Allocation Chart */}
        <div className="chart-container-card glass-card flex-center">
          <h3 className="card-heading">Asset Allocation by Sector</h3>
          {pieData.length > 0 ? (
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Valuation']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                    <span className="legend-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-chart-state text-muted">
              <p>No asset allocation data. Add holdings in TradingView or click Demo Login to seed portfolio.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Active Portfolio Stocks Card */}
      <div className="dashboard-holdings-list glass-card">
        <div className="list-card-header">
          <h3 className="card-heading">Portfolio Asset Allocation Breakdown</h3>
          <button onClick={() => setActivePage('holdings')} className="btn-link">
            <span>View All Holdings</span>
            <ChevronRight size={16} />
          </button>
        </div>
        
        {Object.keys(holdings).length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Equity</th>
                  <th>Quantity</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Invested Value</th>
                  <th>Current Value</th>
                  <th>Total P&L</th>
                  <th>Action</th>
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
                      <td className="font-semibold">₹{livePrice.toFixed(2)}</td>
                      <td>₹{invVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="font-semibold">₹{curVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className={`font-semibold ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        <div className="pnl-cell">
                          <span>₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="pnl-pct-small">({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                        </div>
                      </td>
                      <td>
                        <button 
                          onClick={() => handlePredictClick(stock.symbol)} 
                          className="btn-secondary btn-action-small"
                          title="Run AI price predictions for this stock"
                        >
                          Predict Stock Price
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-holdings-list text-muted">
            <p>You do not have any holdings currently. Click **Demo Quick Login** to auto-populate or buy stocks in **TradingView**!</p>
          </div>
        )}
      </div>
    </div>
  );
}
