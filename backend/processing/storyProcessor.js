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
const { generateCompleteStoryAudio } = require('../ai/tts');

// Story validation and analysis functions
const validateStoryCompleteness = (story) => {
  const validation = {
    hasScenes: false,
    hasValidScenes: false,
    hasEntities: false,
    hasImages: false,
    hasAudio: false,
    emptyScenes: [],
    entityErrors: [],
    imageErrors: [],
    audioErrors: [],
    totalScenes: 0,
    validScenes: 0,
    totalEntities: 0,
    totalImages: 0,
    audioStatus: null
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

  // Check audio (both JSON data and actual file)
  if (generatedStory.audio) {
    if (generatedStory.audio.error) {
      validation.audioErrors.push({
        error: generatedStory.audio.error,
        generatedAt: generatedStory.audio.generatedAt
      });
      validation.audioStatus = 'error';
    } else if (generatedStory.audio.audioBase64 && generatedStory.audio.audioBase64.length > 0) {
      // Check if the actual audio file exists
      const audioPath = generatedStory.audio.audioPath;
      if (audioPath && fs.existsSync(audioPath)) {
        // Check if the file has proper size (should be more than 100kb for 10 minutes)
        const stats = fs.statSync(audioPath);
        const fileSizeKB = stats.size / 1024;
        
        if (fileSizeKB < 50) { // Less than 50kb indicates incomplete audio
          validation.audioErrors.push({
            error: `Audio file too small: ${fileSizeKB.toFixed(1)}KB (expected >50KB)`,
            filePath: audioPath
          });
          validation.audioStatus = 'incomplete';
        } else {
          validation.hasAudio = true;
          if (generatedStory.audio.placeholder) {
            validation.audioStatus = 'placeholder';
          } else {
            validation.audioStatus = 'complete';
          }
        }
      } else {
        validation.audioErrors.push({
          error: 'Audio file missing from disk',
          expectedPath: audioPath
        });
        validation.audioStatus = 'file_missing';
      }
    } else {
      validation.audioStatus = 'empty';
    }
  } else {
    validation.audioStatus = 'missing';
  }

  // Log validation results
  console.log(`📋 Story validation results:`);
  console.log(`   ✅ Scenes: ${validation.validScenes}/${validation.totalScenes} valid`);
  console.log(`   📊 Entities: ${validation.totalEntities} total`);
  console.log(`   🖼️ Images: ${validation.totalImages} total`);
  if (validation.audioStatus === 'placeholder') {
    console.log(`   🎵 Audio: ${validation.audioStatus} (silent audio - TTS not yet available)`);
  } else if (validation.audioStatus === 'incomplete') {
    console.log(`   🎵 Audio: ${validation.audioStatus} (file too small)`);
  } else if (validation.audioStatus === 'file_missing') {
    console.log(`   🎵 Audio: ${validation.audioStatus} (file deleted from disk)`);
  } else {
    console.log(`   🎵 Audio: ${validation.audioStatus}`);
  }
  
  if (validation.emptyScenes.length > 0) {
    console.log(`   ❌ Empty scenes: ${validation.emptyScenes.length}`);
  }
  if (validation.entityErrors.length > 0) {
    console.log(`   ❌ Entity errors: ${validation.entityErrors.length}`);
  }
  if (validation.imageErrors.length > 0) {
    console.log(`   ❌ Image errors: ${validation.imageErrors.length}`);
  }
  if (validation.audioErrors.length > 0) {
    console.log(`   ❌ Audio errors: ${validation.audioErrors.length}`);
  }

  return validation;
};

// Generate audio only for existing scenes
const generateAudioOnly = async (scenes, storyId) => {
  console.log('🎵 Generating audio for existing story...');
  
  try {
    const audioResult = await generateCompleteStoryAudio(scenes, storyId);
    console.log('✅ Audio generation completed successfully');
    return audioResult;
  } catch (error) {
    console.error('❌ Audio generation failed:', error.message);
    return {
      error: error.message,
      generatedAt: new Date().toISOString()
    };
  }
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
const processStoryGranularlyWithCheck = async (storyData, filepath, { updateStoryWithGeneratedContent, updateStoryIncremental }) => {
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
      
      // Save scenes incrementally
      if (updateStoryIncremental) {
        await updateStoryIncremental(filepath, {
          scenes: currentGeneratedStory.scenes,
          title: currentGeneratedStory.title,
          summary: currentGeneratedStory.summary
        }, 'scenes-generated');
      }
    } else if (validation.emptyScenes.length > 0) {
      console.log(`📝 Found ${validation.emptyScenes.length} empty/invalid scenes - regenerating...`);
      currentGeneratedStory = await regenerateFailedScenes({
        ...storyData,
        generatedStory: currentGeneratedStory
      }, validation, characters, storyOutline);
      hasChanges = true;
      
      // Save regenerated scenes incrementally
      if (updateStoryIncremental) {
        await updateStoryIncremental(filepath, {
          scenes: currentGeneratedStory.scenes,
          title: currentGeneratedStory.title,
          summary: currentGeneratedStory.summary
        }, 'scenes-regenerated');
      }
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
        
        // Save entities incrementally
        if (updateStoryIncremental) {
          await updateStoryIncremental(filepath, {
            scenes: currentGeneratedStory.scenes,
            entityMetadata: currentGeneratedStory.entityMetadata
          }, 'entities-generated');
        }
      } else if (validation.entityErrors.length > 0) {
        console.log(`🔧 Found ${validation.entityErrors.length} entity errors - fixing...`);
        currentGeneratedStory = await regenerateFailedEntities({
          ...storyData,
          generatedStory: currentGeneratedStory
        }, validation, characters);
        hasChanges = true;
        
        // Save regenerated entities incrementally
        if (updateStoryIncremental) {
          await updateStoryIncremental(filepath, {
            scenes: currentGeneratedStory.scenes,
            entityMetadata: currentGeneratedStory.entityMetadata
          }, 'entities-regenerated');
        }
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
        
        // Save images incrementally
        if (updateStoryIncremental) {
          await updateStoryIncremental(filepath, {
            scenes: currentGeneratedStory.scenes,
            imageMetadata: currentGeneratedStory.imageMetadata
          }, 'images-generated');
        }
      } else if (validation.imageErrors.length > 0) {
        console.log(`🔧 Found ${validation.imageErrors.length} image errors - fixing...`);
        currentGeneratedStory = await regenerateFailedImages({
          ...storyData,
          generatedStory: currentGeneratedStory
        }, validation, characters);
        hasChanges = true;
        
        // Save regenerated images incrementally
        if (updateStoryIncremental) {
          await updateStoryIncremental(filepath, {
            scenes: currentGeneratedStory.scenes,
            imageMetadata: currentGeneratedStory.imageMetadata
          }, 'images-regenerated');
        }
      } else {
        console.log(`✅ All scenes have valid images (${validation.totalImages} total)`);
      }
    }
    
    // Step 4: Handle audio (generate if missing, incomplete, or fix errors)
    if (currentGeneratedStory.scenes && currentGeneratedStory.scenes.length > 0) {
      const needsAudioRegeneration = !validation.hasAudio || 
                                    validation.audioStatus === 'missing' || 
                                    validation.audioStatus === 'error' ||
                                    validation.audioStatus === 'file_missing' ||
                                    validation.audioStatus === 'incomplete' ||
                                    validation.audioStatus === 'empty';
      
      if (needsAudioRegeneration) {
        console.log(`🎵 Audio needs regeneration (status: ${validation.audioStatus}) - generating complete story audio...`);
        
        if (validation.audioErrors.length > 0) {
          validation.audioErrors.forEach(audioError => {
            console.log(`   🚨 Audio issue: ${audioError.error}`);
          });
        }
        
        // Extract story ID from the file path for audio generation
        const storyId = path.basename(filepath, '.json').replace('story_', '');
        
        const audioResult = await generateAudioOnly(currentGeneratedStory.scenes, storyId);
        currentGeneratedStory.audio = audioResult;
        hasChanges = true;
        
        if (audioResult.error) {
          console.log(`   ❌ Audio generation failed: ${audioResult.error}`);
        } else {
          const fileSizeKB = audioResult.audioPath ? (fs.existsSync(audioResult.audioPath) ? (fs.statSync(audioResult.audioPath).size / 1024).toFixed(1) : 'N/A') : 'N/A';
          console.log(`   ✅ Audio: Generated for ${currentGeneratedStory.scenes.length} scenes (${fileSizeKB}KB)`);
        }
        
        // Save audio incrementally
        if (updateStoryIncremental) {
          await updateStoryIncremental(filepath, {
            audio: currentGeneratedStory.audio
          }, audioResult.error ? 'audio-failed' : 'audio-generated');
        }
      } else {
        console.log('   ✅ Audio already exists and is valid');
      }
    }
    
    // Final validation to check if story is now playable
    const finalValidation = validateStoryCompleteness({ ...storyData, generatedStory: currentGeneratedStory });
    const isPlayable = finalValidation.hasValidScenes && 
                       finalValidation.hasEntities && 
                       finalValidation.hasImages &&
                       finalValidation.hasAudio;
    
    console.log(`🎯 Story "${storyName}" is ${isPlayable ? '✅ PLAYABLE' : '❌ NOT PLAYABLE'}`);
    
    // Final save if there were any changes (consolidation)
    if (hasChanges) {
      console.log('💾 Final consolidation of story file...');
      if (updateStoryIncremental) {
        await updateStoryIncremental(filepath, currentGeneratedStory, 'story-complete');
      } else {
        await updateStoryWithGeneratedContent(filepath, currentGeneratedStory);
      }
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
                        !validation.hasAudio ||
                        ['missing', 'error', 'empty', 'file_missing', 'incomplete'].includes(validation.audioStatus) ||
                        validation.emptyScenes.length > 0 ||
                        validation.entityErrors.length > 0 ||
                        validation.imageErrors.length > 0 ||
                        validation.audioErrors.length > 0
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
      console.log(`   Missing - Scenes: ${!validation.hasValidScenes}, Entities: ${!validation.hasEntities}, Images: ${!validation.hasImages}, Audio: ${!validation.hasAudio} (${validation.audioStatus})`);
      
      if (validation.emptyScenes.length > 0) {
        console.log(`   🚨 ${validation.emptyScenes.length} empty scenes need regeneration`);
      }
      if (validation.entityErrors.length > 0) {
        console.log(`   🚨 ${validation.entityErrors.length} entity errors need fixing`);
      }
      if (validation.imageErrors.length > 0) {
        console.log(`   🚨 ${validation.imageErrors.length} image errors need fixing`);
      }
      if (validation.audioErrors.length > 0) {
        console.log(`   🚨 ${validation.audioErrors.length} audio errors need fixing`);
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
          updateStoryWithGeneratedContent: require('../utils/fileUtils').updateStoryWithGeneratedContent,
          updateStoryIncremental: require('../utils/fileUtils').updateStoryIncremental
        });
        if (hadChanges) {
          processedCount++;
          
          // Check if story is now complete
          const updatedStory = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          const finalValidation = validateStoryCompleteness(updatedStory);
          const isNowPlayable = finalValidation.hasValidScenes && 
                               finalValidation.hasEntities && 
                               finalValidation.hasImages &&
                               finalValidation.hasAudio;
          
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
  generateAudioOnly,
  regenerateFailedScenes,
  regenerateFailedEntities,
  regenerateFailedImages,
  processStoryGranularlyWithCheck,
  processExistingStories
};
