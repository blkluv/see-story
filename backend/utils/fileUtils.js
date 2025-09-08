const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Mock data generator functions
const generateMockItem = (id, title, category = '') => ({
  id,
  title,
  description: `An amazing ${category ? category + ' ' : ''}story about ${title.toLowerCase()}`,
  imageUrl: `https://picsum.photos/300/450?random=${id}`,
  backdropUrl: `https://picsum.photos/1920/1080?random=${id + 1000}`,
  rating: (Math.random() * 4 + 1).toFixed(1),
  year: Math.floor(Math.random() * 30) + 1994,
  duration: Math.floor(Math.random() * 120) + 90 + ' min',
  genre: ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Documentary'][Math.floor(Math.random() * 8)]
});

// Read stories from the stories directory
const readStoriesFromDirectory = (storiesDir) => {
  try {
    const files = fs.readdirSync(storiesDir);
    const storyFiles = files.filter(file => file.endsWith('.json'));
    
    const stories = storyFiles.map(filename => {
      try {
        const filepath = path.join(storiesDir, filename);
        const fileContent = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(fileContent);
      } catch (error) {
        console.error(`Error reading story file ${filename}:`, error.message);
        return null;
      }
    }).filter(story => story !== null);
    
    return stories;
  } catch (error) {
    console.error('Error reading stories directory:', error.message);
    return [];
  }
};

// Convert story to featured item format
const convertStoryToFeaturedItem = (story, index) => {
  // Get the first character's name or use a generic title
  const characterNames = story.characters?.map(char => char.name).join(' & ') || 'Untitled Story';
  
  return {
    id: story.id || (10000 + index),
    title: characterNames,
    description: story.story?.outline || 'An amazing adventure awaits...',
    imageUrl: `https://picsum.photos/300/450?random=${story.id || (10000 + index)}`,
    backdropUrl: `https://picsum.photos/1920/1080?random=${(story.id || (10000 + index)) + 3000}`,
    rating: (Math.random() * 4 + 1).toFixed(1),
    year: new Date(story.createdAt).getFullYear() || new Date().getFullYear(),
    duration: Math.floor(Math.random() * 120) + 90 + ' min',
    genre: 'Adventure',
    featured: true,
    trailerUrl: '#',
    characterCount: story.characters?.length || 1,
    createdAt: story.createdAt,
    // Include the generated story data for playability detection
    generatedStory: story.generatedStory || null
  };
};

const generateFeaturedItems = (storiesDir) => {
  console.log('📖 Reading stories from directory for featured items...');
  
  // Read real stories
  const realStories = readStoriesFromDirectory(storiesDir);
  console.log(`📚 Found ${realStories.length} real stories`);
  
  // Convert real stories to featured items
  const featuredFromStories = realStories.map((story, index) => 
    convertStoryToFeaturedItem(story, index)
  );
  
  // If we need more items to reach 10, generate mock items
  const needed = Math.max(0, 10 - featuredFromStories.length);
  console.log(`🎭 Need ${needed} additional mock featured items`);
  
  const mockFeaturedTitles = [
    'Epic Adventure', 'Midnight Mystery', 'Ocean Dreams', 'City Lights', 'Forest Tales',
    'Desert Storm', 'Mountain Quest', 'Space Odyssey', 'Time Traveler', 'Lost Kingdom'
  ];
  
  const mockFeatured = mockFeaturedTitles.slice(0, needed).map((title, index) => ({
    id: 5000 + index,
    title,
    description: `An amazing story about ${title.toLowerCase()}`,
    imageUrl: `https://picsum.photos/300/450?random=${5000 + index}`,
    backdropUrl: `https://picsum.photos/1920/1080?random=${index + 2000}`,
    rating: (Math.random() * 4 + 1).toFixed(1),
    year: Math.floor(Math.random() * 30) + 1994,
    duration: Math.floor(Math.random() * 120) + 90 + ' min',
    genre: ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Documentary'][Math.floor(Math.random() * 8)],
    featured: true,
    trailerUrl: '#'
  }));
  
  const allFeatured = [...featuredFromStories, ...mockFeatured];
  console.log(`✨ Generated ${allFeatured.length} total featured items (${featuredFromStories.length} real + ${mockFeatured.length} mock)`);
  
  return allFeatured;
};

const generateCategoryItems = (categoryName, startId) => {
  const itemTitles = [
    'The Beginning', 'Second Chapter', 'Final Hour', 'New Dawn', 'Dark Night',
    'Bright Future', 'Hidden Secret', 'True Story', 'Wild Adventure', 'Silent Voice',
    'Golden Age', 'Silver Screen', 'Crystal Clear', 'Diamond Heart', 'Ruby Red',
    'Emerald Eyes', 'Sapphire Sky', 'Pearl Wisdom', 'Amber Light', 'Jade Path',
    'Copper Dream', 'Iron Will', 'Steel Courage', 'Bronze Medal', 'Platinum Star',
    'Titanium Force', 'Carbon Copy', 'Neon Nights', 'Electric Blue', 'Magnetic Field'
  ];
  
  return itemTitles.map((title, index) => 
    generateMockItem(startId + index, `${title}`, categoryName)
  );
};

// Helper function to download image and convert to base64
const downloadImageAsBase64 = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const protocol = imageUrl.startsWith('https:') ? https : http;
    
    protocol.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const data = [];
      
      response.on('data', (chunk) => {
        data.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        
        resolve({
          base64Data: base64,
          mimeType: mimeType,
          size: buffer.length
        });
      });

    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Helper function to process multiple characters and download their images
const processCharacters = async (characters) => {
  const processedCharacters = [];
  
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    let imageData = null;
    
    if (character.photo) {
      try {
        console.log(`⬇️ Downloading image for character "${character.name}" from:`, character.photo);
        imageData = await downloadImageAsBase64(character.photo);
        console.log(`✅ Image downloaded successfully for "${character.name}", size:`, imageData.size, 'bytes');
      } catch (error) {
        console.log(`⚠️ Failed to download image for "${character.name}":`, error.message);
        imageData = {
          error: error.message,
          originalUrl: character.photo
        };
      }
    }
    
    processedCharacters.push({
      name: character.name,
      photoUrl: character.photo || null,
      photoData: imageData
    });
  }
  
  return processedCharacters;
};

// Helper function to save story to JSON file
const saveStoryToFile = async (story, storiesDir) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Use first character name for filename, or "multi" if multiple characters
  const filenamePart = story.characters.length === 1 
    ? story.characters[0].name.replace(/[^a-zA-Z0-9]/g, '_')
    : `multi_${story.characters.length}_characters`;
  const filename = `story_${timestamp}_${filenamePart}.json`;
  const filepath = path.join(storiesDir, filename);
  
  // Process all characters and download their images
  const processedCharacters = await processCharacters(story.characters);

  const jsonContent = {
    id: story.id,
    createdAt: story.createdAt,
    submissionDate: new Date(story.createdAt).toLocaleString(),
    characters: processedCharacters,
    story: {
      outline: story.storyOutline
    },
    metadata: {
      filename: filename,
      fileVersion: "2.0",
      characterCount: processedCharacters.length
    }
  };

  await fs.promises.writeFile(filepath, JSON.stringify(jsonContent, null, 2), 'utf8');
  return filepath;
};

// Function to update story file with generated content
const updateStoryWithGeneratedContent = async (filepath, generatedStory) => {
  try {
    console.log('💾 Updating story file with generated content...');
    
    // Read existing story
    const existingContent = await fs.promises.readFile(filepath, 'utf8');
    const storyData = JSON.parse(existingContent);
    
    // Add generated story to the existing data
    storyData.generatedStory = {
      ...generatedStory,
      generatedAt: new Date().toISOString(),
      wordCount: generatedStory.scenes?.reduce((total, scene) => 
        total + (scene.content?.split(' ').length || 0), 0) || 0
    };
    
    // Update metadata
    storyData.metadata.hasGeneratedStory = true;
    storyData.metadata.lastUpdated = new Date().toISOString();
    
    // Write updated content back to file
    await fs.promises.writeFile(filepath, JSON.stringify(storyData, null, 2), 'utf8');
    
    console.log('✅ Story file updated with generated content');
    return true;
  } catch (error) {
    console.error('❌ Error updating story file:', error.message);
    return false;
  }
};

// Create stories directory if it doesn't exist
const ensureStoriesDirectory = (storiesDir) => {
  if (!fs.existsSync(storiesDir)) {
    fs.mkdirSync(storiesDir, { recursive: true });
    console.log(`📁 Created stories directory: ${storiesDir}`);
  }
};

module.exports = {
  generateMockItem,
  readStoriesFromDirectory,
  convertStoryToFeaturedItem,
  generateFeaturedItems,
  generateCategoryItems,
  downloadImageAsBase64,
  processCharacters,
  saveStoryToFile,
  updateStoryWithGeneratedContent,
  ensureStoriesDirectory
};
