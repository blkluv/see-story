# SeeStory - AI-Powered Interactive Storytelling Platform

A Netflix-inspired multimedia storytelling platform that generates complete interactive stories with AI-generated scenes, images, and audio narration.

## 🎬 What SeeStory Does

SeeStory transforms simple character outlines into rich, multimedia stories with:

- **📖 Full Story Generation**: AI creates complete 10-scene narratives from character descriptions
- **🖼️ Scene Images**: Automatically generated images for each story scene using character likenesses
- **🎵 Audio Narration**: High-quality text-to-speech audio for complete story playback
- **🎭 Entity Extraction**: Intelligent extraction of characters, objects, locations, and emotions
- **🎮 Interactive Player**: Netflix-style interface with full audio controls and scene navigation
- **🔄 Smart Processing**: Background file watching with automatic content generation
- **⚡ Regeneration Controls**: Force complete story regeneration when needed

## 🎯 Core Features

### Story Creation & AI Generation
- **Multi-character story creation** with photo upload and character descriptions
- **Google Gemini AI integration** for intelligent story generation
- **Structured 10-scene format** with coherent narrative flow
- **Background processing** that doesn't block the main interface

### Multimedia Content Generation
- **Scene-by-scene image generation** using character reference images
- **High-quality audio narration** with Gemini TTS (voice: Enceladus)
- **Entity extraction** for characters, locations, objects, actions, emotions, and concepts
- **Audio concatenation** with overlap prevention for seamless playback

### Interactive Story Player
- **Netflix-style interface** with featured stories and categories
- **Full audio controls** with play/pause, seek, and scene navigation
- **Visual scene display** with synchronized images and audio
- **Story regeneration controls** for content refresh

### Advanced Processing System
- **File-watching service** for automatic story processing
- **Incremental updates** that preserve existing content
- **Story validation** with completeness checking
- **Separate server and watcher processes** for optimal performance

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **Modern CSS** with Netflix-inspired dark theme
- **Responsive design** for desktop and mobile
- **Audio controls** with custom player interface

### Backend
- **Node.js & Express** RESTful API server
- **Google Gemini AI** for story and image generation
- **Gemini TTS** for high-quality audio narration
- **FFmpeg** for audio processing and concatenation
- **Chokidar** file watcher for background processing

### Processing Pipeline
- **Story validation** and completeness checking
- **Multi-stage content generation** (scenes → entities → images → audio)
- **File-based audio concatenation** for seamless playback
- **Automatic cleanup** of temporary files

## 🤖 Gemini AI Integration

SeeStory leverages multiple Google Gemini models for comprehensive multimedia story generation:

**Image Generation**: The core visual content uses **Gemini 2.5 Flash Image Preview (nano banana)** for creating scene-specific images. This model excels at generating consistent character appearances using reference photos, creating cinematic scene compositions, and maintaining visual continuity across the 10-scene narrative structure.

**Text Generation**: Story creation and entity extraction utilize **Gemini 1.5 Flash** for rapid, coherent narrative generation. This model handles structured JSON output for stories, character development, and intelligent scene progression.

**Text-to-Speech**: Audio narration employs **Gemini 2.5 Pro Preview TTS** with the Enceladus voice model, producing natural, engaging speech synthesis that brings stories to life with professional-quality audio.

The integration uses streaming responses for real-time processing, reference image conditioning for character consistency, and multi-modal prompting to ensure all generated content aligns with the story's narrative and visual themes.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- FFmpeg (for audio processing)
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd see-story

# Install all dependencies (frontend + backend)
npm run install-all

# Set up environment variables
cd backend
cp env.template .env
# Edit .env and add your GEMINI_API_KEY
```

### Running the Application

```bash
# Start both backend server and story watcher
cd backend
npm run dev

# In a new terminal, start the frontend
cd frontend  
npm run dev
```

This will start:
- **Backend API server** on `http://localhost:5000`
- **Story watcher service** for background processing  
- **Frontend interface** on `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create `backend/.env` with:

```bash
# Required: Google Gemini API Key
GEMINI_API_KEY=your-actual-gemini-api-key-here

# Optional: TTS Configuration
GEMINI_TTS_MODEL=gemini-2.5-pro-preview-tts
GEMINI_TTS_VOICE=Enceladus
GEMINI_TTS_TEMPERATURE=0.7

# Optional: Processing Settings
TEST_MODE=false
PROCESSING_ENABLED=true
```

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it to your `.env` file
4. Restart the backend server

## 📁 Project Structure

```
see-story/
├── backend/
│   ├── server.js                 # Main API server
│   ├── story-watcher.js          # Background file watcher
│   ├── nodemon.json             # Development configuration
│   ├── ai/
│   │   ├── gemini.js            # Story & image generation
│   │   └── tts.js               # Audio generation & processing
│   ├── processing/
│   │   └── storyProcessor.js    # Story validation & processing
│   ├── utils/
│   │   └── fileUtils.js         # File operations & storage
│   ├── config/
│   │   └── constants.js         # App configuration
│   ├── stories/                 # Generated story files
│   └── audio_backend/           # Generated audio files
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── FeaturedSection.jsx
│   │   │   ├── CategoriesSection.jsx
│   │   │   ├── CreateStoryForm.jsx
│   │   │   ├── StoryPlayer.jsx
│   │   │   └── RegenerationControl.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
└── package.json                 # Root package with dev scripts
```

## 🔄 How Story Generation Works

1. **Story Creation**: User creates story with characters and photos
2. **File Detection**: Story watcher detects new story file
3. **Story Processing**: AI generates 10 coherent scenes
4. **Entity Extraction**: Extracts characters, objects, locations from each scene
5. **Image Generation**: Creates scene-specific images using character likenesses  
6. **Audio Generation**: Converts each scene to high-quality speech
7. **Audio Concatenation**: Merges scene audio into single playback file
8. **Story Completion**: Marks story as ready for interactive playback

## 🎮 Using the Story Player

1. **Browse Stories**: View featured stories in the Netflix-style interface
2. **Select Story**: Click on any story to open the player
3. **Audio Controls**: Play, pause, seek through the complete narration
4. **Scene Navigation**: See current scene with synchronized images
5. **Story Information**: View characters, descriptions, and metadata
6. **Regeneration**: Use controls to force complete story regeneration

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/featured` - Featured stories for homepage
- `GET /api/categories` - All story categories
- `GET /api/stories` - All available stories
- `POST /api/stories` - Create new story

### Story Management  
- `GET /api/stories/:id` - Get specific story details
- `PUT /api/stories/:id/regenerate` - Toggle regeneration flag
- `GET /api/audio/:storyId` - Stream story audio

### Utility Endpoints
- `GET /api/health` - Server health check
- `GET /api/status` - Processing status

## 🎨 Customization

### Styling
- Edit `frontend/src/index.css` for global styles
- Modify `frontend/src/App.css` for component-specific styles
- Netflix dark theme with customizable colors

### AI Configuration
- Adjust story generation prompts in `backend/ai/gemini.js`
- Configure TTS settings in `backend/ai/tts.js`
- Modify processing pipeline in `backend/processing/storyProcessor.js`

### Audio Settings
- Change TTS voice and model in environment variables
- Adjust audio quality settings in TTS configuration
- Modify concatenation method in audio processing

## 🛠️ Development

### Development Commands
```bash
# Backend development (with auto-restart)
cd backend && npm run dev

# Frontend development (with hot reload)  
cd frontend && npm run dev

# Install all dependencies
npm run install-all

# Backend only
cd backend && npm run dev:server

# Story watcher only  
cd backend && npm run dev:watcher
```

### Development Features
- **Nodemon** auto-restart for backend changes
- **File watching** excluded from server restarts
- **Hot reload** for frontend development
- **Background processing** for story generation
- **Comprehensive logging** for debugging

## 🎯 Story Quality Features

- **Coherent narratives** with character consistency
- **High-quality images** using character reference photos
- **Professional audio** with natural speech synthesis
- **Rich metadata** with extracted story elements
- **Validation system** ensuring complete story generation
- **Incremental processing** for efficient updates

## 🔍 Troubleshooting

### Common Issues

**Stories not generating:**
- Check Gemini API key in `.env` file
- Verify internet connection
- Check backend logs for API errors

**Audio playback issues:**
- Ensure FFmpeg is installed and in PATH
- Check audio file permissions
- Verify story has completed processing

**Frontend not connecting:**
- Confirm backend is running on port 5000
- Check for CORS configuration
- Verify API endpoint URLs

## 🎉 What Makes SeeStory Special

- **Complete automation** from character outline to playable story
- **Multimedia experience** with synchronized audio, images, and text
- **Professional quality** AI-generated content 
- **Netflix-style interface** for familiar user experience
- **Background processing** that doesn't interrupt user experience
- **Regeneration controls** for content refresh and experimentation
- **Modular architecture** for easy customization and extension

---

**Experience the future of interactive storytelling!** 🎬✨

Transform simple character ideas into rich, multimedia stories with professional narration, beautiful images, and engaging narratives - all powered by cutting-edge AI technology.