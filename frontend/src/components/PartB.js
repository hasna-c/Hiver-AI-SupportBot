import React, { useState } from 'react';
import Navigation from './Navigation';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PartB = () => {
  const [emailText, setEmailText] = useState('');
  const [promptVersion, setPromptVersion] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const testEmails = [
    "Hi team, I'm unable to access the shared mailbox. It keeps showing a permissions error.",
    "We created a rule to auto-assign emails but it stopped working since yesterday.",
    "Your automation engine is creating 2 tasks for every email. This started after we edited our workflow.",
    "We were charged incorrectly this month. Need a corrected invoice.",
    "CSAT scores disappeared from our dashboard today. Is there an outage?",
    "Opening a conversation takes 8–10 seconds. This is affecting our productivity.",
    "We want to configure SLAs for different customer tiers. Can someone guide us?",
    "Mail merge is not sending emails even though the CSV is correct.",
    "Dark mode would help during late-night support hours. Please consider this.",
    "Trying to add a new team member but getting an 'authorization required' error."
  ];

  const analyzeSentiment = async () => {
    if (!emailText.trim()) {
      toast.error('Please enter email text');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/sentiment/analyze?version=${promptVersion}`,
        { email_text: emailText }
      );
      setResult(response.data);
      toast.success('Sentiment analyzed');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runBatchTest = async () => {
    setBatchLoading(true);
    try {
      const response = await axios.post(
        `${API}/sentiment/test-batch?version=${promptVersion}`,
        testEmails
      );
      setBatchResults(response.data);
      toast.success('Batch test completed');
    } catch (error) {
      toast.error('Batch test failed');
    } finally {
      setBatchLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: '#48bb78',
      negative: '#f56565',
      neutral: '#4299e1'
    };
    return colors[sentiment.toLowerCase()] || '#718096';
  };

  const getSentimentBadgeClass = (sentiment) => {
    const classes = {
      positive: 'tag-positive',
      negative: 'tag-negative',
      neutral: 'tag-neutral'
    };
    return classes[sentiment.toLowerCase()] || '';
  };

  return (
    <div>
      <Toaster position="top-right" richColors />
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title" data-testid="part-b-title">Part B: Sentiment Analysis</h1>
          <p className="page-description">Prompt evaluation and systematic improvement</p>
        </div>

        <div className="two-col-grid">
          {/* Left Column - Single Test */}
          <div>
            <div className="section-card">
              <h3 className="section-title">Analyze Email Sentiment</h3>
              
              <div className="form-group">
                <label className="form-label">Prompt Version</label>
                <select
                  className="form-select"
                  value={promptVersion}
                  onChange={(e) => setPromptVersion(parseInt(e.target.value))}
                  data-testid="prompt-version-select"
                >
                  <option value={1}>Version 1 (Basic)</option>
                  <option value={2}>Version 2 (Improved)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Text</label>
                <textarea
                  className="form-textarea"
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="Enter email text to analyze..."
                  rows={6}
                  data-testid="email-text-input"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={analyzeSentiment}
                disabled={loading}
                data-testid="analyze-btn"
              >
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>

              {result && (
                <div className="result-card" data-testid="sentiment-result">
                  <h4 className="result-title">Analysis Result</h4>
                  <div className="result-item">
                    <span className="result-label">Sentiment:</span>
                    <span className={`tag ${getSentimentBadgeClass(result.sentiment)}`}>
                      {result.sentiment.toUpperCase()}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Confidence:</span>
                    <span className="result-value">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="confidence-meter">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${result.confidence * 100}%`,
                          background: getSentimentColor(result.sentiment)
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <span className="result-label">Reasoning:</span>
                    <p style={{ marginTop: '0.5rem', color: '#4a5568', lineHeight: 1.6 }}>
                      {result.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Comparison */}
            <div className="section-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="section-title">Prompt Versions</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#667eea', marginBottom: '0.5rem' }}>
                  VERSION 1 - Basic Approach
                </h4>
                <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem', color: '#4a5568' }}>
                  <strong>Issues:</strong>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                    <li>Treats all problem reports as negative</li>
                    <li>Misclassifies polite help requests</li>
                    <li>Doesn't distinguish feature requests from complaints</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#48bb78', marginBottom: '0.5rem' }}>
                  VERSION 2 - Improved
                </h4>
                <div style={{ background: '#f0fff4', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem', color: '#2f855a' }}>
                  <strong>Improvements:</strong>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                    <li>Analyzes explicit emotion words</li>
                    <li>Considers issue severity context</li>
                    <li>Distinguishes tone (polite vs. urgent)</li>
                    <li>Better handling of support context</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Batch Test */}
          <div>
            <div className="section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Batch Testing</h3>
                <button
                  className="btn btn-secondary"
                  onClick={runBatchTest}
                  disabled={batchLoading}
                  data-testid="batch-test-btn"
                >
                  {batchLoading ? 'Running...' : 'Run Batch Test'}
                </button>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
                Test {promptVersion === 1 ? 'Version 1' : 'Version 2'} on 10 sample emails
              </p>

              {batchResults && (
                <div data-testid="batch-results">
                  <div style={{
                    background: '#f7fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#48bb78' }}>
                        {batchResults.results.filter(r => r.sentiment === 'positive').length}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>Positive</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f56565' }}>
                        {batchResults.results.filter(r => r.sentiment === 'negative').length}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>Negative</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4299e1' }}>
                        {batchResults.results.filter(r => r.sentiment === 'neutral').length}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>Neutral</div>
                    </div>
                  </div>

                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {batchResults.results.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          marginBottom: '0.75rem',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                          {result.email}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`tag ${getSentimentBadgeClass(result.sentiment)}`}>
                            {result.sentiment}
                          </span>
                          <span style={{ fontSize: '0.875rem', color: '#718096' }}>
                            {(result.confidence * 100).toFixed(0)}% confident
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          {result.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Methodology */}
            <div className="section-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="section-title">Systematic Evaluation</h3>
              <div style={{ fontSize: '0.875rem', color: '#4a5568', lineHeight: 1.8 }}>
                <p><strong>1. Define Test Cases:</strong> Create diverse email samples covering edge cases</p>
                <p><strong>2. Manual Ground Truth:</strong> Label expected sentiments based on context</p>
                <p><strong>3. Batch Testing:</strong> Run both prompt versions on same dataset</p>
                <p><strong>4. Compare Results:</strong> Analyze differences in classification</p>
                <p><strong>5. Error Analysis:</strong> Identify patterns in misclassifications</p>
                <p><strong>6. Iterate Prompt:</strong> Refine based on specific failure modes</p>
                <p><strong>7. Measure Metrics:</strong> Track accuracy, consistency, confidence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartB;
