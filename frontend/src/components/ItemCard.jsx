import React from 'react';

const ItemCard = ({ item }) => {
  const handleClick = () => {
    // In a real app, this would navigate to the item detail page
    console.log('Clicked item:', item.title);
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
        <div className="item-title">{item.title}</div>
        <div className="item-info">
          <div className="item-rating">★ {item.rating}</div>
          <div>{item.year} • {item.duration}</div>
          <div>{item.genre}</div>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
