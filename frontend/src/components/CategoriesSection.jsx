import React from 'react';
import CategoryRow from './CategoryRow';

const CategoriesSection = ({ categories, onPlayStory }) => {
  if (!categories || categories.length === 0) {
    return (
      <section className="categories-section">
        <div className="loading">Loading categories...</div>
      </section>
    );
  }

  return (
    <section className="categories-section">
      {categories.map((category) => (
        <div key={category.id} className="category">
          <h2 className="category-title">{category.name}</h2>
          <CategoryRow items={category.items} onPlayStory={onPlayStory} />
        </div>
      ))}
    </section>
  );
};

export default CategoriesSection;
