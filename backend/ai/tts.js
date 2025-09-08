const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// For now, we'll implement TTS as a placeholder since Gemini TTS API might not be available yet
// This will generate silent audio files that match the story duration
console.log('ℹ️  TTS module loaded - using placeholder implementation (Gemini TTS API not yet available)');

// Enable test mode to generate actual audio (beeps) instead of silence
const TEST_MODE = process.env.TTS_TEST_MODE === 'true';

/**
 * Generate placeholder audio for a single scene (Gemini TTS placeholder)
 */
const generateSceneAudio = async (sceneContent, sceneTitle, sceneIndex) => {
  try {
    console.log(`🎤 [PLACEHOLDER] Generating TTS for Scene ${sceneIndex + 1}: "${sceneTitle}"`);
    
    // Placeholder implementation - generate silent audio data
    // In a real implementation, this would call Gemini TTS API
    
    // Calculate expected duration based on content length (roughly 150 words per minute)
    const wordCount = sceneContent.split(' ').length;
    const estimatedDurationSeconds = Math.max(30, Math.min(90, wordCount / 2.5)); // 30-90 seconds
    
    // Create a small placeholder audio buffer (silent audio)
    const silentAudioData = Buffer.from([
      0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ID3 header
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00  // MP3 silent frame
    ]);

    console.log(`✅ [PLACEHOLDER] Generated placeholder audio for Scene ${sceneIndex + 1} (~${estimatedDurationSeconds}s)`);
    
    return {
      audioData: silentAudioData,
      mimeType: 'audio/mp3',
      sceneIndex: sceneIndex,
      sceneTitle: sceneTitle,
      duration: estimatedDurationSeconds,
      placeholder: true, // Mark as placeholder
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ TTS placeholder generation failed for Scene ${sceneIndex + 1}:`, error.message);
    return {
      error: error.message,
      sceneIndex: sceneIndex,
      sceneTitle: sceneTitle,
      generatedAt: new Date().toISOString()
    };
  }
};

/**
 * Generate placeholder audio for all scenes in a story
 */
const generateStoryAudio = async (scenes, storyId) => {
  console.log(`🎙️ [PLACEHOLDER] Starting TTS generation for ${scenes.length} scenes...`);
  
  const audioSegments = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const audioResult = await generateSceneAudio(scene.content, scene.title, i);
    audioSegments.push(audioResult);
    
    // Small delay for simulation
    if (i < scenes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Faster for placeholder
    }
  }
  
  const successfulSegments = audioSegments.filter(a => !a.error).length;
  console.log(`🎵 [PLACEHOLDER] Generated ${successfulSegments}/${scenes.length} placeholder audio segments`);
  return audioSegments;
};

/**
 * Save individual audio segments to temporary files
 */
const saveAudioSegments = async (audioSegments, storyId) => {
  const tempDir = path.join(__dirname, '../audio_backend/temp', storyId);
  await fs.promises.mkdir(tempDir, { recursive: true });
  
  const audioFiles = [];
  
  for (const segment of audioSegments) {
    if (segment.error) {
      console.log(`⚠️ Skipping scene ${segment.sceneIndex + 1} due to error: ${segment.error}`);
      continue;
    }
    
    const filename = `scene_${segment.sceneIndex.toString().padStart(2, '0')}.mp3`;
    const filepath = path.join(tempDir, filename);
    
    await fs.promises.writeFile(filepath, Buffer.from(segment.audioData));
    audioFiles.push({
      filepath: filepath,
      sceneIndex: segment.sceneIndex,
      sceneTitle: segment.sceneTitle
    });
    
    console.log(`💾 Saved audio segment: ${filename}`);
  }
  
  return audioFiles;
};

/**
 * Merge multiple audio files into a single file using ffmpeg
 */
const mergeAudioFiles = async (audioFiles, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log(`🔗 Merging ${audioFiles.length} audio segments...`);
    
    if (audioFiles.length === 0) {
      reject(new Error('No audio files to merge'));
      return;
    }
    
    if (audioFiles.length === 1) {
      // If only one file, just copy it
      fs.copyFile(audioFiles[0].filepath, outputPath, (err) => {
        if (err) reject(err);
        else {
          console.log(`✅ Single audio file copied to: ${outputPath}`);
          resolve(outputPath);
        }
      });
      return;
    }
    
    // Create ffmpeg command to concatenate audio files
    const command = ffmpeg();
    
    // Add all input files
    audioFiles.forEach(file => {
      command.input(file.filepath);
    });
    
    // Configure output
    command
      .outputOptions([
        '-filter_complex', 
        `concat=n=${audioFiles.length}:v=0:a=1[out]`,
        '-map', '[out]'
      ])
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎵 FFmpeg started:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🔄 Audio merge progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Audio merge completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
};

/**
 * Clean up temporary audio files
 */
const cleanupTempFiles = async (audioFiles, tempDir) => {
  try {
    // Delete individual audio files
    for (const file of audioFiles) {
      await fs.promises.unlink(file.filepath);
    }
    
    // Remove temp directory if empty
    await fs.promises.rmdir(tempDir);
    console.log('🧹 Cleaned up temporary audio files');
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error.message);
  }
};

/**
 * Convert audio to base64 for storage in JSON
 */
const audioToBase64 = async (audioPath) => {
  try {
    const audioBuffer = await fs.promises.readFile(audioPath);
    const base64Data = audioBuffer.toString('base64');
    console.log(`📦 Converted audio to base64 (${base64Data.length} characters)`);
    return base64Data;
  } catch (error) {
    console.error('❌ Failed to convert audio to base64:', error.message);
    throw error;
  }
};

/**
 * Analyze audio file to check if it contains actual audio data
 */
const analyzeAudioContent = async (audioPath) => {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Analyzing audio content: ${audioPath}`);
    
    ffmpeg(audioPath)
      .audioFilters(['astats=metadata=1:reset=1'])
      .format('null')
      .output('-')
      .on('stderr', (stderrLine) => {
        // Parse ffmpeg audio statistics
        if (stderrLine.includes('Mean_volume:')) {
          const volumeMatch = stderrLine.match(/Mean_volume:\s*(-?\d+\.?\d*)/);
          if (volumeMatch) {
            const meanVolume = parseFloat(volumeMatch[1]);
            console.log(`📊 Mean volume: ${meanVolume}dB`);
          }
        }
        if (stderrLine.includes('RMS_level:')) {
          const rmsMatch = stderrLine.match(/RMS_level:\s*(-?\d+\.?\d*)/);
          if (rmsMatch) {
            const rmsLevel = parseFloat(rmsMatch[1]);
            console.log(`📊 RMS level: ${rmsLevel}dB`);
          }
        }
      })
      .on('end', () => {
        console.log('✅ Audio analysis completed');
        resolve({ analyzed: true });
      })
      .on('error', (err) => {
        console.error('❌ Audio analysis failed:', err.message);
        reject(err);
      })
      .run();
  });
};

/**
 * Generate test audio with beeps/tones for each scene
 */
const generateTestAudioWithBeeps = async (totalDurationSeconds, outputPath, sceneCount = 10) => {
  return new Promise((resolve, reject) => {
    console.log(`🎵 [TEST MODE] Generating test audio with beeps (${totalDurationSeconds}s, ${sceneCount} scenes)`);
    
    const sceneDuration = totalDurationSeconds / sceneCount; // seconds per scene
    
    // Create a simple test pattern: beep at start of each scene
    ffmpeg()
      .input('sine=frequency=440:duration=1') // 1-second beep
      .inputFormat('lavfi')
      .input(`sine=frequency=0:duration=${sceneDuration-1}`) // silence for rest of scene
      .inputFormat('lavfi')
      // Repeat this pattern for all scenes
      .complexFilter([
        // Generate beep + silence pattern and repeat
        `[0:a][1:a]concat=n=2:v=0:a=1,aloop=loop=${sceneCount-1}:size=${Math.floor(sceneDuration * 44100)}[out]`
      ])
      .outputOptions(['-map', '[out]'])
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .duration(totalDurationSeconds)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎵 [TEST] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🔄 [TEST] Test audio progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ [TEST] Test audio with beeps generated successfully');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ [TEST] Test audio generation failed, trying simpler approach...', err.message);
        
        // Fallback to simpler approach
        ffmpeg()
          .input('sine=frequency=440:duration=' + totalDurationSeconds)
          .inputFormat('lavfi')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(outputPath)
          .on('end', () => {
            console.log('✅ [TEST] Simple test tone generated');
            resolve(outputPath);
          })
          .on('error', (fallbackErr) => {
            console.error('❌ [TEST] Fallback test audio failed:', fallbackErr.message);
            reject(fallbackErr);
          })
          .run();
      })
      .run();
  });
};

/**
 * Generate a proper silent MP3 file using ffmpeg
 */
const generateSilentAudio = async (durationSeconds, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log(`🔊 Generating ${durationSeconds}s silent MP3: ${outputPath}`);
    
    ffmpeg()
      .input('anullsrc=channel_layout=stereo:sample_rate=44100')
      .inputFormat('lavfi')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(2)
      .audioFrequency(44100)
      .duration(durationSeconds)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎵 FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🔄 Audio generation progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        // Check the generated file size
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          const fileSizeKB = (stats.size / 1024).toFixed(1);
          console.log(`✅ Generated silent audio: ${fileSizeKB}KB (${durationSeconds}s)`);
          resolve(outputPath);
        } else {
          reject(new Error('Audio file was not created'));
        }
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
};

/**
 * Main function to generate complete story audio (placeholder version)
 */
const generateCompleteStoryAudio = async (scenes, storyId) => {
  try {
    console.log(`🎬 [PLACEHOLDER] Starting complete audio generation for story: ${storyId}`);
    
    // Create output directory and file path
    const outputDir = path.join(__dirname, '../audio_backend');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `story_${storyId}.mp3`);
    
    // Calculate total duration (60 seconds per scene for 10 minutes total)
    const totalDurationSeconds = scenes.length * 60; // 60 seconds per scene
    
    // Delete existing file if it exists (to ensure fresh generation)
    if (fs.existsSync(outputPath)) {
      console.log('🗑️ Removing existing audio file to regenerate...');
      fs.unlinkSync(outputPath);
    }
    
    // Generate either test audio or silent audio based on mode
    if (TEST_MODE) {
      console.log(`🔄 [TEST MODE] Generating ${totalDurationSeconds}s of test audio with scene beeps...`);
      await generateTestAudioWithBeeps(totalDurationSeconds, outputPath, scenes.length);
    } else {
      console.log(`🔄 [PLACEHOLDER] Generating ${totalDurationSeconds}s of silent audio...`);
      await generateSilentAudio(totalDurationSeconds, outputPath);
    }
    
    // Verify the file was created and has reasonable size
    if (!fs.existsSync(outputPath)) {
      throw new Error('Audio file was not created by ffmpeg');
    }
    
    const stats = fs.statSync(outputPath);
    const fileSizeKB = stats.size / 1024;
    
    if (fileSizeKB < 50) {
      throw new Error(`Generated audio file too small: ${fileSizeKB.toFixed(1)}KB (expected >50KB for ${totalDurationSeconds}s)`);
    }
    
    // Analyze the generated audio to verify it has content (if in test mode)
    if (TEST_MODE) {
      try {
        await analyzeAudioContent(outputPath);
      } catch (error) {
        console.warn('⚠️ Audio analysis failed:', error.message);
      }
    }
    
    // Convert to base64 for JSON storage
    const audioBase64 = await audioToBase64(outputPath);
    
    const audioType = TEST_MODE ? 'test audio with beeps' : 'silent audio';
    console.log(`🎉 [${TEST_MODE ? 'TEST' : 'PLACEHOLDER'}] Story audio generation completed! (${fileSizeKB.toFixed(1)}KB, ${totalDurationSeconds}s ${audioType})`);
    
    return {
      audioBase64: audioBase64,
      audioPath: outputPath,
      mimeType: 'audio/mpeg',
      duration: totalDurationSeconds,
      segmentCount: scenes.length,
      totalScenes: scenes.length,
      fileSizeKB: fileSizeKB,
      placeholder: !TEST_MODE, // Only mark as placeholder if not in test mode
      testMode: TEST_MODE,
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [PLACEHOLDER] Complete story audio generation failed:', error.message);
    return {
      error: error.message,
      placeholder: true,
      generatedAt: new Date().toISOString()
    };
  }
};

module.exports = {
  generateCompleteStoryAudio,
  analyzeAudioContent
};
