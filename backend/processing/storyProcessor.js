const fs = require('fs');
const path = require('path');
const { 
  generateStoryWithGemini, 
  extractEntitiesFromScene, 
  generateSceneImages,
  generateScenesOnly,
  generateEntitiesOnly,
  generateImagesOnly 
} = require('../ai/gemini');

// Story validation and analysis functions
const validateStoryCompleteness = (story) => {
  const validation = {
    hasScenes: false,
    hasValidScenes: false,
    hasEntities: false,
    hasImages: false,
    emptyScenes: [],
    entityErrors: [],
    imageErrors: [],
    totalScenes: 0,
    validScenes: 0,
    totalEntities: 0,
    totalImages: 0
  };

  if (!story.generatedStory) {
    console.log('📋 Story validation: No generatedStory found');
    return validation;
  }

  const generatedStory = story.generatedStory;
  
  // Check scenes
  if (generatedStory.scenes && Array.isArray(generatedStory.scenes)) {
    validation.hasScenes = true;
    validation.totalScenes = generatedStory.scenes.length;
    
    generatedStory.scenes.forEach((scene, index) => {
      if (!scene.content || scene.content.trim().length < 10) {
        validation.emptyScenes.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title || `Scene ${index + 1}`,
          issue: 'Empty or too short content'
        });
      } else {
        validation.validScenes++;
      }
      
      // Check entities for this scene
      if (!scene.entities) {
        // Scene is missing entities entirely
        validation.entityErrors.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title,
          error: 'Missing entities key - needs entity extraction'
        });
      } else if (scene.entities.error) {
        // Scene has entities but with an error
        validation.entityErrors.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title,
          error: scene.entities.error
        });
      } else if (!scene.entities.entities || !Array.isArray(scene.entities.entities) || scene.entities.entities.length === 0) {
        // Scene has entities object but no actual entities array or it's empty
        validation.entityErrors.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title,
          error: 'Empty or invalid entities array - needs entity extraction'
        });
      } else {
        // Scene has valid entities
        validation.totalEntities += scene.entities.entities.length;
      }
      
      // Check images for this scene
      if (!scene.images) {
        // Scene is missing images entirely
        validation.imageErrors.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title,
          errors: ['Missing images key - needs image generation']
        });
      } else if (!Array.isArray(scene.images) || scene.images.length === 0) {
        // Scene has images key but no actual images array or it's empty
        validation.imageErrors.push({
          sceneNumber: scene.sceneNumber || index + 1,
          title: scene.title,
          errors: ['Empty or invalid images array - needs image generation']
        });
      } else {
        // Scene has images array, check for valid vs error images
        const validImages = scene.images.filter(img => !img.error);
        const errorImages = scene.images.filter(img => img.error);
        
        validation.totalImages += validImages.length;
        
        if (errorImages.length > 0) {
          validation.imageErrors.push({
            sceneNumber: scene.sceneNumber || index + 1,
            title: scene.title,
            errors: errorImages.map(img => img.error || 'Unknown image error')
          });
        }
      }
    });
    
    validation.hasValidScenes = validation.validScenes > 0;
    validation.hasEntities = validation.totalEntities > 0;
    validation.hasImages = validation.totalImages > 0;
  }

  // Log validation results
  console.log(`📋 Story validation results:`);
  console.log(`   ✅ Scenes: ${validation.validScenes}/${validation.totalScenes} valid`);
  console.log(`   📊 Entities: ${validation.totalEntities} total`);
  console.log(`   🖼️ Images: ${validation.totalImages} total`);
  
  if (validation.emptyScenes.length > 0) {
    console.log(`   ❌ Empty scenes: ${validation.emptyScenes.length}`);
  }
  if (validation.entityErrors.length > 0) {
    console.log(`   ❌ Entity errors: ${validation.entityErrors.length}`);
  }
  if (validation.imageErrors.length > 0) {
    console.log(`   ❌ Image errors: ${validation.imageErrors.length}`);
  }

  return validation;
};

const regenerateFailedScenes = async (story, validation, characters, storyOutline) => {
  console.log('🔧 Regenerating failed scenes...');
  
  if (validation.emptyScenes.length === 0) {
    console.log('   No empty scenes to regenerate');
    return story.generatedStory;
  }

  // For now, if we have empty scenes, regenerate the entire story
  // In the future, we could implement scene-by-scene regeneration
  console.log(`   🔄 Regenerating entire story due to ${validation.emptyScenes.length} empty scenes`);
  
  return await generateStoryWithGemini(characters, storyOutline);
};

const regenerateFailedEntities = async (story, validation, characters) => {
  console.log('🔧 Regenerating failed entities...');
  
  if (validation.entityErrors.length === 0 && validation.totalEntities > 0) {
    console.log('   No entity errors to fix');
    return story.generatedStory;
  }

  const characterNames = characters.map(char => char.name);
  let updatedStory = { ...story.generatedStory };
  
  // Regenerate entities for scenes that have errors or no entities
  const scenesToProcess = updatedStory.scenes.filter((scene, index) => {
    return !scene.entities || 
           scene.entities.error || 
           !scene.entities.entities || 
           scene.entities.entities.length === 0;
  });
  
  if (scenesToProcess.length > 0) {
    console.log(`   🔄 Regenerating entities for ${scenesToProcess.length} scenes`);
    
    for (const scene of scenesToProcess) {
      try {
        console.log(`   Processing entities for scene: "${scene.title}"`);
        const entityData = await extractEntitiesFromScene(
          scene.content, 
          scene.title, 
          characterNames
        );
        
        // Update the scene with new entity data
        const sceneIndex = updatedStory.scenes.findIndex(s => s.sceneNumber === scene.sceneNumber);
        if (sceneIndex !== -1) {
          updatedStory.scenes[sceneIndex].entities = entityData;
        }
      } catch (error) {
        console.error(`   ❌ Failed to regenerate entities for scene "${scene.title}":`, error.message);
      }
    }
    
    // Update entity metadata
    const totalEntities = updatedStory.scenes.reduce((total, scene) => 
      total + (scene.entities?.totalEntities || 0), 0);
    
    updatedStory.entityMetadata = {
      totalEntitiesAcrossScenes: totalEntities,
      scenesProcessed: updatedStory.scenes.length,
      entitiesPerScene: updatedStory.scenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        entityCount: scene.entities?.totalEntities || 0
      }))
    };
  }

  return updatedStory;
};

const regenerateFailedImages = async (story, validation, characters) => {
  console.log('🔧 Regenerating failed images...');
  
  if (validation.imageErrors.length === 0 && validation.totalImages > 0) {
    console.log('   No image errors to fix');
    return story.generatedStory;
  }

  let updatedStory = { ...story.generatedStory };
  
  // Regenerate images for scenes that have errors or no images
  const scenesToProcess = updatedStory.scenes.filter(scene => {
    return !scene.images || 
           scene.images.length === 0 || 
           scene.images.every(img => img.error);
  });
  
  if (scenesToProcess.length > 0) {
    console.log(`   🔄 Regenerating images for ${scenesToProcess.length} scenes`);
    
    for (const scene of scenesToProcess) {
      try {
        console.log(`   Processing images for scene: "${scene.title}"`);
        const sceneImages = await generateSceneImages(scene.content, scene.title, characters);
        
        // Update the scene with new image data
        const sceneIndex = updatedStory.scenes.findIndex(s => s.sceneNumber === scene.sceneNumber);
        if (sceneIndex !== -1) {
          updatedStory.scenes[sceneIndex].images = sceneImages;
        }
      } catch (error) {
        console.error(`   ❌ Failed to regenerate images for scene "${scene.title}":`, error.message);
      }
    }
    
    // Update image metadata
    const totalSuccessfulImages = updatedStory.scenes.reduce((total, scene) => 
      total + (scene.images?.filter(img => !img.error).length || 0), 0);
    
    updatedStory.imageMetadata = {
      totalImagesGenerated: totalSuccessfulImages,
      totalImageAttempts: updatedStory.scenes.reduce((total, scene) => 
        total + (scene.images?.length || 0), 0),
      scenesProcessed: updatedStory.scenes.length,
      imagesPerScene: updatedStory.scenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        successfulImages: scene.images?.filter(img => !img.error).length || 0,
        failedImages: scene.images?.filter(img => img.error).length || 0
      }))
    };
  }

  return updatedStory;
};

// Enhanced granular processing with validation and smart regeneration
const processStoryGranularlyWithCheck = async (storyData, filepath, { updateStoryWithGeneratedContent }) => {
  try {
    const characters = storyData.characters || [];
    const storyOutline = storyData.story?.outline || 'A mysterious adventure begins...';
    const storyName = characters.map(char => char.name).join(' & ') || 'Unnamed Story';
    
    console.log(`🔍 Processing story: "${storyName}"`);
    
    // First, validate the current state of the story
    const validation = validateStoryCompleteness(storyData);
    
    let currentGeneratedStory = { ...storyData.generatedStory } || {};
    let hasChanges = false;
    
    // Step 1: Handle scenes (generate if missing or regenerate if empty)
    if (!validation.hasScenes) {
      console.log('📝 No scenes found - generating complete story...');
      currentGeneratedStory = await generateScenesOnly(characters, storyOutline);
      hasChanges = true;
      console.log('✅ Complete story generated');
    } else if (validation.emptyScenes.length > 0) {
      console.log(`📝 Found ${validation.emptyScenes.length} empty/invalid scenes - regenerating...`);
      currentGeneratedStory = await regenerateFailedScenes({
        ...storyData,
        generatedStory: currentGeneratedStory
      }, validation, characters, storyOutline);
      hasChanges = true;
    } else {
      console.log(`✅ All ${validation.totalScenes} scenes are valid`);
    }
    
    // Step 2: Handle entities (extract if missing or fix errors)
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      if (validation.totalEntities === 0) {
        console.log('🔍 No entities found - extracting for all scenes...');
        const scenesWithEntities = await generateEntitiesOnly(
          currentGeneratedStory.scenes,
          characters.map(char => char.name)
        );
        currentGeneratedStory.scenes = scenesWithEntities;
        hasChanges = true;
        
        // Update entity metadata
        const totalEntities = scenesWithEntities.reduce((total, scene) => 
          total + (scene.entities?.totalEntities || 0), 0);
        
        currentGeneratedStory.entityMetadata = {
          totalEntitiesAcrossScenes: totalEntities,
          scenesProcessed: scenesWithEntities.length,
          entitiesPerScene: scenesWithEntities.map(scene => ({
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            entityCount: scene.entities?.totalEntities || 0
          }))
        };
        
        console.log(`✅ Extracted entities for all scenes (${totalEntities} total)`);
      } else if (validation.entityErrors.length > 0) {
        console.log(`🔧 Found ${validation.entityErrors.length} entity errors - fixing...`);
        currentGeneratedStory = await regenerateFailedEntities({
          ...storyData,
          generatedStory: currentGeneratedStory
        }, validation, characters);
        hasChanges = true;
      } else {
        console.log(`✅ All scenes have valid entities (${validation.totalEntities} total)`);
      }
    }
    
    // Step 3: Handle images (generate if missing or fix errors)
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      if (validation.totalImages === 0) {
        console.log('🎨 No images found - generating for all scenes...');
        const scenesWithImages = await generateImagesOnly(
          currentGeneratedStory.scenes,
          characters
        );
        currentGeneratedStory.scenes = scenesWithImages;
        hasChanges = true;
        
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
        
        console.log(`✅ Generated images for all scenes (${totalSuccessfulImages} total)`);
      } else if (validation.imageErrors.length > 0) {
        console.log(`🔧 Found ${validation.imageErrors.length} image errors - fixing...`);
        currentGeneratedStory = await regenerateFailedImages({
          ...storyData,
          generatedStory: currentGeneratedStory
        }, validation, characters);
        hasChanges = true;
      } else {
        console.log(`✅ All scenes have valid images (${validation.totalImages} total)`);
      }
    }
    
    // Final validation to check if story is now playable
    const finalValidation = validateStoryCompleteness({ ...storyData, generatedStory: currentGeneratedStory });
    const isPlayable = finalValidation.hasValidScenes && 
                       finalValidation.hasEntities && 
                       finalValidation.hasImages;
    
    console.log(`🎯 Story "${storyName}" is ${isPlayable ? '✅ PLAYABLE' : '❌ NOT PLAYABLE'}`);
    
    // Update the file if there were any changes
    if (hasChanges) {
      console.log('💾 Updating story file with new content...');
      await updateStoryWithGeneratedContent(filepath, currentGeneratedStory);
      console.log('✅ Story file updated successfully');
    } else {
      console.log('✅ All content already complete, no updates needed');
    }
    
    return hasChanges;
    
  } catch (error) {
    console.error('❌ Error in enhanced granular story processing:', error.message);
    return false;
  }
};

// Enhanced startup processing with detailed logging
const processExistingStories = async ({ readStoriesFromDirectory, validateStoryCompleteness, processStoryGranularlyWithCheck, storiesDir }) => {
  console.log('🔍 Checking existing stories for missing generated content...');
  
  try {
    const stories = readStoriesFromDirectory();
    
    if (stories.length === 0) {
      console.log('📚 No existing stories found');
      return;
    }
    
    // Quick analysis of all stories first
    const storyAnalysis = stories.map(story => {
      const storyName = story.characters?.map(c => c.name).join(' & ') || 'Untitled Story';
      const validation = validateStoryCompleteness(story);
      return {
        name: storyName,
        validation,
        story,
        needsProcessing: !validation.hasValidScenes || 
                        !validation.hasEntities || 
                        !validation.hasImages ||
                        validation.emptyScenes.length > 0 ||
                        validation.entityErrors.length > 0 ||
                        validation.imageErrors.length > 0
      };
    });
    
    const needsProcessing = storyAnalysis.filter(s => s.needsProcessing);
    const alreadyComplete = storyAnalysis.filter(s => !s.needsProcessing);
    
    console.log(`📚 Story Analysis Summary:`);
    console.log(`   ✅ Complete & playable: ${alreadyComplete.length} stories`);
    console.log(`   🔄 Need processing: ${needsProcessing.length} stories`);
    
    if (alreadyComplete.length > 0) {
      console.log(`   Complete stories: ${alreadyComplete.map(s => s.name).join(', ')}`);
    }
    
    if (needsProcessing.length === 0) {
      console.log('✨ All existing stories are complete and playable!');
      return;
    }
    
    console.log(`\n🔄 Processing ${needsProcessing.length} incomplete stories...`);
    
    let processedCount = 0;
    let successfullyCompleted = 0;
    
    for (const storyInfo of needsProcessing) {
      const { name: storyName, story, validation } = storyInfo;
      
      console.log(`\n📖 Processing: "${storyName}"`);
      console.log(`   Missing - Scenes: ${!validation.hasValidScenes}, Entities: ${!validation.hasEntities}, Images: ${!validation.hasImages}`);
      
      if (validation.emptyScenes.length > 0) {
        console.log(`   🚨 ${validation.emptyScenes.length} empty scenes need regeneration`);
      }
      if (validation.entityErrors.length > 0) {
        console.log(`   🚨 ${validation.entityErrors.length} entity errors need fixing`);
      }
      if (validation.imageErrors.length > 0) {
        console.log(`   🚨 ${validation.imageErrors.length} image errors need fixing`);
      }
      
      try {
        // Find the original file path
        const filename = story.metadata?.filename;
        if (!filename) {
          console.log('   ⚠️ Could not find filename, skipping...');
          continue;
        }
        
        const filepath = path.join(storiesDir, filename);
        
        // Use enhanced granular processing
        const hadChanges = await processStoryGranularlyWithCheck(story, filepath, {
          updateStoryWithGeneratedContent: require('../utils/fileUtils').updateStoryWithGeneratedContent
        });
        if (hadChanges) {
          processedCount++;
          
          // Check if story is now complete
          const updatedStory = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          const finalValidation = validateStoryCompleteness(updatedStory);
          const isNowPlayable = finalValidation.hasValidScenes && 
                               finalValidation.hasEntities && 
                               finalValidation.hasImages;
          
          if (isNowPlayable) {
            successfullyCompleted++;
            console.log(`   🎉 "${storyName}" is now complete and playable!`);
          } else {
            console.log(`   ⚠️ "${storyName}" still has issues after processing`);
          }
        } else {
          console.log(`   ✅ "${storyName}" was already complete`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing "${storyName}":`, error.message);
      }
    }
    
    console.log(`\n🏁 Processing Summary:`);
    console.log(`   🔄 Stories processed: ${processedCount}`);
    console.log(`   ✅ Now playable: ${successfullyCompleted}`);
    console.log(`   📊 Total playable stories: ${alreadyComplete.length + successfullyCompleted}/${stories.length}`);
    
    if (successfullyCompleted > 0) {
      console.log(`🎉 Successfully completed ${successfullyCompleted} stories that are now ready to play!`);
    }
    
  } catch (error) {
    console.error('❌ Error in startup story processing:', error.message);
  }
};

module.exports = {
  validateStoryCompleteness,
  regenerateFailedScenes,
  regenerateFailedEntities,
  regenerateFailedImages,
  processStoryGranularlyWithCheck,
  processExistingStories
};
