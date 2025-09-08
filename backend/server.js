require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import custom modules
const { 
  generateFeaturedItems,
  generateCategoryItems,
  readStoriesFromDirectory,
  saveStoryToFile,
  ensureStoriesDirectory
} = require('./utils/fileUtils');


const {
  PORT,
  STORIES_DIR,
  CATEGORIES,
  API_ENDPOINTS
} = require('./config/constants');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create stories directory if it doesn't exist
ensureStoriesDirectory(STORIES_DIR);

// API Routes
app.get(API_ENDPOINTS.FEATURED, (req, res) => {
  try {
    const featuredItems = generateFeaturedItems(STORIES_DIR);
    res.json(featuredItems);
  } catch (error) {
    console.error('Error generating featured items:', error);
    res.status(500).json({ error: 'Failed to generate featured items' });
  }
});

app.get(API_ENDPOINTS.CATEGORIES, (req, res) => {
  try {
    const categories = CATEGORIES.map((categoryName, index) => ({
      name: categoryName,
      items: generateCategoryItems(categoryName, index * 1000)
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('Error generating categories:', error);
    res.status(500).json({ error: 'Failed to generate categories' });
  }
});

// Audio endpoint to serve generated audio files
app.get(`${API_ENDPOINTS.AUDIO}/:storyId`, (req, res) => {
  const { storyId } = req.params;
  const audioPath = path.join(__dirname, 'audio_backend', `story_${storyId}.mp3`);
  
  console.log(`🎵 Audio request for story: ${storyId}`);
  
  // Check if audio file exists
  if (!fs.existsSync(audioPath)) {
    console.log(`❌ Audio file not found: ${audioPath}`);
    return res.status(404).json({ 
      error: 'Audio file not found',
      message: 'The audio for this story has not been generated yet or the story ID is invalid.',
      storyId: storyId
    });
  }
  
  console.log(`✅ Serving audio file: ${audioPath}`);
  
  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  // Stream the audio file
  const audioStream = fs.createReadStream(audioPath);
  audioStream.pipe(res);
  
  audioStream.on('error', (error) => {
    console.error('❌ Audio streaming error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Audio streaming failed' });
    }
  });
});

app.post(API_ENDPOINTS.STORIES, async (req, res) => {
  try {
    const { characters, storyOutline } = req.body;
    
    // Validate input
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ 
        error: 'Characters array is required and must not be empty' 
      });
    }
    
    if (!storyOutline || storyOutline.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Story outline is required' 
      });
    }

    // Validate each character
    for (const char of characters) {
      if (!char.name || char.name.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Each character must have a name' 
        });
      }
    }
    
    console.log(`📝 Processing story submission with ${characters.length} characters`);
    
    const story = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      characters: characters.map(char => ({
        name: char.name.trim(),
        photo: char.photo || null
      })),
      storyOutline: storyOutline.trim()
    };
    
    // Save story to file
    try {
      const filepath = await saveStoryToFile(story, STORIES_DIR);
      console.log('📝 New story saved to file:', filepath);
      console.log(`📊 Story contains ${story.characters.length} character(s):`, story.characters.map(c => c.name).join(', '));

      // Trigger background processing (don't wait for it)
      setTimeout(async () => {
        try {
          console.log('🚀 Starting background story processing...');
          const storyData = JSON.parse(require('fs').readFileSync(filepath, 'utf8'));
          await processStoryGranularlyWithCheck(storyData, filepath, {
            updateStoryWithGeneratedContent: require('./utils/fileUtils').updateStoryWithGeneratedContent,
            updateStoryIncremental: require('./utils/fileUtils').updateStoryIncremental
          });
        } catch (bgError) {
          console.error('❌ Background processing error:', bgError.message);
        }
      }, 1000);

      res.status(201).json({
        message: 'Story saved successfully!',
        story: {
          id: story.id,
          characterCount: story.characters.length,
          characters: story.characters.map(c => c.name),
          createdAt: story.createdAt
        }
      });

    } catch (fileError) {
      console.error('❌ Error saving story to file:', fileError.message);
      res.status(500).json({ 
        error: 'Failed to save story to file',
        details: fileError.message 
      });
    }

  } catch (error) {
    console.error('❌ Error processing story submission:', error.message);
    res.status(500).json({ 
      error: 'Failed to process story submission',
      details: error.message 
    });
  }
});

// Toggle regeneration flag for a story
app.put(`${API_ENDPOINTS.STORIES}/:storyId/regenerate`, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { forceRegenerate } = req.body;
    
    console.log(`🔄 Toggle regeneration flag for story ${storyId}: ${forceRegenerate}`);
    
    // Find the story file
    const stories = require('./utils/fileUtils').readStoriesFromDirectory(STORIES_DIR);
    const story = stories.find(s => s.id.toString() === storyId.toString());
    
    if (!story) {
      return res.status(404).json({ 
        error: 'Story not found',
        storyId: storyId
      });
    }
    
    // Get the story filename
    const filename = story.metadata?.filename;
    if (!filename) {
      return res.status(400).json({ 
        error: 'Story filename not found',
        storyId: storyId
      });
    }
    
    const filepath = path.join(STORIES_DIR, filename);
    
    // Read current story data
    const storyData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    // Update the regeneration flag
    if (forceRegenerate === true) {
      storyData.forceRegenerate = true;
      console.log(`✅ Set regeneration flag for story: ${storyData.characters?.map(c => c.name).join(' & ') || 'Unnamed'}`);
    } else {
      delete storyData.forceRegenerate;
      console.log(`❌ Removed regeneration flag for story: ${storyData.characters?.map(c => c.name).join(' & ') || 'Unnamed'}`);
    }
    
    // Save the updated story
    fs.writeFileSync(filepath, JSON.stringify(storyData, null, 2));
    
    res.json({
      message: `Regeneration flag ${forceRegenerate ? 'set' : 'removed'} successfully`,
      storyId: storyId,
      forceRegenerate: forceRegenerate || false,
      storyName: storyData.characters?.map(c => c.name).join(' & ') || 'Unnamed Story'
    });
    
  } catch (error) {
    console.error('❌ Error toggling regeneration flag:', error.message);
    res.status(500).json({ 
      error: 'Failed to toggle regeneration flag',
      details: error.message 
    });
  }
});

// Get story regeneration status
app.get(`${API_ENDPOINTS.STORIES}/:storyId/regenerate`, async (req, res) => {
  try {
    const { storyId } = req.params;
    
    // Find the story file
    const stories = require('./utils/fileUtils').readStoriesFromDirectory(STORIES_DIR);
    const story = stories.find(s => s.id.toString() === storyId.toString());
    
    if (!story) {
      return res.status(404).json({ 
        error: 'Story not found',
        storyId: storyId
      });
    }
    
    res.json({
      storyId: storyId,
      forceRegenerate: story.forceRegenerate === true,
      storyName: story.characters?.map(c => c.name).join(' & ') || 'Unnamed Story'
    });
    
  } catch (error) {
    console.error('❌ Error getting regeneration status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get regeneration status',
      details: error.message 
    });
  }
});

// Server startup
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`📺 Featured items: http://localhost:${PORT}${API_ENDPOINTS.FEATURED}`);
  console.log(`📂 Categories: http://localhost:${PORT}${API_ENDPOINTS.CATEGORIES}`);
  console.log(`✍️  Create story: POST http://localhost:${PORT}${API_ENDPOINTS.STORIES}`);
  
  console.log('ℹ️ Story watching and AI processing handled by separate story-watcher.js service');
  console.log('   Run "npm run dev" to start both server and story watcher together');
});
