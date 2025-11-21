import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';

const Home = () => {
  const navigate = useNavigate();

  const parts = [
    {
      number: 'PART A',
      title: 'Email Tagging System',
      description: 'Customer-specific email classification with pattern learning',
      features: [
        'Customer isolation guarantee',
        'Pattern & anti-pattern support',
        'LLM-based classification',
        'Accuracy improvement tools'
      ],
      path: '/part-a'
    },
    {
      number: 'PART B',
      title: 'Sentiment Analysis',
      description: 'Prompt evaluation and systematic improvement',
      features: [
        'Sentiment classification',
        'Confidence scoring',
        'Prompt version comparison',
        'Batch testing capability'
      ],
      path: '/part-b'
    },
    {
      number: 'PART C',
      title: 'RAG Knowledge Base',
      description: 'Semantic search and AI-powered answers',
      features: [
        'Vector embeddings retrieval',
        'Confidence-scored answers',
        'Multiple article synthesis',
        'Query debugging tools'
      ],
      path: '/part-c'
    }
  ];

  return (
    <div>
      <Navigation />
      <div className="home-container">
        <div className="hero-section">
          <div className="assignment-badge">Hiver AI SupportBot</div>
          <h1 className="hero-title">AI-Powered Support Assistant</h1>
          <p className="hero-subtitle">
            Demonstrating email tagging, sentiment analysis, and knowledge base RAG
          </p>
        </div>

        <div className="parts-grid">
          {parts.map((part, index) => (
            <div
              key={index}
              className="part-card"
              onClick={() => navigate(part.path)}
              data-testid={`${part.number.toLowerCase().replace(' ', '-')}-card`}
            >
              <div className="part-number">{part.number}</div>
              <h2 className="part-title">{part.title}</h2>
              <p className="part-description">{part.description}</p>
              <ul className="part-features">
                {part.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <button className="explore-btn" data-testid={`explore-${part.number.toLowerCase().replace(' ', '-')}-btn`}>
                Explore →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
