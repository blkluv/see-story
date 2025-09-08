const path = require('path');

// Server configuration
const PORT = process.env.PORT || 5000;

// File paths
const STORIES_DIR = path.join(__dirname, '..', 'stories');

// Categories configuration
const CATEGORIES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War',
  'Western', 'Biography', 'Sport', 'Musical', 'Short', 'News',
  'Reality', 'Talk Show', 'Game Show', 'Variety', 'Educational', 'Travel'
];

// Mock data configuration
const MOCK_FEATURED_TITLES = [
  'Epic Adventure', 'Midnight Mystery', 'Ocean Dreams', 'City Lights', 'Forest Tales',
  'Desert Storm', 'Mountain Quest', 'Space Odyssey', 'Time Traveler', 'Lost Kingdom'
];

const MOCK_CATEGORY_TITLES = [
  'The Beginning', 'Second Chapter', 'Final Hour', 'New Dawn', 'Dark Night',
  'Bright Future', 'Hidden Secret', 'True Story', 'Wild Adventure', 'Silent Voice',
  'Golden Age', 'Silver Screen', 'Crystal Clear', 'Diamond Heart', 'Ruby Red',
  'Emerald Eyes', 'Sapphire Sky', 'Pearl Wisdom', 'Amber Light', 'Jade Path',
  'Copper Dream', 'Iron Will', 'Steel Courage', 'Bronze Medal', 'Platinum Star',
  'Titanium Force', 'Carbon Copy', 'Neon Nights', 'Electric Blue', 'Magnetic Field'
];

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Documentary'
];

// AI configuration
const ENTITY_CATEGORIES = [
  'CHARACTERS', 'LOCATIONS', 'OBJECTS', 'ACTIONS', 'EMOTIONS', 'CONCEPTS'
];

// Story validation constants
const MIN_SCENE_CONTENT_LENGTH = 10;
const TARGET_SCENES_COUNT = 10;
const TARGET_FEATURED_ITEMS = 10;
const ITEMS_PER_CATEGORY = 30;

// API endpoints
const API_ENDPOINTS = {
  FEATURED: '/api/featured',
  CATEGORIES: '/api/categories',
  STORIES: '/api/stories',
  AUDIO: '/api/audio'
};

// File configuration
const FILE_VERSION = "2.0";
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

module.exports = {
  PORT,
  STORIES_DIR,
  CATEGORIES,
  MOCK_FEATURED_TITLES,
  MOCK_CATEGORY_TITLES,
  GENRES,
  ENTITY_CATEGORIES,
  MIN_SCENE_CONTENT_LENGTH,
  TARGET_SCENES_COUNT,
  TARGET_FEATURED_ITEMS,
  ITEMS_PER_CATEGORY,
  API_ENDPOINTS,
  FILE_VERSION,
  SUPPORTED_IMAGE_TYPES
};
