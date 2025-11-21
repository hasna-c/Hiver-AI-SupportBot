import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PartC = () => {
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const sampleQueries = [
    "How do I configure automations in Hiver?",
    "Why is CSAT not appearing?",
    "How to fix email threading issues?",
    "Setting up SLA policies"
  ];

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await axios.get(`${API}/kb/articles`);
      setArticles(response.data);
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  };

  const initializeSampleKB = async () => {
    setInitLoading(true);
    try {
      const response = await axios.post(`${API}/kb/initialize-sample`);
      toast.success(response.data.message);
      loadArticles();
    } catch (error) {
      toast.error('Failed to initialize KB');
    } finally {
      setInitLoading(false);
    }
  };

  const queryKB = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/rag/query`, { query });
      setResult(response.data);
      toast.success('Query completed');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" richColors />
      <Navigation />
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title" data-testid="part-c-title">Part C: RAG Knowledge Base</h1>
          <p className="page-description">Semantic search and AI-powered answers from KB articles</p>
        </div>

        {articles.length === 0 && (
          <div className="section-card" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
            <p style={{ color: '#78350f', marginBottom: '1rem' }}>
              No KB articles found. Initialize sample knowledge base to get started.
            </p>
            <button
              className="btn btn-primary"
              onClick={initializeSampleKB}
              disabled={initLoading}
              data-testid="init-kb-btn"
            >
              {initLoading ? 'Initializing...' : 'Initialize Sample KB (10 Articles)'}
            </button>
          </div>
        )}

        <div className="two-col-grid">
          {/* Left Column - Query */}
          <div>
            <div className="section-card">
              <h3 className="section-title">Query Knowledge Base</h3>
              
              <div className="form-group">
                <label className="form-label">Your Question</label>
                <textarea
                  className="form-textarea"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about Hiver..."
                  rows={3}
                  data-testid="query-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>Sample Queries:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {sampleQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(q)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f7fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#edf2f7';
                        e.target.style.borderColor = '#cbd5e0';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#f7fafc';
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                      data-testid={`sample-query-${idx}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={queryKB}
                disabled={loading || articles.length === 0}
                data-testid="query-btn"
              >
                {loading ? 'Searching...' : 'Query KB'}
              </button>
            </div>

            {result && (
              <div className="section-card" style={{ marginTop: '1.5rem' }} data-testid="rag-result">
                <h3 className="section-title">Answer</h3>
                
                <div style={{
                  background: '#f7fafc',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  borderLeft: '4px solid #667eea',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ color: '#2d3748', lineHeight: 1.8 }}>{result.answer}</p>
                  <div className="confidence-meter" style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Confidence</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Retrieved Articles</h4>
                {result.retrieved_articles.map((article, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2d3748' }}>
                        {idx + 1}. {article.title}
                      </h5>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#ebf8ff',
                        color: '#2c5282',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {(article.similarity_score * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.5rem' }}>
                      Category: {article.category}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#4a5568', lineHeight: 1.6 }}>
                      {article.content.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - KB Articles */}
          <div>
            <div className="section-card">
              <h3 className="section-title">Knowledge Base ({articles.length} articles)</h3>
              
              {articles.length === 0 ? (
                <p style={{ color: '#718096', textAlign: 'center', padding: '2rem' }}>No articles available</p>
              ) : (
                <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
                  {articles.map((article, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        background: '#f7fafc',
                        borderRadius: '8px',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2d3748', marginBottom: '0.5rem' }}>
                        {article.title}
                      </h4>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        background: '#e6fffa',
                        color: '#234e52',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                      }}>
                        {article.category}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#4a5568', lineHeight: 1.6 }}>
                        {article.content.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Improvement Ideas */}
            <div className="section-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="section-title">Retrieval Improvements</h3>
              <div style={{ fontSize: '0.875rem', color: '#4a5568', lineHeight: 1.8 }}>
                <p><strong>1. Hybrid Search:</strong> Combine semantic + keyword search for better precision</p>
                <p><strong>2. Re-ranking:</strong> Use cross-encoder to re-rank top results</p>
                <p><strong>3. Query Expansion:</strong> Generate synonyms and related terms</p>
                <p><strong>4. Chunk Optimization:</strong> Split large articles into smaller, focused chunks</p>
                <p><strong>5. Metadata Filtering:</strong> Filter by category, recency, or user role before semantic search</p>
              </div>
            </div>

            {/* Failure Case Example */}
            <div className="section-card" style={{ marginTop: '1.5rem', background: '#fff5f5' }}>
              <h3 className="section-title" style={{ color: '#c53030' }}>Failure Case & Debugging</h3>
              <div style={{ fontSize: '0.875rem', color: '#742a2a', lineHeight: 1.8 }}>
                <p><strong>Scenario:</strong> Query "email not syncing" returns automation articles</p>
                <p><strong>Root Cause:</strong> Embedding similarity based on word overlap, not semantic meaning</p>
                <p><strong>Debug Steps:</strong></p>
                <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Check similarity scores - are they too low (&lt;0.3)?</li>
                  <li>Inspect retrieved article titles - do they match query intent?</li>
                  <li>Test query variations - does "sync issues" work better?</li>
                  <li>Review embedding model - try domain-specific model</li>
                  <li>Add synthetic examples to KB covering this query type</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartC;
