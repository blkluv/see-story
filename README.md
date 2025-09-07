# SeeStory - Netflix-like Interface

A Netflix-inspired web application with a modern interface featuring a hero section and horizontally scrolling content categories.

## Features

- **Featured Section**: Auto-rotating hero banner with 10 featured items (includes real user stories!)
- **30 Categories**: Each containing 30 scrollable items
- **Netflix-like UI**: Dark theme, smooth transitions, and responsive design
- **Story Creation**: Multi-character story creation with image embedding
- **AI Story Generation**: Automatic full story generation using Google Gemini AI
- **File Watcher**: Background processing that auto-generates stories from outlines
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

# Set up AI Story Generation (optional)
export GEMINI_API_KEY="your-actual-api-key-here"

# Start both servers concurrently
npm run dev
```

### Option 2: Run Separately
```bash
# Terminal 1 - Backend (runs on http://localhost:5000)
cd backend
npm install

# Set up AI Story Generation (optional)
export GEMINI_API_KEY="your-actual-api-key-here"

npm run dev

# Terminal 2 - Frontend (runs on http://localhost:3000)
cd frontend
npm install
npm run dev
```

## AI Story Generation Setup

To enable automatic story generation, you'll need a Google Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the environment template file:
   ```bash
   cd backend
   cp env.template .env
   ```
4. Edit the `.env` file and replace `your-actual-gemini-api-key-here` with your actual API key:
   ```bash
   GEMINI_API_KEY=AIzaSyYourActualAPIKeyHere
   ```
5. Restart your server

**Alternative**: Set the environment variable directly:
```bash
export GEMINI_API_KEY="your-actual-api-key-here"
```

Once configured, the system will automatically:
- Watch for new story submissions
- Generate complete 10-scene stories based on character outlines
- Save the generated stories back to the JSON files
- Display enhanced stories in the featured section

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

✅ **Enhanced Featured Hero Section**
- Auto-rotating carousel with 10 items (real stories + mock data)
- Uses actual user-created stories when available
- Large backdrop images with character names as titles
- Story outlines as descriptions

✅ **Multi-Character Story Creation**
- Add multiple characters with individual photos
- Dynamic form with add/remove character functionality
- Image download and base64 embedding
- Rich JSON storage format

✅ **AI Story Generation**
- Automatic file watching for new story submissions
- Google Gemini AI integration for story generation
- 10-scene structured story format
- Background processing without blocking main server

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

✅ **Enhanced API Backend**
- RESTful endpoints with story creation
- File-based storage with automatic directory creation
- Image processing and base64 conversion
- Error handling and comprehensive logging

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
