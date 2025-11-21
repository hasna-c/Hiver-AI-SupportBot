import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Home' },
    { path: '/part-a', label: 'Part A' },
    { path: '/part-b', label: 'Part B' },
    { path: '/part-c', label: 'Part C' }
  ];

  return (
    <nav className="nav-header">
      <div className="nav-content">
        <Link to="/" className="logo" data-testid="logo-link">Hiver AI</Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
