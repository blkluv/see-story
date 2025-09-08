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

// Generate image prompts and reference data from scene content
const generateImagePromptFromScene = (sceneContent, sceneTitle, characters) => {
  const characterNames = characters.map(char => char.name).join(', ');
  
  // Get character images that have valid photo data
  const charactersWithImages = characters.filter(char => 
    char.photoData && 
    char.photoData.base64Data && 
    !char.photoData.error
  );
  
  // Create character description for prompts
  let characterDescription = '';
  if (charactersWithImages.length > 0) {
    characterDescription = `Use the provided reference images of ${charactersWithImages.map(c => c.name).join(' and ')} as character likenesses. `;
  }
  
  // Create two different prompts for variety
  const prompts = [
    {
      text: `${characterDescription}Create a cinematic still from the scene "${sceneTitle}". Characters: ${characterNames}. Scene: ${sceneContent.substring(0, 300)}... Style: photorealistic, dramatic lighting, wide shot. Maintain character appearance from reference images.`,
      referenceImages: charactersWithImages.map(char => ({
        name: char.name,
        data: char.photoData.base64Data,
        mimeType: char.photoData.mimeType
      }))
    },
    {
      text: `${characterDescription}Create an artistic interpretation of "${sceneTitle}". Characters: ${characterNames}. Focus on the key moment from: ${sceneContent.substring(0, 300)}... Style: cinematic, detailed, close-up or medium shot. Keep character faces consistent with reference images.`,
      referenceImages: charactersWithImages.map(char => ({
        name: char.name,
        data: char.photoData.base64Data,
        mimeType: char.photoData.mimeType
      }))
    }
  ];
  
  console.log(`📷 Found ${charactersWithImages.length} character reference images for scene "${sceneTitle}"`);
  
  return prompts;
};

// Generate images for a scene using Gemini with character reference images
const generateSceneImages = async (sceneContent, sceneTitle, characters) => {
  try {
    console.log(`🎨 Generating images for scene: "${sceneTitle}"`);
    
    const promptData = generateImagePromptFromScene(sceneContent, sceneTitle, characters);
    const images = [];
    
    for (let i = 0; i < promptData.length; i++) {
      try {
        console.log(`   🖼️ Generating image ${i + 1}/2...`);
        const prompt = promptData[i];
        
        // Prepare the multi-modal request parts
        const parts = [
          {
            text: prompt.text
          }
        ];
        
        // Add character reference images if available
        if (prompt.referenceImages && prompt.referenceImages.length > 0) {
          console.log(`   📷 Including ${prompt.referenceImages.length} character reference images`);
          prompt.referenceImages.forEach((refImage, idx) => {
            parts.push({
              inlineData: {
                data: refImage.data,
                mimeType: refImage.mimeType || 'image/jpeg'
              }
            });
            console.log(`     - Character: ${refImage.name}`);
          });
        }
        
        // Use Gemini's multimodal model for image generation with references
        const request = {
          contents: [{
            role: 'user',
            parts: parts
          }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          }
        };
        
        console.log(`   🤖 Sending request to Gemini with ${parts.length} parts (text + ${parts.length - 1} images)`);
        
        // Generate image using the standard Gemini model first to get a description
        // Then use that description with the image generation model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const descriptionPrompt = `${prompt.text}\n\nCreate a detailed visual description for an image generation AI, focusing on:
1. Character appearance (use the reference images provided)
2. Scene composition and lighting  
3. Specific visual details from the story
4. Art style and mood

Respond with just the image generation prompt, no explanation.`;
        
        const descriptionResult = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: descriptionPrompt },
              ...parts.slice(1) // Include reference images
            ]
          }]
        });
        
        const enhancedPrompt = descriptionResult.response.text();
        console.log(`   📝 Generated enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
        
        // Generate actual image using Gemini image generation
        console.log(`   🖼️ Generating image using Gemini 2.5 Flash Image model...`);
        
        try {
          // Try multiple approaches for Gemini image generation
          let base64Image = null;
          let mimeType = 'image/png';
          let generatedWith = 'Unknown';
          
          // Approach 1: Try using GoogleGenAI for image generation
          try {
            console.log(`   🔄 Attempting Gemini image generation (Method 1)...`);
            const imageGenerationResponse = await genAIImage.generateContent({
              model: 'gemini-2.5-flash-image-preview',
              contents: [{
                role: 'user', 
                parts: [{ text: enhancedPrompt }]
              }],
              generationConfig: {
                temperature: 0.8,
                candidateCount: 1
              }
            });
            
            if (imageGenerationResponse?.response?.candidates?.[0]?.content?.parts) {
              for (const part of imageGenerationResponse.response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                  base64Image = part.inlineData.data;
                  mimeType = part.inlineData.mimeType || 'image/png';
                  generatedWith = 'GoogleGenAI - Gemini 2.5 Flash Image';
                  break;
                }
              }
            }
          } catch (method1Error) {
            console.log(`   ⚠️ Method 1 failed: ${method1Error.message}`);
          }
          
          // Approach 2: Try using GoogleGenerativeAI with image model
          if (!base64Image) {
            try {
              console.log(`   🔄 Attempting Gemini image generation (Method 2)...`);
              const imageModel = genAI.getGenerativeModel({ 
                model: 'gemini-2.5-flash-image-preview'
              });
              
              const imageGenerationResponse = await imageModel.generateContent([enhancedPrompt]);
              
              if (imageGenerationResponse?.response?.candidates?.[0]?.content?.parts) {
                for (const part of imageGenerationResponse.response.candidates[0].content.parts) {
                  if (part.inlineData?.data) {
                    base64Image = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || 'image/png';
                    generatedWith = 'GoogleGenerativeAI - Gemini 2.5 Flash Image';
                    break;
                  }
                }
              }
            } catch (method2Error) {
              console.log(`   ⚠️ Method 2 failed: ${method2Error.message}`);
            }
          }
          
          if (base64Image) {
            images.push({
              imageNumber: i + 1,
              prompt: prompt.text,
              enhancedPrompt: enhancedPrompt,
              characterReferences: prompt.referenceImages ? prompt.referenceImages.length : 0,
              imageData: base64Image,
              base64Data: base64Image,
              mimeType: mimeType,
              generatedWith: generatedWith,
              generatedAt: new Date().toISOString()
            });
            console.log(`   ✅ Generated AI image ${i + 1} with ${generatedWith} (${prompt.referenceImages?.length || 0} character references used)`);
          } else {
            throw new Error('No image data received from any Gemini API method');
          }
        } catch (imageGenerationError) {
          console.error(`   ❌ Failed to generate AI image ${i + 1}:`, imageGenerationError.message);
          
          // Fallback: create a simple colored rectangle as base64
          const fallbackBase64 = createFallbackImage(sceneTitle);
          
          images.push({
            imageNumber: i + 1,
            prompt: prompt.text,
            enhancedPrompt: enhancedPrompt,
            characterReferences: prompt.referenceImages ? prompt.referenceImages.length : 0,
            imageData: fallbackBase64,
            base64Data: fallbackBase64,
            mimeType: 'image/png',
            fallback: true,
            error: 'Gemini image generation failed: ' + imageGenerationError.message,
            generatedAt: new Date().toISOString()
          });
        }
      } catch (imageError) {
        console.error(`   ❌ Error generating image ${i + 1}:`, imageError.message);
        images.push({
          imageNumber: i + 1,
          prompt: promptData[i].text,
          characterReferences: promptData[i].referenceImages ? promptData[i].referenceImages.length : 0,
          error: imageError.message,
          generatedAt: new Date().toISOString()
        });
      }
    }
    
    const successfulImages = images.filter(img => !img.error);
    const totalCharacterRefs = images.reduce((sum, img) => sum + (img.characterReferences || 0), 0);
    console.log(`✅ Generated ${successfulImages.length}/${promptData.length} images for scene "${sceneTitle}" (${totalCharacterRefs} character references used)`);
    
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

// Create a fallback base64 image when Gemini image generation fails
const createFallbackImage = (sceneTitle) => {
  // Create a simple 1x1 pixel PNG as base64 (transparent)
  // This is a minimal valid PNG file
  const transparentPixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  console.log(`   🔄 Created fallback image for scene: "${sceneTitle}"`);
  return transparentPixelPng;
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
