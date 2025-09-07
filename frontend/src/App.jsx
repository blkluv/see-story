import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FeaturedSection from './components/FeaturedSection';
import CategoriesSection from './components/CategoriesSection';
import CreateStoryForm from './components/CreateStoryForm';
import StoryPlayer from './components/StoryPlayer';
import './App.css';

function App() {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'create', or 'player'
  const [selectedStory, setSelectedStory] = useState(null);

  const handleNavigation = (view, storyData = null) => {
    setCurrentView(view);
    if (storyData) {
      setSelectedStory(storyData);
    }
    // Scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch featured items and categories in parallel
        const [featuredResponse, categoriesResponse] = await Promise.all([
          fetch('/api/featured'),
          fetch('/api/categories')
        ]);

        if (!featuredResponse.ok || !categoriesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const featuredData = await featuredResponse.json();
        const categoriesData = await categoriesResponse.json();

        setFeaturedItems(featuredData);
        setCategories(categoriesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if we're on home view and haven't loaded yet
    if (currentView === 'home' && featuredItems.length === 0 && categories.length === 0) {
      fetchData();
    }
  }, [currentView, featuredItems.length, categories.length]);

  const renderContent = () => {
    if (currentView === 'create') {
      return <CreateStoryForm />;
    }

    if (currentView === 'player' && selectedStory) {
      return <StoryPlayer story={selectedStory} onBack={() => handleNavigation('home')} />;
    }

    // Home view
    if (loading) {
      return <div className="loading">Loading your stories...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    return (
      <>
        <FeaturedSection items={featuredItems} onPlayStory={handleNavigation} />
        <CategoriesSection categories={categories} onPlayStory={handleNavigation} />
      </>
    );
  };

  return (
    <div className="app">
      <Header onCreateClick={handleNavigation} currentView={currentView} />
      {renderContent()}
    </div>
  );
}

export default App;
