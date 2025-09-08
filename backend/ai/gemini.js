const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-gemini-api-key-here');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize Gemini AI for Image Generation (Nano Banana)
const genAIImage = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'your-gemini-api-key-here'
});

// Story generation function with structured JSON output
const generateStoryWithGemini = async (characters, storyOutline) => {
  try {
    console.log('🤖 Generating story with Gemini AI using structured output...');
    
    const characterDescriptions = characters.map(char => `${char.name}`).join(' and ');
    
    const prompt = `You are a master storyteller. Based on the following information, write an engaging story divided into exactly 10 scenes.

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

    // Define the structured response schema for story generation
    const storySchema = {
      type: "object",
      properties: {
        scenes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sceneNumber: { type: "integer" },
              title: { type: "string" },
              content: { type: "string" }
            },
            required: ["sceneNumber", "title", "content"],
            propertyOrdering: ["sceneNumber", "title", "content"]
          }
        },
        summary: { type: "string" }
      },
      required: ["scenes", "summary"],
      propertyOrdering: ["scenes", "summary"]
    };

    const result = await model.generateContent([prompt], {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: storySchema
      }
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Story generated successfully with structured output');
    
    // Parse the JSON response with fallback for markdown-wrapped responses
    let generatedStory;
    try {
      // Try direct JSON parse first (for proper structured output)
      generatedStory = JSON.parse(text);
    } catch (parseError) {
      // Fallback: clean markdown code blocks if present
      console.log('🔧 Attempting to clean markdown-wrapped JSON...');
      let cleanedText = text.trim();
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try parsing the cleaned text
      try {
        generatedStory = JSON.parse(cleanedText);
        console.log('✅ Successfully parsed cleaned JSON');
      } catch (secondParseError) {
        console.error('❌ Failed to parse even after cleaning:', secondParseError.message);
        console.log('Raw response (first 200 chars):', text.substring(0, 200) + '...');
        throw new Error(`JSON parsing failed: ${secondParseError.message}`);
      }
    }
    
    // Validate and log the structure
    if (generatedStory.scenes && Array.isArray(generatedStory.scenes) && generatedStory.scenes.length > 0) {
      console.log(`📖 Generated story with ${generatedStory.scenes.length} scenes`);
      
      // Log scene details for debugging
      generatedStory.scenes.forEach((scene, index) => {
        const contentLength = scene.content ? scene.content.length : 0;
        const isValid = scene.content && scene.content.trim().length > 10;
        console.log(`   Scene ${index + 1}: "${scene.title}" (${contentLength} chars) ${isValid ? '✅' : '❌ EMPTY'}`);
      });
      
      return generatedStory;
    } else {
      throw new Error('Invalid story structure returned by AI');
    }
  } catch (error) {
    console.error('❌ Error generating story with Gemini:', error.message);
    return {
      scenes: [
        {
          sceneNumber: 1,
          title: "Error",
          content: "Failed to generate story content."
        }
      ],
      summary: "Story generation failed",
      error: error.message
    };
  }
};

// Entity extraction function with structured JSON output
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

    // Define the structured response schema for entity extraction
    const entitySchema = {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              category: { 
                type: "string",
                enum: ["CHARACTERS", "LOCATIONS", "OBJECTS", "ACTIONS", "EMOTIONS", "CONCEPTS"]
              },
              startPos: { type: "integer" },
              endPos: { type: "integer" },
              description: { type: "string" }
            },
            required: ["text", "category", "startPos", "endPos", "description"],
            propertyOrdering: ["text", "category", "startPos", "endPos", "description"]
          }
        },
        totalEntities: { type: "integer" },
        sceneLength: { type: "integer" }
      },
      required: ["entities", "totalEntities", "sceneLength"],
      propertyOrdering: ["entities", "totalEntities", "sceneLength"]
    };

    const result = await model.generateContent([prompt], {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: entitySchema
      }
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Entity extraction completed with structured output');
    
    // Parse the JSON response with fallback for markdown-wrapped responses
    let entityData;
    try {
      // Try direct JSON parse first (for proper structured output)
      entityData = JSON.parse(text);
    } catch (parseError) {
      // Fallback: clean markdown code blocks if present
      console.log('🔧 Attempting to clean markdown-wrapped JSON...');
      let cleanedText = text.trim();
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try parsing the cleaned text
      try {
        entityData = JSON.parse(cleanedText);
        console.log('✅ Successfully parsed cleaned JSON');
      } catch (secondParseError) {
        console.error('❌ Failed to parse even after cleaning:', secondParseError.message);
        console.log('Raw response (first 200 chars):', text.substring(0, 200) + '...');
        throw new Error(`JSON parsing failed: ${secondParseError.message}`);
      }
    }
    
    // Validate and enhance the structure
    if (entityData.entities && Array.isArray(entityData.entities)) {
      // Ensure scene length is set correctly
      entityData.sceneLength = sceneContent.length;
      entityData.totalEntities = entityData.entities.length;
      
      console.log(`📊 Extracted ${entityData.totalEntities} entities from scene "${sceneTitle}"`);
      
      // Log entity breakdown for debugging
      const entityCounts = entityData.entities.reduce((acc, entity) => {
        acc[entity.category] = (acc[entity.category] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(entityCounts).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} entities`);
      });
      
      return entityData;
    } else {
      throw new Error('Invalid entity structure returned by AI');
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

// Generate image prompts from scene content
const generateImagePromptFromScene = (sceneContent, sceneTitle, characters) => {
  const characterNames = characters.map(char => char.name).join(', ');
  
  // Create two different prompts for variety
  const prompts = [
    `Create a cinematic still from the scene "${sceneTitle}". Characters: ${characterNames}. Scene: ${sceneContent.substring(0, 300)}... Style: photorealistic, dramatic lighting, wide shot`,
    `Create an artistic interpretation of "${sceneTitle}". Characters: ${characterNames}. Focus on the key moment from: ${sceneContent.substring(0, 300)}... Style: cinematic, detailed, close-up or medium shot`
  ];
  
  return prompts;
};

// Generate images for a scene using Nano Banana
const generateSceneImages = async (sceneContent, sceneTitle, characters) => {
  try {
    console.log(`🎨 Generating images for scene: "${sceneTitle}"`);
    
    const prompts = generateImagePromptFromScene(sceneContent, sceneTitle, characters);
    const images = [];
    
    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`   🖼️ Generating image ${i + 1}/2...`);
        
        const imageResult = await genAIImage.generateImage({
          model: 'gemini-2.5-flash-image-preview',
          prompt: prompts[i]
        });
        
        if (imageResult.image) {
          images.push({
            imageNumber: i + 1,
            prompt: prompts[i],
            imageData: imageResult.image, // This should be base64 data
            generatedAt: new Date().toISOString()
          });
          console.log(`   ✅ Image ${i + 1} generated successfully`);
        } else {
          console.log(`   ❌ No image data returned for image ${i + 1}`);
          images.push({
            imageNumber: i + 1,
            prompt: prompts[i],
            error: 'No image data returned from AI',
            generatedAt: new Date().toISOString()
          });
        }
      } catch (imageError) {
        console.error(`   ❌ Error generating image ${i + 1}:`, imageError.message);
        images.push({
          imageNumber: i + 1,
          prompt: prompts[i],
          error: imageError.message,
          generatedAt: new Date().toISOString()
        });
      }
    }
    
    const successfulImages = images.filter(img => !img.error);
    console.log(`✅ Generated ${successfulImages.length}/${prompts.length} images for scene "${sceneTitle}"`);
    
    return images;
  } catch (error) {
    console.error(`❌ Error in scene image generation for "${sceneTitle}":`, error.message);
    return [
      {
        imageNumber: 1,
        error: error.message,
        generatedAt: new Date().toISOString()
      },
      {
        imageNumber: 2,
        error: error.message,
        generatedAt: new Date().toISOString()
      }
    ];
  }
};

// Separate generation functions for modular processing
const generateScenesOnly = async (characters, storyOutline) => {
  console.log('📝 Generating story scenes only...');
  return await generateStoryWithGemini(characters, storyOutline);
};

const generateEntitiesOnly = async (scenes, characterNames = []) => {
  console.log('🔍 Extracting entities only...');
  
  const scenesWithEntities = [];
  
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index];
    
    try {
      console.log(`🎬 Extracting entities from scene ${index + 1}: ${scene.title}`);
      
      const entityData = await extractEntitiesFromScene(
        scene.content, 
        scene.title, 
        characterNames
      );
      
      scenesWithEntities.push({
        ...scene,
        entities: entityData
      });
      
    } catch (error) {
      console.error(`❌ Error extracting entities from scene ${index + 1}:`, error.message);
      scenesWithEntities.push({
        ...scene,
        entities: {
          entities: [],
          totalEntities: 0,
          sceneLength: scene.content ? scene.content.length : 0,
          error: error.message
        }
      });
    }
  }
  
  return scenesWithEntities;
};

const generateImagesOnly = async (scenes, characters) => {
  console.log('🎨 Generating images only...');
  
  const scenesWithImages = [];
  
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index];
    
    try {
      console.log(`🖼️ Generating images for scene ${index + 1}: ${scene.title}`);
      
      const sceneImages = await generateSceneImages(scene.content, scene.title, characters);
      
      scenesWithImages.push({
        ...scene,
        images: sceneImages
      });
      
    } catch (error) {
      console.error(`❌ Error generating images for scene ${index + 1}:`, error.message);
      scenesWithImages.push({
        ...scene,
        images: [
          {
            imageNumber: 1,
            error: error.message,
            generatedAt: new Date().toISOString()
          },
          {
            imageNumber: 2,
            error: error.message,
            generatedAt: new Date().toISOString()
          }
        ]
      });
    }
  }
  
  return scenesWithImages;
};

module.exports = {
  generateStoryWithGemini,
  extractEntitiesFromScene,
  generateSceneImages,
  generateScenesOnly,
  generateEntitiesOnly,
  generateImagesOnly,
  generateImagePromptFromScene
};
