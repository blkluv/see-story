# SeeStory - Netflix-like Interface

A Netflix-inspired web application with a modern interface featuring a hero section and horizontally scrolling content categories.

## Features

- **Featured Section**: Auto-rotating hero banner with 10 featured items
- **30 Categories**: Each containing 30 scrollable items
- **Netflix-like UI**: Dark theme, smooth transitions, and responsive design
- **Mock API**: Express.js backend serving realistic mock data
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend**: Express.js with CORS
- **Styling**: Pure CSS with Netflix-inspired design
- **Data**: Mock API with randomly generated content

## Quick Start

### Option 1: Run Both Frontend and Backend Together
```bash
# Install dependencies for both frontend and backend
npm run install-all

# Start both servers concurrently
npm run dev
```

### Option 2: Run Separately
```bash
# Terminal 1 - Backend (runs on http://localhost:5000)
cd backend
npm install
npm run dev

# Terminal 2 - Frontend (runs on http://localhost:3000)
cd frontend
npm install
npm run dev
```

## Project Structure

```
see-story/
├── backend/
│   ├── server.js          # Express API server
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Header.jsx
│   │   │   ├── FeaturedSection.jsx
│   │   │   ├── CategoriesSection.jsx
│   │   │   ├── CategoryRow.jsx
│   │   │   └── ItemCard.jsx
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # React entry point
│   │   ├── index.css      # Global styles
│   │   └── App.css        # App-specific styles
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
└── package.json           # Root package.json with scripts
```

## API Endpoints

- `GET /api/featured` - Returns 10 featured items for the hero section
- `GET /api/categories` - Returns all 30 categories with their items
- `GET /api/category/:id` - Returns a specific category by ID
- `GET /api/health` - Health check endpoint

## Features Implemented

✅ **Featured Hero Section**
- Auto-rotating carousel with 10 items
- Large backdrop images
- Play and More Info buttons
- Smooth transitions

✅ **Category Rows**
- 30 different categories
- 30 items per category
- Horizontal scrolling with arrow navigation
- Hover effects and smooth animations

✅ **Netflix-like Styling**
- Dark theme with Netflix color scheme
- Responsive design for all screen sizes
- Smooth hover effects and transitions
- Custom scrollbars

✅ **Mock API Backend**
- RESTful endpoints
- Realistic mock data with images from Picsum
- CORS enabled for frontend communication
- Error handling and health checks

## Customization

- **Images**: Uses Picsum Photos for placeholder images. Replace URLs in `backend/server.js` with your own image sources
- **Categories**: Modify the `categoryNames` array in `server.js` to change category names
- **Styling**: Edit `frontend/src/index.css` to customize the look and feel
- **Data**: Update the mock data generators in `server.js` to match your content structure

## Development

The project uses:
- **Vite** for fast frontend development with hot reload
- **Nodemon** for automatic backend restart on changes
- **Concurrently** to run both servers simultaneously
- **React 18** with modern hooks and functional components

Enjoy your Netflix-like storytelling platform! 🎬
