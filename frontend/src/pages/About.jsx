import React from 'react';
import { Award, ShieldCheck, Cpu, Database, Activity, Code2, ArrowRight } from 'lucide-react';
import './About.css';

export default function About() {
  const steps = [
    {
      num: '01',
      title: 'Secure API Sync',
      desc: 'Encrypt and store credentials securely in your Firebase Realtime Database node to sync seamlessly with the Angel One official SmartConnect server.',
      icon: ShieldCheck,
      color: 'var(--color-primary)'
    },
    {
      num: '02',
      title: 'Concurrent Live Quotes',
      desc: 'Scrape Google Finance and index sectors using highly optimized multithreaded concurrent python models in under 2 seconds.',
      icon: Activity,
      color: 'var(--color-secondary)'
    },
    {
      num: '03',
      title: 'Deep Machine Learning Predictions',
      desc: 'Process historical daily candle data via getCandleData, computing SMA/EMA trend overlays and forecasting future boundaries.',
      icon: Cpu,
      color: 'var(--color-accent)'
    },
    {
      num: '04',
      title: 'Executive Portfolio Control',
      desc: 'Formulate trade limits, execute simulated orders, and view live hold returns and day returns on responsive, perfect layouts.',
      icon: Database,
      color: 'var(--color-gain)'
    }
  ];

  return (
    <div className="about-page-container">
      {/* 1. VISION SECTION */}
      <section className="about-hero-card glass-card">
        <div className="about-hero-glow"></div>
        <div className="about-hero-content">
          <div className="hero-icon-title">
            <Award size={36} className="title-icon gradient-text" />
            <h1 className="about-title">The Quantum Portfolio Vision</h1>
          </div>
          <p className="about-desc">
            QuantPortfolio was designed to bring structural, institutional-grade analytics to self-directed quantitative traders. We believe that professional portfolio management should be simple, high-performing, and non-custodial.
          </p>
          <p className="about-desc-sub text-muted">
            By connecting raw broker pipelines with real-time scraped quotes and Python mathematical models, we offer a sandboxed workspace that gives you instant clarity on your market risks and future opportunities.
          </p>
        </div>
      </section>

      {/* 2. STEPPER WORKFLOW PIPELINE */}
      <section className="about-pipeline-section">
        <h2 className="section-title text-center">Architectural Workflow Pipeline</h2>
        <p className="section-subtitle text-muted text-center">How our proprietary backend pipelines gather, predict, and present your data.</p>
        
        <div className="pipeline-steps-grid">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div key={idx} className="pipeline-card glass-card">
                <div className="pipeline-header">
                  <span className="pipeline-num" style={{ color: step.color }}>{step.num}</span>
                  <div className="pipeline-icon-circle" style={{ borderColor: step.color }}>
                    <IconComponent size={20} style={{ color: step.color }} />
                  </div>
                </div>
                <h3 className="pipeline-title">{step.title}</h3>
                <p className="pipeline-desc text-muted">{step.desc}</p>
                {idx < 3 && <ArrowRight size={24} className="pipeline-connector-arrow text-muted" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CORE DESIGN STATEMENT */}
      <section className="about-design-statement glass-card text-center">
        <Code2 size={40} className="statement-icon" />
        <h3 className="statement-title">Built with Pride by Engineers</h3>
        <p className="statement-desc text-muted">
          No boilerplate templates, no AI filler elements. We built a fast, glassmorphic layout governed purely by clean CSS token variables and highly responsive states so that your data always takes center stage.
        </p>
      </section>
    </div>
  );
}
