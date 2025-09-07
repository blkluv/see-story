import React, { useState, useEffect, useCallback, useRef } from 'react';

const FeaturedSection = ({ items, onPlayStory }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const autoPlayIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);

  // Auto-advance logic
  useEffect(() => {
    if (items.length === 0 || !isAutoPlaying) return;

    autoPlayIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(autoPlayIntervalRef.current);
  }, [items.length, isAutoPlaying]);

  // Handle user interaction - pause auto-play and start inactivity timer
  const handleUserInteraction = useCallback(() => {
    setUserInteracted(true);
    setIsAutoPlaying(false);
    
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // Start new 1-minute inactivity timer
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
      setUserInteracted(false);
    }, 60000); // 1 minute = 60000ms
    
  }, []);

  // Manual navigation functions
  const goToPrevious = useCallback(() => {
    handleUserInteraction();
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  }, [items.length, handleUserInteraction]);

  const goToNext = useCallback(() => {
    handleUserInteraction();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length, handleUserInteraction]);

  const goToIndex = useCallback((index) => {
    handleUserInteraction();
    setCurrentIndex(index);
  }, [handleUserInteraction]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  const handlePlayClick = (item) => {
    // Check if the story has generated scenes and images before playing
    if (item.generatedStory && 
        item.generatedStory.scenes && 
        item.generatedStory.scenes.length > 0) {
      onPlayStory('player', item);
    } else {
      alert('This story is still being generated. Please try again in a moment.');
    }
  };

  const isPlayable = (item) => {
    return item.generatedStory && 
           item.generatedStory.scenes && 
           item.generatedStory.scenes.length > 0;
  };

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
                <button 
                  className={`btn btn-play ${!isPlayable(item) ? 'disabled' : ''}`}
                  onClick={() => handlePlayClick(item)}
                  disabled={!isPlayable(item)}
                >
                  <span>{isPlayable(item) ? '▶' : '⏳'}</span>
                  {isPlayable(item) ? 'Play' : 'Generating...'}
                </button>
                <button className="btn btn-info">
                  <span>ℹ</span>
                  More Info
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button 
              className="featured-nav-arrow featured-nav-left"
              onClick={goToPrevious}
              aria-label="Previous featured item"
            >
              &#8249;
            </button>
            <button 
              className="featured-nav-arrow featured-nav-right"
              onClick={goToNext}
              aria-label="Next featured item"
            >
              &#8250;
            </button>
          </>
        )}

        {/* Status Indicator */}
        {userInteracted && (
          <div className="featured-status">
            <span className="status-text">Auto-play paused • Resumes in 1 minute</span>
          </div>
        )}
      </div>

      {/* Dot Indicators */}
      {items.length > 1 && (
        <div className="featured-indicators">
          {items.map((_, index) => (
            <button
              key={index}
              className={`featured-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToIndex(index)}
              aria-label={`Go to featured item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FeaturedSection;
