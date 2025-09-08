require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

// Import required modules
const {
  processStoryGranularlyWithCheck,
  processExistingStories,
  validateStoryCompleteness
} = require('./processing/storyProcessor');

const {
  readStoriesFromDirectory,
  updateStoryWithGeneratedContent,
  updateStoryIncremental
} = require('./utils/fileUtils');

const { STORIES_DIR } = require('./config/constants');

class StoryWatcher {
  constructor() {
    this.watcher = null;
  }

  start() {
    console.log('👀 Starting story file watcher...');
    console.log(`📁 Watching directory: ${STORIES_DIR}`);
    
    this.watcher = chokidar.watch(STORIES_DIR, {
      ignored: /^\./, // ignore dotfiles
      persistent: true,
      ignoreInitial: true // don't trigger for files that already exist
    });
    
    this.watcher.on('add', async (filepath) => {
      if (path.extname(filepath) === '.json') {
        console.log(`📁 New story file detected: ${path.basename(filepath)}`);
        
        try {
          // Small delay to ensure file is fully written
          setTimeout(async () => {
            try {
              const fileContent = fs.readFileSync(filepath, 'utf8');
              const storyData = JSON.parse(fileContent);
              
              console.log('🔄 Processing newly detected story...');
              await processStoryGranularlyWithCheck(storyData, filepath, {
                updateStoryWithGeneratedContent,
                updateStoryIncremental
              });
            } catch (processError) {
              console.error('❌ Error processing new story file:', processError.message);
            }
          }, 2000);
          
        } catch (error) {
          console.error('❌ Error handling new story file:', error.message);
        }
      }
    });

    this.watcher.on('error', (error) => {
      console.error('❌ Story watcher error:', error);
    });

    console.log('✅ Story watcher is ready and monitoring for new stories');
    
    // Check for API key and process existing stories
    this.processExistingStories();
  }

  async processExistingStories() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      console.log('⚠️ GEMINI_API_KEY not found. Skipping existing story processing.');
      return;
    }

    console.log('🤖 AI Story generation enabled with Gemini API');
    
    // Process existing stories in the background
    setTimeout(async () => {
      try {
        console.log('🔄 Processing existing stories...');
        
        const dependencies = {
          readStoriesFromDirectory: () => readStoriesFromDirectory(STORIES_DIR),
          validateStoryCompleteness,
          processStoryGranularlyWithCheck: (storyData, filepath) => 
            processStoryGranularlyWithCheck(storyData, filepath, {
              updateStoryWithGeneratedContent,
              updateStoryIncremental
            }),
          storiesDir: STORIES_DIR
        };
        
        await processExistingStories(dependencies);
      } catch (error) {
        console.error('❌ Error in background story processing:', error.message);
      }
    }, 2000); // Wait 2 seconds to let everything initialize
  }

  stop() {
    if (this.watcher) {
      console.log('🛑 Stopping story watcher...');
      this.watcher.close();
      this.watcher = null;
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM signal, shutting down story watcher gracefully...');
  if (storyWatcher) {
    storyWatcher.stop();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT signal, shutting down story watcher gracefully...');
  if (storyWatcher) {
    storyWatcher.stop();
  }
  process.exit(0);
});

// Start the watcher
console.log('🚀 Story Watcher Service Starting...');
const storyWatcher = new StoryWatcher();
storyWatcher.start();
