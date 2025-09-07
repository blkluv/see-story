import React, { useState, useEffect } from 'react';

const FeaturedSection = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [items.length]);

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <section className="featured-section">
      <div className="featured-carousel">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`featured-item ${index === currentIndex ? 'active' : ''}`}
          >
            <img
              src={item.backdropUrl}
              alt={item.title}
              className="featured-background"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className="featured-content">
              <h1 className="featured-title">{item.title}</h1>
              <p className="featured-description">{item.description}</p>
              <div className="featured-buttons">
                <button className="btn btn-play">
                  <span>▶</span>
                  Play
                </button>
                <button className="btn btn-info">
                  <span>ℹ</span>
                  More Info
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedSection;
