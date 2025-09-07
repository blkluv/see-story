const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;

// Create stories directory if it doesn't exist
const storiesDir = path.join(__dirname, 'stories');
if (!fs.existsSync(storiesDir)) {
  fs.mkdirSync(storiesDir, { recursive: true });
  console.log('📁 Created stories directory:', storiesDir);
}

// Middleware
app.use(cors());
app.use(express.json());

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
const readStoriesFromDirectory = () => {
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
    createdAt: story.createdAt
  };
};

const generateFeaturedItems = () => {
  console.log('📖 Reading stories from directory for featured items...');
  
  // Read real stories
  const realStories = readStoriesFromDirectory();
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

const generateCategories = () => {
  const categoryNames = [
    'Action & Adventure', 'Comedies', 'Documentaries', 'Dramas', 'Horror Movies',
    'Independent Movies', 'International Movies', 'Kids & Family Movies', 'Music & Musicals', 'Romance',
    'Sci-Fi & Fantasy', 'Sports Movies', 'Thrillers', 'TV Action & Adventure', 'TV Comedies',
    'TV Documentaries', 'TV Dramas', 'TV Horror', 'TV Mysteries', 'TV Sci-Fi & Fantasy',
    'Anime Features', 'Anime Series', 'British TV Shows', 'Crime TV Shows', 'Cult Movies',
    'Faith & Spirituality', 'LGBTQ Movies', 'Military Action & Adventure', 'Stand-Up Comedy', 'Teen Movies'
  ];
  
  return categoryNames.map((name, index) => ({
    id: index + 1,
    name,
    items: generateCategoryItems(name, (index + 1) * 1000)
  }));
};

// API Routes
app.get('/api/featured', (req, res) => {
  try {
    const featuredItems = generateFeaturedItems();
    res.json(featuredItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured items' });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const categories = generateCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/category/:id', (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const categories = generateCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

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
const saveStoryToFile = async (story) => {
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

app.post('/api/stories', async (req, res) => {
  try {
    const { characters, storyOutline } = req.body;
    
    // Validate required fields
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ 
        error: 'At least one character is required' 
      });
    }
    
    if (!storyOutline || storyOutline.trim() === '') {
      return res.status(400).json({ 
        error: 'Story outline is required' 
      });
    }

    // Validate that at least one character has a name
    const validCharacters = characters.filter(char => char.name && char.name.trim() !== '');
    if (validCharacters.length === 0) {
      return res.status(400).json({ 
        error: 'At least one character must have a name' 
      });
    }

    // Create story object
    const story = {
      id: Date.now(),
      characters: validCharacters.map(char => ({
        name: char.name.trim(),
        photo: char.photo || (char.photo === '' ? null : `https://picsum.photos/300/400?random=${Date.now() + Math.random()}`)
      })),
      storyOutline: storyOutline.trim(),
      createdAt: new Date().toISOString()
    };

    // Save story to file
    try {
      const filepath = await saveStoryToFile(story);
      console.log('📝 New story saved to file:', filepath);
      console.log(`📊 Story contains ${story.characters.length} character(s):`, story.characters.map(c => c.name).join(', '));
      
      res.status(201).json({
        message: 'Story created and saved successfully!',
        story: {
          id: story.id,
          characterCount: story.characters.length,
          characters: story.characters.map(c => ({ name: c.name, hasPhoto: !!c.photo })),
          storyOutline: story.storyOutline,
          createdAt: story.createdAt
        },
        savedTo: path.basename(filepath)
      });
    } catch (fileError) {
      console.error('Error saving story to file:', fileError);
      // Still return success since the story was processed, just log the file error
      res.status(201).json({
        message: 'Story created successfully! (Note: File save failed)',
        story: {
          id: story.id,
          characterCount: story.characters.length,
          characters: story.characters.map(c => ({ name: c.name, hasPhoto: !!c.photo })),
          storyOutline: story.storyOutline,
          createdAt: story.createdAt
        }
      });
    }
    
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
  console.log(`📺 Featured items: http://localhost:${PORT}/api/featured`);
  console.log(`📂 Categories: http://localhost:${PORT}/api/categories`);
  console.log(`✍️  Create story: POST http://localhost:${PORT}/api/stories`);
});
