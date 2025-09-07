require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const chokidar = require('chokidar');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenAI } = require('@google/genai');

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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-gemini-api-key-here');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize Gemini AI for Image Generation (Nano Banana)
const genAIImage = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'your-gemini-api-key-here'
});

// Story generation function
const generateStoryWithGemini = async (characters, storyOutline) => {
  try {
    console.log('🤖 Generating story with Gemini AI...');
    
    const characterDescriptions = characters.map(char => `${char.name}`).join(' and ');
    
    const prompt = `
You are a master storyteller. Based on the following information, write an engaging story divided into exactly 10 scenes.

Characters: ${characterDescriptions}
Story Outline: ${storyOutline}

Please write a complete story that:
1. Is divided into exactly 10 distinct scenes
2. Each scene should be substantial (3-4 paragraphs)
3. Develops the characters and advances the plot
4. Follows the given outline but expands it creatively
5. Has a clear beginning, middle, and end
6. Each scene should be engaging and well-written

Format your response as a JSON object with this structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene Title",
      "content": "Scene content here..."
    },
    ... (10 scenes total)
  ],
  "summary": "Brief summary of the complete story"
}

Make sure the JSON is properly formatted and valid.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Story generated successfully');
    
    // Try to parse the JSON response
    try {
      // Clean the response text to extract JSON
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const generatedStory = JSON.parse(jsonText);
      
      // Validate the structure
      if (generatedStory.scenes && Array.isArray(generatedStory.scenes)) {
        console.log(`📖 Generated story with ${generatedStory.scenes.length} scenes`);
        return generatedStory;
      } else {
        throw new Error('Invalid story structure returned by AI');
      }
    } catch (parseError) {
      console.error('❌ Error parsing AI response as JSON:', parseError.message);
      console.log('Raw AI response:', text);
      
      // Fallback: create a simple story structure
      return {
        scenes: [
          {
            sceneNumber: 1,
            title: "Generated Story",
            content: text.substring(0, Math.min(text.length, 1000)) + "..."
          }
        ],
        summary: "AI-generated story based on user outline",
        error: "Could not parse structured response from AI"
      };
    }
  } catch (error) {
    console.error('❌ Error generating story with Gemini:', error.message);
    return {
      scenes: [
        {
          sceneNumber: 1,
          title: "Story Generation Error",
          content: `Unable to generate story: ${error.message}. Original outline: ${storyOutline}`
        }
      ],
      summary: "Story generation failed",
      error: error.message
    };
  }
};

// Image generation functions using Nano Banana
const generateImagePromptFromScene = (sceneContent, sceneTitle, characters = []) => {
  const characterNames = characters.map(c => c.name).join(', ');
  
  // Create two different visual perspectives for each scene
  const prompts = [
    {
      type: 'wide_shot',
      prompt: `Create a cinematic wide shot for a story scene titled "${sceneTitle}". 
Scene content: ${sceneContent}
${characterNames ? `Characters involved: ${characterNames}` : ''}
Style: Dramatic, cinematic lighting, high quality, detailed environment, movie scene composition.
Focus on establishing the setting and overall atmosphere of the scene.`
    },
    {
      type: 'character_focus',
      prompt: `Create a character-focused cinematic shot for a story scene titled "${sceneTitle}".
Scene content: ${sceneContent}
${characterNames ? `Characters involved: ${characterNames}` : ''}
Style: Dramatic close-up or medium shot, cinematic lighting, high quality, detailed character expressions, emotional depth.
Focus on the characters' emotions and key story moment.`
    }
  ];
  
  return prompts;
};

const generateSceneImages = async (sceneContent, sceneTitle, characters = []) => {
  try {
    console.log(`🎨 Generating images for scene: ${sceneTitle}`);
    
    const imagePrompts = generateImagePromptFromScene(sceneContent, sceneTitle, characters);
    const generatedImages = [];
    
    for (let i = 0; i < imagePrompts.length; i++) {
      const { type, prompt } = imagePrompts[i];
      
      try {
        console.log(`🖼️ Generating ${type} image (${i + 1}/2)...`);
        
        const response = await genAIImage.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: prompt,
        });
        
        // Extract image data from response
        if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImages.push({
                type: type,
                base64Data: part.inlineData.data,
                mimeType: part.inlineData.mimeType || 'image/png',
                prompt: prompt.substring(0, 200) + '...', // Store truncated prompt for reference
                generatedAt: new Date().toISOString()
              });
              console.log(`✅ Successfully generated ${type} image`);
              break;
            }
          }
        }
      } catch (imageError) {
        console.error(`❌ Error generating ${type} image:`, imageError.message);
        // Continue with next image even if one fails
        generatedImages.push({
          type: type,
          error: imageError.message,
          prompt: prompt.substring(0, 200) + '...',
          generatedAt: new Date().toISOString()
        });
      }
      
      // Add small delay between image generations to avoid rate limiting
      if (i < imagePrompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`🎉 Generated ${generatedImages.filter(img => !img.error).length}/${imagePrompts.length} images for scene: ${sceneTitle}`);
    return generatedImages;
    
  } catch (error) {
    console.error('❌ Error in generateSceneImages:', error);
    return [{
      error: `Image generation failed: ${error.message}`,
      generatedAt: new Date().toISOString()
    }];
  }
};

// Entity extraction function
const extractEntitiesFromScene = async (sceneContent, sceneTitle, characterNames = []) => {
  try {
    console.log('🔍 Extracting entities from scene:', sceneTitle);
    
    const prompt = `
You are an expert text analyzer. Analyze the following scene content and extract all important entities with their exact positions in the text.

Scene Title: ${sceneTitle}
Scene Content: ${sceneContent}
Known Characters: ${characterNames.join(', ')}

Extract entities in the following categories:
1. CHARACTERS - People, beings, or named entities (including the known characters)
2. LOCATIONS - Places, settings, geographical locations
3. OBJECTS - Important items, tools, weapons, artifacts
4. ACTIONS - Key verbs/actions that drive the plot
5. EMOTIONS - Feelings, moods, emotional states
6. CONCEPTS - Abstract ideas, themes, magical elements

For each entity, provide:
- The exact text as it appears in the content
- The category it belongs to
- The character position where it starts in the text (0-based index)
- The character position where it ends
- A brief description of its significance

Respond with a JSON object in this exact format:
{
  "entities": [
    {
      "text": "exact text from scene",
      "category": "CHARACTERS|LOCATIONS|OBJECTS|ACTIONS|EMOTIONS|CONCEPTS",
      "startPos": 0,
      "endPos": 10,
      "description": "Brief description of significance"
    }
  ],
  "totalEntities": 0,
  "sceneLength": 0
}

Make sure positions are accurate and JSON is properly formatted.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Entity extraction completed');
    
    // Try to parse the JSON response
    try {
      // Clean the response text to extract JSON
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const entityData = JSON.parse(jsonText);
      
      // Validate and enhance the structure
      if (entityData.entities && Array.isArray(entityData.entities)) {
        // Add scene length and total count
        entityData.sceneLength = sceneContent.length;
        entityData.totalEntities = entityData.entities.length;
        
        console.log(`📊 Extracted ${entityData.totalEntities} entities from scene`);
        return entityData;
      } else {
        throw new Error('Invalid entity structure returned by AI');
      }
    } catch (parseError) {
      console.error('❌ Error parsing entity extraction response:', parseError.message);
      console.log('Raw AI response:', text.substring(0, 200) + '...');
      
      // Fallback: create basic entity structure
      return {
        entities: [],
        totalEntities: 0,
        sceneLength: sceneContent.length,
        error: "Could not parse structured response from AI",
        rawResponse: text.substring(0, 500) // Store partial response for debugging
      };
    }
  } catch (error) {
    console.error('❌ Error extracting entities:', error.message);
    return {
      entities: [],
      totalEntities: 0,
      sceneLength: sceneContent.length,
      error: error.message
    };
  }
};

// Separate generation functions for modular processing
const generateScenesOnly = async (characters, storyOutline) => {
  console.log('📝 Generating story scenes only...');
  return await generateStoryWithGemini(characters, storyOutline);
};

const generateEntitiesOnly = async (scenes, characterNames = []) => {
  console.log('🔍 Extracting entities only...');
  
  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes provided for entity extraction');
  }
  
  const scenesWithEntities = await Promise.all(
    scenes.map(async (scene, index) => {
      try {
        console.log(`🎬 Extracting entities from scene ${index + 1}: ${scene.title}`);
        
        const entityData = await extractEntitiesFromScene(
          scene.content, 
          scene.title, 
          characterNames
        );
        
        return {
          ...scene,
          entities: entityData
        };
      } catch (error) {
        console.error(`❌ Error processing scene ${index + 1}:`, error.message);
        return {
          ...scene,
          entities: {
            entities: [],
            totalEntities: 0,
            sceneLength: scene.content?.length || 0,
            error: error.message
          }
        };
      }
    })
  );
  
  return scenesWithEntities;
};

const generateImagesOnly = async (scenes, characters = []) => {
  console.log('🎨 Generating images only...');
  
  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes provided for image generation');
  }
  
  const scenesWithImages = await Promise.all(
    scenes.map(async (scene, index) => {
      try {
        console.log(`🖼️ Generating images for scene ${index + 1}: ${scene.title}`);
        
        const sceneImages = await generateSceneImages(scene.content, scene.title, characters);
        
        return {
          ...scene,
          images: sceneImages || []
        };
      } catch (error) {
        console.error(`❌ Error generating images for scene ${index + 1}:`, error.message);
        return {
          ...scene,
          images: []
        };
      }
    })
  );
  
  return scenesWithImages;
};

// Enhanced story generation with entity extraction
const generateStoryWithEntities = async (characters, storyOutline) => {
  try {
    // First, generate the story scenes
    const generatedStory = await generateStoryWithGemini(characters, storyOutline);
    
    if (!generatedStory.scenes || generatedStory.scenes.length === 0) {
      console.log('⚠️  No scenes to process for entity extraction');
      return generatedStory;
    }
    
    console.log('🔍 Starting entity extraction and image generation for all scenes...');
    
    // Extract character names for context
    const characterNames = characters.map(char => char.name);
    
    // Process each scene to extract entities AND generate images
    const scenesWithEntitiesAndImages = await Promise.all(
      generatedStory.scenes.map(async (scene, index) => {
        try {
          console.log(`🎬 Processing scene ${index + 1}: ${scene.title}`);
          
          // Run entity extraction and image generation in parallel for efficiency
          const [entityData, sceneImages] = await Promise.all([
            extractEntitiesFromScene(scene.content, scene.title, characterNames),
            generateSceneImages(scene.content, scene.title, characters)
          ]);
          
          return {
            ...scene,
            entities: entityData,
            images: sceneImages || []
          };
        } catch (error) {
          console.error(`❌ Error processing scene ${index + 1}:`, error.message);
          return {
            ...scene,
            entities: {
              entities: [],
              totalEntities: 0,
              sceneLength: scene.content?.length || 0,
              error: error.message
            },
            images: []
          };
        }
      })
    );
    
    // Calculate total entities and images across all scenes
    const totalSceneEntities = scenesWithEntitiesAndImages.reduce((total, scene) => 
      total + (scene.entities?.totalEntities || 0), 0);
    
    const totalSuccessfulImages = scenesWithEntitiesAndImages.reduce((total, scene) => 
      total + (scene.images?.filter(img => !img.error).length || 0), 0);
    
    console.log(`✨ Entity extraction completed! Total entities across all scenes: ${totalSceneEntities}`);
    console.log(`🎨 Image generation completed! Total images generated: ${totalSuccessfulImages}`);
    
    return {
      ...generatedStory,
      scenes: scenesWithEntitiesAndImages,
      entityMetadata: {
        totalEntitiesAcrossScenes: totalSceneEntities,
        scenesProcessed: scenesWithEntitiesAndImages.length,
        entitiesPerScene: scenesWithEntitiesAndImages.map(scene => ({
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          entityCount: scene.entities?.totalEntities || 0
        }))
      },
      imageMetadata: {
        totalImagesGenerated: totalSuccessfulImages,
        totalImageAttempts: scenesWithEntitiesAndImages.reduce((total, scene) => 
          total + (scene.images?.length || 0), 0),
        scenesProcessed: scenesWithEntitiesAndImages.length,
        imagesPerScene: scenesWithEntitiesAndImages.map(scene => ({
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          successfulImages: scene.images?.filter(img => !img.error).length || 0,
          failedImages: scene.images?.filter(img => img.error).length || 0
        }))
      }
    };
  } catch (error) {
    console.error('❌ Error in enhanced story generation:', error.message);
    // Fallback to basic story generation
    return await generateStoryWithGemini(characters, storyOutline);
  }
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

// Granular story processing function - only processes what's missing
const processStoryGranularly = async (storyData, filepath) => {
  try {
    const characters = storyData.characters || [];
    const storyOutline = storyData.story?.outline || 'A mysterious adventure begins...';
    const characterNames = characters.map(char => char.name);
    
    let currentGeneratedStory = storyData.generatedStory || {};
    let hasChanges = false;
    
    // Check and generate scenes if missing
    const hasScenes = currentGeneratedStory.scenes && 
                     currentGeneratedStory.scenes.length > 0;
    
    if (!hasScenes) {
      console.log('📝 Missing scenes - generating...');
      const newStory = await generateScenesOnly(characters, storyOutline);
      currentGeneratedStory = {
        ...currentGeneratedStory,
        ...newStory
      };
      hasChanges = true;
      console.log('✅ Scenes generated successfully');
    } else {
      console.log('✅ Scenes already exist');
    }
    
    // Check and extract entities if missing
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      const hasEntities = currentGeneratedStory.scenes.some(scene => 
        scene.entities && scene.entities.totalEntities > 0
      );
      
      if (!hasEntities) {
        console.log('🔍 Missing entities - extracting...');
        const scenesWithEntities = await generateEntitiesOnly(
          currentGeneratedStory.scenes,
          characterNames
        );
        
        // Update scenes with entities
        currentGeneratedStory.scenes = scenesWithEntities;
        
        // Update entity metadata
        const totalSceneEntities = scenesWithEntities.reduce((total, scene) => 
          total + (scene.entities?.totalEntities || 0), 0);
        
        currentGeneratedStory.entityMetadata = {
          totalEntitiesAcrossScenes: totalSceneEntities,
          scenesProcessed: scenesWithEntities.length,
          entitiesPerScene: scenesWithEntities.map(scene => ({
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            entityCount: scene.entities?.totalEntities || 0
          }))
        };
        
        hasChanges = true;
        console.log('✅ Entities extracted successfully');
      } else {
        console.log('✅ Entities already exist');
      }
    }
    
    // Check and generate images if missing
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      const hasImages = currentGeneratedStory.scenes.some(scene => 
        scene.images && scene.images.length > 0 && scene.images.some(img => !img.error)
      );
      
      if (!hasImages) {
        console.log('🎨 Missing images - generating...');
        const scenesWithImages = await generateImagesOnly(
          currentGeneratedStory.scenes,
          characters
        );
        
        // Update scenes with images
        currentGeneratedStory.scenes = scenesWithImages;
        
        // Update image metadata
        const totalSuccessfulImages = scenesWithImages.reduce((total, scene) => 
          total + (scene.images?.filter(img => !img.error).length || 0), 0);
        
        currentGeneratedStory.imageMetadata = {
          totalImagesGenerated: totalSuccessfulImages,
          totalImageAttempts: scenesWithImages.reduce((total, scene) => 
            total + (scene.images?.length || 0), 0),
          scenesProcessed: scenesWithImages.length,
          imagesPerScene: scenesWithImages.map(scene => ({
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            successfulImages: scene.images?.filter(img => !img.error).length || 0,
            failedImages: scene.images?.filter(img => img.error).length || 0
          }))
        };
        
        hasChanges = true;
        console.log('✅ Images generated successfully');
      } else {
        console.log('✅ Images already exist');
      }
    }
    
    // Update the file if there were any changes
    if (hasChanges) {
      console.log('💾 Updating story file with new content...');
      await updateStoryWithGeneratedContent(filepath, currentGeneratedStory);
      console.log('✅ Story file updated successfully');
    } else {
      console.log('✅ All content already exists, no updates needed');
    }
    
    return currentGeneratedStory;
    
  } catch (error) {
    console.error('❌ Error in granular story processing:', error.message);
    throw error;
  }
};

// Wrapper for granular processing that returns whether changes were made
const processStoryGranularlyWithCheck = async (storyData, filepath) => {
  try {
    const characters = storyData.characters || [];
    const storyOutline = storyData.story?.outline || 'A mysterious adventure begins...';
    const characterNames = characters.map(char => char.name);
    
    let currentGeneratedStory = storyData.generatedStory || {};
    let hasChanges = false;
    
    // Check and generate scenes if missing
    const hasScenes = currentGeneratedStory.scenes && 
                     currentGeneratedStory.scenes.length > 0;
    
    if (!hasScenes) {
      console.log('📝 Missing scenes - generating...');
      const newStory = await generateScenesOnly(characters, storyOutline);
      currentGeneratedStory = {
        ...currentGeneratedStory,
        ...newStory
      };
      hasChanges = true;
      console.log('✅ Scenes generated successfully');
    } else {
      console.log('✅ Scenes already exist');
    }
    
    // Check and extract entities if missing
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      const hasEntities = currentGeneratedStory.scenes.some(scene => 
        scene.entities && scene.entities.totalEntities > 0
      );
      
      if (!hasEntities) {
        console.log('🔍 Missing entities - extracting...');
        const scenesWithEntities = await generateEntitiesOnly(
          currentGeneratedStory.scenes,
          characterNames
        );
        
        // Update scenes with entities
        currentGeneratedStory.scenes = scenesWithEntities;
        
        // Update entity metadata
        const totalSceneEntities = scenesWithEntities.reduce((total, scene) => 
          total + (scene.entities?.totalEntities || 0), 0);
        
        currentGeneratedStory.entityMetadata = {
          totalEntitiesAcrossScenes: totalSceneEntities,
          scenesProcessed: scenesWithEntities.length,
          entitiesPerScene: scenesWithEntities.map(scene => ({
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            entityCount: scene.entities?.totalEntities || 0
          }))
        };
        
        hasChanges = true;
        console.log('✅ Entities extracted successfully');
      } else {
        console.log('✅ Entities already exist');
      }
    }
    
    // Check and generate images if missing
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      const hasImages = currentGeneratedStory.scenes.some(scene => 
        scene.images && scene.images.length > 0 && scene.images.some(img => !img.error)
      );
      
      if (!hasImages) {
        console.log('🎨 Missing images - generating...');
        const scenesWithImages = await generateImagesOnly(
          currentGeneratedStory.scenes,
          characters
        );
        
        // Update scenes with images
        currentGeneratedStory.scenes = scenesWithImages;
        
        // Update image metadata
        const totalSuccessfulImages = scenesWithImages.reduce((total, scene) => 
          total + (scene.images?.filter(img => !img.error).length || 0), 0);
        
        currentGeneratedStory.imageMetadata = {
          totalImagesGenerated: totalSuccessfulImages,
          totalImageAttempts: scenesWithImages.reduce((total, scene) => 
            total + (scene.images?.length || 0), 0),
          scenesProcessed: scenesWithImages.length,
          imagesPerScene: scenesWithImages.map(scene => ({
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            successfulImages: scene.images?.filter(img => !img.error).length || 0,
            failedImages: scene.images?.filter(img => img.error).length || 0
          }))
        };
        
        hasChanges = true;
        console.log('✅ Images generated successfully');
      } else {
        console.log('✅ Images already exist');
      }
    }
    
    // Update the file if there were any changes
    if (hasChanges) {
      console.log('💾 Updating story file with new content...');
      await updateStoryWithGeneratedContent(filepath, currentGeneratedStory);
      console.log('✅ Story file updated successfully');
    } else {
      console.log('✅ All content already exists, no updates needed');
    }
    
    return hasChanges; // Return whether any changes were made
    
  } catch (error) {
    console.error('❌ Error in granular story processing with check:', error.message);
    return false;
  }
};

// File watcher for story generation
const setupStoryWatcher = () => {
  console.log('👀 Setting up story file watcher...');
  
  const watcher = chokidar.watch(storiesDir, {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true // Don't process existing files on startup
  });

  watcher.on('add', async (filepath) => {
    console.log(`📝 New story file detected: ${path.basename(filepath)}`);
    
    // Wait a moment for file to be fully written
    setTimeout(async () => {
      try {
        const fileContent = await fs.promises.readFile(filepath, 'utf8');
        const storyData = JSON.parse(fileContent);
        
        console.log(`🎭 Processing story: ${storyData.characters?.map(c => c.name).join(' & ')}`);
        
        // Use granular processing to only generate what's missing
        await processStoryGranularly(storyData, filepath);
        
      } catch (error) {
        console.error(`❌ Error processing story file ${filepath}:`, error.message);
      }
    }, 1000); // Wait 1 second for file to be fully written
  });

  watcher.on('ready', () => {
    console.log('✅ Story watcher is ready and monitoring for new stories');
  });

  watcher.on('error', error => {
    console.error('❌ Story watcher error:', error);
  });

  return watcher;
};

// Function to process existing stories on startup
const processExistingStories = async () => {
  console.log('🔍 Checking existing stories for missing generated content...');
  
  try {
    const stories = readStoriesFromDirectory();
    
    if (stories.length === 0) {
      console.log('📚 No existing stories found');
      return;
    }
    
    console.log(`📚 Found ${stories.length} existing stories, checking for generated content...`);
    
    let processedCount = 0;
    
    for (const story of stories) {
      const storyName = story.characters?.map(c => c.name).join(' & ') || 'Untitled Story';
      console.log(`🔍 Checking story: "${storyName}"`);
      
      try {
        // Find the original file path
        const filename = story.metadata?.filename;
        if (!filename) {
          console.log('⚠️  Could not find filename for story, skipping...');
          continue;
        }
        
        const filepath = path.join(storiesDir, filename);
        
        // Use granular processing to only generate what's missing
        const hadChanges = await processStoryGranularlyWithCheck(story, filepath);
        if (hadChanges) {
          processedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing existing story "${storyName}":`, error.message);
      }
    }
    
    if (processedCount > 0) {
      console.log(`🎉 Successfully generated content for ${processedCount} existing stories`);
    } else {
      console.log('✨ All existing stories already have generated content');
    }
    
  } catch (error) {
    console.error('❌ Error checking existing stories:', error.message);
  }
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
  
  // Initialize story watcher for AI generation
  setupStoryWatcher();
  
  // Check for Gemini API key
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here' || process.env.GEMINI_API_KEY === 'your-actual-gemini-api-key-here') {
    console.log('⚠️  Warning: GEMINI_API_KEY not set. Story generation will not work.');
    console.log('   To enable AI story generation:');
    console.log('   1. Copy: cp env.template .env');
    console.log('   2. Edit .env file with your Gemini API key');
    console.log('   3. Get your API key from: https://aistudio.google.com/app/apikey');
    console.log('   4. Restart the server');
  } else {
    console.log('🤖 AI Story generation enabled with Gemini API');
    
    // Process existing stories in the background (don't block server startup)
    setTimeout(async () => {
      try {
        await processExistingStories();
      } catch (error) {
        console.error('❌ Error in background story processing:', error.message);
      }
    }, 2000); // Wait 2 seconds after server start to let everything initialize
  }
});
