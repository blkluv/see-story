import React from 'react';

const ItemCard = ({ item, onPlayStory }) => {
  const handleClick = () => {
    // In a real app, this would navigate to the item detail page
    console.log('Clicked item:', item.title);
  };

  const handlePlayClick = (e) => {
    e.stopPropagation(); // Prevent card click
    
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
    <div className="item-card" onClick={handleClick}>
      <img
        src={item.imageUrl}
        alt={item.title}
        className="item-image"
        loading="lazy"
      />
      <div className="item-overlay">
        <div className="item-content">
          <div className="item-title">{item.title}</div>
          <div className="item-info">
            <div className="item-rating">★ {item.rating}</div>
            <div>{item.year} • {item.duration}</div>
            <div>{item.genre}</div>
          </div>
        </div>
        {onPlayStory && (
          <button 
            className={`item-play-btn ${!isPlayable(item) ? 'disabled' : ''}`}
            onClick={handlePlayClick}
            disabled={!isPlayable(item)}
          >
            <span>{isPlayable(item) ? '▶' : '⏳'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
