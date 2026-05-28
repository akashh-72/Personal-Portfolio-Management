import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import './Contact.css';

export default function Contact() {
  // Contact Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // FAQ Collapsible Accordion States
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

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
    },
    {
      q: 'Can I perform actual mock orders or trades inside the workspace?',
      a: 'Yes! The execution desk allows placing simulated Limit buy and sell orders. It calculates position values, validates them against your current cash balance, and saves live mock holdings to Firebase instantly.'
    }
  ];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    setIsLoading(true);
    // Simulate high-end backend email sync
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      
      // Hide success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 1200);
  };

  const toggleFaq = (index) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  return (
    <div className="contact-page-container">
      {/* SECTION WRAPPER: Form + Support Cards */}
      <div className="contact-section-split">
        {/* Left Side: Support Cards */}
        <div className="support-details-column">
          <div className="support-header-meta">
            <h1 className="contact-title text-left">Connect with Us</h1>
            <p className="contact-subtitle text-left text-muted">
              Have technical questions about our ML forecasting pipeline or Angel One integrations? Our developer operations team is here to help.
            </p>
          </div>

          <div className="support-cards-grid">
            <div className="support-card glass-card">
              <Mail size={18} className="support-card-icon color-prim" />
              <div className="support-card-content">
                <span className="support-card-label text-muted">Email Developer Support</span>
                <span className="support-card-val">devops@quantumportfolio.io</span>
              </div>
            </div>

            <div className="support-card glass-card">
              <Phone size={18} className="support-card-icon color-gain" />
              <div className="support-card-content">
                <span className="support-card-label text-muted">Direct Hotline Desk</span>
                <span className="support-card-val">+91 (22) 5078-4392</span>
              </div>
            </div>

            <div className="support-card glass-card">
              <MapPin size={18} className="support-card-icon color-acc" />
              <div className="support-card-content">
                <span className="support-card-label text-muted">Dev Headquaters</span>
                <span className="support-card-val">BKC FinTech Hub, Mumbai, IN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Contact Form */}
        <div className="contact-form-column">
          <div className="contact-form-card glass-card">
            <div className="form-title-row">
              <MessageSquare size={20} className="form-icon text-muted" />
              <h3 className="form-card-title">Send Secured Message</h3>
            </div>

            {isSubmitted && (
              <div className="form-success-box glowing-indicator">
                <CheckCircle2 size={16} className="success-icon" />
                <span>Message delivered successfully! We will follow up shortly.</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="contact-form-widget">
              <div className="form-group-unit">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Akash Patil" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required 
                />
              </div>

              <div className="form-group-unit">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. akash@gmail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required 
                />
              </div>

              <div className="form-group-unit">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. Forecasting Model Query" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group-unit">
                <label className="form-label">Message Details</label>
                <textarea 
                  rows={4}
                  placeholder="Tell us what you would like to know..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary form-submit-btn">
                {isLoading ? (
                  <span className="spinner-small"></span>
                ) : (
                  <>
                    <span>Submit Secured Ticket</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION FAQ: COLLAPSIBLE FAQ ACCORDION */}
      <section className="contact-faq-section">
        <h2 className="section-title text-center">Frequently Asked Questions</h2>
        <p className="section-subtitle text-muted text-center">Everything you need to know about the platform's security and integrations.</p>

        <div className="faq-accordion-list">
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
    </div>
  );
}
