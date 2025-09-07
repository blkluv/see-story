import React, { useRef } from 'react';
import ItemCard from './ItemCard';

const CategoryRow = ({ items }) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 400; // Scroll by 400px
      const scrollLeft = container.scrollLeft;
      const targetScroll = direction === 'left' 
        ? scrollLeft - scrollAmount 
        : scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  if (!items || items.length === 0) {
    return <div>No items available</div>;
  }

  return (
    <div className="category-row">
      <button 
        className="nav-arrow left"
        onClick={() => scroll('left')}
        aria-label="Scroll left"
      >
        &#8249;
      </button>
      
      <div className="items-container" ref={scrollContainerRef}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      
      <button 
        className="nav-arrow right"
        onClick={() => scroll('right')}
        aria-label="Scroll right"
      >
        &#8250;
      </button>
    </div>
  );
};

export default CategoryRow;
