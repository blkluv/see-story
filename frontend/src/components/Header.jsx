import React, { useState, useEffect } from 'react';

const Header = ({ onCreateClick, currentView }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 100;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <a href="/" className="header-logo" onClick={(e) => { e.preventDefault(); onCreateClick('home'); }}>
        SeeStory
      </a>
      
      <nav className="header-nav">
        {currentView === 'home' ? (
          <button className="btn btn-create" onClick={() => onCreateClick('create')}>
            Create
          </button>
        ) : (
          <button className="btn btn-back" onClick={() => onCreateClick('home')}>
            ← Back to Home
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
