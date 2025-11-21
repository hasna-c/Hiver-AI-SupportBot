import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PartA = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [emails, setEmails] = useState([]);
  const [patterns, setPatterns] = useState({ patterns: [], anti_patterns: [] });
  const [loading, setLoading] = useState(false);

  // Prediction form
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [prediction, setPrediction] = useState(null);

  // Pattern form
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [patternType, setPatternType] = useState('pattern');
  const [patternDesc, setPatternDesc] = useState('');
  const [patternKeywords, setPatternKeywords] = useState('');
  const [patternTag, setPatternTag] = useState('');

  useEffect(() => {
    loadCustomers();
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerData(selectedCustomer);
    }
  }, [selectedCustomer]);

  const initializeData = async () => {
    try {
      const smallDataset = [
        { email_id: 1, customer_id: "CUST_A", subject: "Unable to access shared mailbox", body: "Hi team, I'm unable to access the shared mailbox for our support team. It keeps showing a permissions error. Can you please check?", tag: "access_issue" },
        { email_id: 2, customer_id: "CUST_A", subject: "Rules not working", body: "We created a rule to auto-assign emails based on subject line but it stopped working since yesterday.", tag: "workflow_issue" },
        { email_id: 3, customer_id: "CUST_A", subject: "Email stuck in pending", body: "One of our emails is stuck in pending even after marking it resolved. Not sure what's happening.", tag: "status_bug" },
        { email_id: 4, customer_id: "CUST_B", subject: "Automation creating duplicate tasks", body: "Your automation engine is creating 2 tasks for every email. This started after we edited our workflow.", tag: "automation_bug" },
        { email_id: 5, customer_id: "CUST_B", subject: "Tags missing", body: "Many of our tags are not appearing for new emails. Looks like the tagging model is not working for us.", tag: "tagging_issue" },
        { email_id: 6, customer_id: "CUST_B", subject: "Billing query", body: "We were charged incorrectly this month. Need a corrected invoice.", tag: "billing" },
        { email_id: 7, customer_id: "CUST_C", subject: "CSAT not visible", body: "CSAT scores disappeared from our dashboard today. Is there an outage?", tag: "analytics_issue" },
        { email_id: 8, customer_id: "CUST_C", subject: "Delay in email loading", body: "Opening a conversation takes 8–10 seconds. This is affecting our productivity.", tag: "performance" },
        { email_id: 9, customer_id: "CUST_C", subject: "Need help setting up SLAs", body: "We want to configure SLAs for different customer tiers. Can someone guide us?", tag: "setup_help" },
        { email_id: 10, customer_id: "CUST_D", subject: "Mail merge failing", body: "Mail merge is not sending emails even though the CSV is correct.", tag: "mail_merge_issue" },
        { email_id: 11, customer_id: "CUST_D", subject: "Can't add new user", body: "Trying to add a new team member but getting an 'authorization required' error.", tag: "user_management" },
        { email_id: 12, customer_id: "CUST_D", subject: "Feature request: Dark mode", body: "Dark mode would help during late-night support hours. Please consider this.", tag: "feature_request" }
      ];

      const response = await axios.post(`${API}/emails/bulk`, smallDataset);
      if (response.data.count > 0) {
        toast.success('Dataset initialized successfully');
      }
    } catch (error) {
      // Data might already exist
      console.log('Data initialization:', error.response?.data?.detail || error.message);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data.customers);
      if (response.data.customers.length > 0) {
        setSelectedCustomer(response.data.customers[0]);
      }
    } catch (error) {
      toast.error('Failed to load customers');
    }
  };

  const loadCustomerData = async (customerId) => {
    try {
      const [emailsRes, patternsRes] = await Promise.all([
        axios.get(`${API}/emails?customer_id=${customerId}`),
        axios.get(`${API}/patterns/${customerId}`)
      ]);
      setEmails(emailsRes.data);
      setPatterns(patternsRes.data);
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const predictTag = async () => {
    if (!subject || !body) {
      toast.error('Please enter both subject and body');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/tag/predict`, {
        customer_id: selectedCustomer,
        subject,
        body
      });
      setPrediction(response.data);
      toast.success('Tag predicted successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const addPattern = async () => {
    if (!patternDesc || !patternKeywords) {
      toast.error('Please fill all pattern fields');
      return;
    }

    try {
      await axios.post(`${API}/patterns`, {
        customer_id: selectedCustomer,
        pattern_type: patternType,
        description: patternDesc,
        keywords: patternKeywords.split(',').map(k => k.trim()),
        target_tag: patternTag || null
      });
      toast.success('Pattern added successfully');
      setShowPatternForm(false);
      setPatternDesc('');
      setPatternKeywords('');
      setPatternTag('');
      loadCustomerData(selectedCustomer);
    } catch (error) {
      toast.error('Failed to add pattern');
    }
  };

  return (
    <div>
      <Toaster position="top-right" richColors />
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title" data-testid="part-a-title">Part A: Email Tagging System</h1>
          <p className="page-description">Customer-isolated email classification with pattern learning</p>
        </div>

        <div className="two-col-grid">
          {/* Left Column - Prediction */}
          <div>
            <div className="section-card">
              <h3 className="section-title">Predict Email Tag</h3>
              
              <div className="form-group">
                <label className="form-label">Customer</label>
                <select
                  className="form-select"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  data-testid="customer-select"
                >
                  {customers.map(customer => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  data-testid="subject-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Body</label>
                <textarea
                  className="form-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email body"
                  rows={5}
                  data-testid="body-textarea"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={predictTag}
                disabled={loading}
                data-testid="predict-btn"
              >
                {loading ? 'Predicting...' : 'Predict Tag'}
              </button>

              {prediction && (
                <div className="result-card" data-testid="prediction-result">
                  <h4 className="result-title">Prediction Result</h4>
                  <div className="result-item">
                    <span className="result-label">Predicted Tag:</span>
                    <span className="result-value">{prediction.predicted_tag}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Confidence:</span>
                    <span className="result-value">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="confidence-meter">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <span className="result-label">Reasoning:</span>
                    <p style={{ marginTop: '0.5rem', color: '#4a5568' }}>{prediction.reasoning}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Training Data */}
            <div className="section-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="section-title">Training Data ({emails.length} emails)</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {emails.map((email) => (
                  <div
                    key={email.email_id}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: '#f7fafc',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{email.subject}</div>
                    <div style={{ color: '#718096', fontSize: '0.8rem' }}>{email.body.substring(0, 80)}...</div>
                    <span className="tag" style={{ marginTop: '0.5rem', display: 'inline-block' }}>{email.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Patterns */}
          <div>
            <div className="section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Patterns & Anti-Patterns</h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPatternForm(!showPatternForm)}
                  data-testid="add-pattern-btn"
                >
                  {showPatternForm ? 'Cancel' : '+ Add Pattern'}
                </button>
              </div>

              {showPatternForm && (
                <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={patternType}
                      onChange={(e) => setPatternType(e.target.value)}
                      data-testid="pattern-type-select"
                    >
                      <option value="pattern">Pattern (Helpful Signal)</option>
                      <option value="anti_pattern">Anti-Pattern (Misleading)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-input"
                      value={patternDesc}
                      onChange={(e) => setPatternDesc(e.target.value)}
                      placeholder="e.g., Emails mentioning 'permission denied' are access issues"
                      data-testid="pattern-desc-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={patternKeywords}
                      onChange={(e) => setPatternKeywords(e.target.value)}
                      placeholder="permission, access, denied"
                      data-testid="pattern-keywords-input"
                    />
                  </div>

                  {patternType === 'pattern' && (
                    <div className="form-group">
                      <label className="form-label">Target Tag (optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={patternTag}
                        onChange={(e) => setPatternTag(e.target.value)}
                        placeholder="access_issue"
                        data-testid="pattern-tag-input"
                      />
                    </div>
                  )}

                  <button className="btn btn-success" onClick={addPattern} data-testid="save-pattern-btn">
                    Save Pattern
                  </button>
                </div>
              )}

              {/* Display Patterns */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', color: '#48bb78' }}>
                  Patterns ({patterns.patterns.length})
                </h4>
                {patterns.patterns.length === 0 ? (
                  <p style={{ color: '#718096', fontSize: '0.875rem' }}>No patterns added yet</p>
                ) : (
                  patterns.patterns.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        background: '#f0fff4',
                        borderLeft: '3px solid #48bb78',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{p.description}</div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                        Keywords: {p.keywords.join(', ')}
                        {p.target_tag && ` → ${p.target_tag}`}
                      </div>
                    </div>
                  ))
                )}

                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', color: '#f56565' }}>
                  Anti-Patterns ({patterns.anti_patterns.length})
                </h4>
                {patterns.anti_patterns.length === 0 ? (
                  <p style={{ color: '#718096', fontSize: '0.875rem' }}>No anti-patterns added yet</p>
                ) : (
                  patterns.anti_patterns.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        background: '#fff5f5',
                        borderLeft: '3px solid #f56565',
                        borderRadius: '4px',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{p.description}</div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                        Misleading: {p.keywords.join(', ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Customer Isolation Info */}
            <div className="section-card" style={{ marginTop: '1.5rem', background: '#ebf8ff' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Customer Isolation</h4>
              <p style={{ fontSize: '0.875rem', color: '#2c5282', lineHeight: 1.6 }}>
                ✓ Tags are strictly customer-specific<br />
                ✓ Model only sees {selectedCustomer}'s training data<br />
                ✓ Patterns don't leak across customers<br />
                ✓ Each customer has independent tag vocabulary
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartA;
