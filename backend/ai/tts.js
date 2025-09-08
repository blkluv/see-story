const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { GoogleGenAI } = require('@google/genai');
const mime = require('mime');

// Set ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Initialize Gemini AI client
let geminiClient = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    console.log('✅ Gemini AI client initialized successfully');
  } else {
    console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI client:', error.message);
  console.log('ℹ️  Falling back to placeholder mode');
}

// Configuration
const TEST_MODE = process.env.TTS_TEST_MODE === 'true';
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Enceladus';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
const GEMINI_TTS_TEMPERATURE = parseFloat(process.env.GEMINI_TTS_TEMPERATURE) || 1.0;

console.log(`🎤 TTS module loaded - Mode: ${TEST_MODE ? 'Test (placeholder)' : 'Gemini TTS'}`);
console.log(`🔊 Voice: ${GEMINI_TTS_VOICE}, Model: ${GEMINI_TTS_MODEL}`);

/**
 * Save binary audio file to filesystem
 */
const saveBinaryFile = (fileName, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, (err) => {
      if (err) {
        console.error(`❌ Error writing file ${fileName}:`, err);
        reject(err);
        return;
      }
      console.log(`💾 File ${fileName} saved to file system.`);
      resolve(fileName);
    });
  });
};

/**
 * Convert raw audio data to WAV format
 */
const convertToWav = (rawData, mimeType) => {
  const options = parseMimeType(mimeType);
  const buffer = Buffer.from(rawData, 'base64');
  const wavHeader = createWavHeader(buffer.length, options);
  return Buffer.concat([wavHeader, buffer]);
};

/**
 * Parse MIME type to extract audio parameters
 */
const parseMimeType = (mimeType) => {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options = {
    numChannels: 1,
    sampleRate: 24000,
    bitsPerSample: 16
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options;
};

/**
 * Create WAV header for audio data
 */
const createWavHeader = (dataLength, options) => {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
};

/**
 * Generate audio using Gemini TTS for a single scene
 */
const generateSceneAudioWithGemini = async (sceneContent, sceneTitle, sceneIndex) => {
  try {
    console.log(`🎤 [GEMINI TTS] Generating audio for Scene ${sceneIndex + 1}: "${sceneTitle}"`);
    
    if (!geminiClient) {
      throw new Error('Gemini AI client not initialized');
    }
    
    // Clean up the text for better TTS
    const cleanText = sceneContent
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Configure Gemini TTS request
    const config = {
      temperature: GEMINI_TTS_TEMPERATURE,
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: GEMINI_TTS_VOICE,
          }
        }
      },
    };

    const contents = [{
      role: 'user',
      parts: [{
        text: cleanText,
      }],
    }];

    console.log(`🔄 Synthesizing speech for Scene ${sceneIndex + 1} (${cleanText.length} chars)...`);
    
    // Generate streaming response
    const response = await geminiClient.models.generateContentStream({
      model: GEMINI_TTS_MODEL,
      config,
      contents,
    });

    const audioChunks = [];
    let totalSize = 0;
    
    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue;
      }
      
      const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData) {
        let buffer = Buffer.from(inlineData.data || '', 'base64');
        let mimeType = inlineData.mimeType || '';
        
        // Convert to WAV if needed
        let fileExtension = mime.default.getExtension(mimeType);
        if (!fileExtension) {
          fileExtension = 'wav';
          buffer = convertToWav(inlineData.data || '', mimeType);
        }
        
        audioChunks.push(buffer);
        totalSize += buffer.length;
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('No audio data received from Gemini TTS');
    }

    // Combine all audio chunks
    const audioData = Buffer.concat(audioChunks);
    
    // Estimate duration (rough calculation based on file size and typical bitrates)
    // For 16kHz, 16-bit mono audio: ~32KB per second
    const estimatedDuration = Math.max(5, Math.round((audioData.length / 32000) * 100) / 100);

    console.log(`✅ [GEMINI TTS] Generated audio for Scene ${sceneIndex + 1} (~${estimatedDuration}s, ${Math.round(audioData.length/1024)}KB)`);
    
    return {
      audioData: audioData,
      mimeType: 'audio/wav',
      sceneIndex: sceneIndex,
      sceneTitle: sceneTitle,
      duration: estimatedDuration,
      placeholder: false,
      model: 'Gemini TTS',
      voice: GEMINI_TTS_VOICE,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Gemini TTS generation failed for Scene ${sceneIndex + 1}:`, error.message);
    return {
      error: error.message,
      sceneIndex: sceneIndex,
      sceneTitle: sceneTitle,
      generatedAt: new Date().toISOString()
    };
  }
};

/**
 * Generate placeholder audio for a single scene (fallback mode)
 */
const generateSceneAudioPlaceholder = async (sceneContent, sceneTitle, sceneIndex) => {
  try {
    console.log(`🎤 [PLACEHOLDER] Generating placeholder for Scene ${sceneIndex + 1}: "${sceneTitle}"`);
    
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
      placeholder: true,
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
 * Generate audio for a single scene (uses Gemini TTS or falls back to placeholder)
 */
const generateSceneAudio = async (sceneContent, sceneTitle, sceneIndex) => {
  if (TEST_MODE || !geminiClient) {
    return await generateSceneAudioPlaceholder(sceneContent, sceneTitle, sceneIndex);
  } else {
    return await generateSceneAudioWithGemini(sceneContent, sceneTitle, sceneIndex);
  }
};

/**
 * Generate audio for all scenes in a story
 */
const generateStoryAudio = async (scenes, storyId) => {
  const audioMode = TEST_MODE || !geminiClient ? 'PLACEHOLDER' : 'GEMINI TTS';
  console.log(`🎙️ [${audioMode}] Starting TTS generation for ${scenes.length} scenes...`);
  
  const audioSegments = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const audioResult = await generateSceneAudio(scene.content, scene.title, i);
    audioSegments.push(audioResult);
    
    // Delay between requests to avoid rate limiting
    if (i < scenes.length - 1) {
      const delayMs = TEST_MODE ? 100 : 1000; // 1 second delay for Gemini TTS
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  const successfulSegments = audioSegments.filter(a => !a.error).length;
  console.log(`🎵 [${audioMode}] Generated ${successfulSegments}/${scenes.length} audio segments`);
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
    
    // Use .wav extension for Gemini TTS audio, .mp3 for placeholder
    const extension = segment.mimeType.includes('wav') ? 'wav' : 'mp3';
    const filename = `scene_${segment.sceneIndex.toString().padStart(2, '0')}.${extension}`;
    const filepath = path.join(tempDir, filename);
    
    await fs.promises.writeFile(filepath, Buffer.from(segment.audioData));
    audioFiles.push({
      filepath: filepath,
      sceneIndex: segment.sceneIndex,
      sceneTitle: segment.sceneTitle,
      duration: segment.duration
    });
    
    console.log(`💾 Saved audio segment: ${filename} (${segment.duration}s)`);
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
      // If only one file, just copy it and ensure it's MP3
      const inputPath = audioFiles[0].filepath;
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Single audio file converted and copied to: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg single file conversion error:', err.message);
          reject(err);
        })
        .run();
      return;
    }
    
    // Create ffmpeg command to concatenate audio files
    const command = ffmpeg();
    
    // Add all input files
    audioFiles.forEach(file => {
      command.input(file.filepath);
    });
    
    // Configure output with proper audio normalization
    command
      .outputOptions([
        '-filter_complex', 
        `concat=n=${audioFiles.length}:v=0:a=1[out]`,
        '-map', '[out]'
      ])
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(1) // Mono output
      .audioFrequency(22050) // Consistent sample rate
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
 * Generate test audio with beeps/tones for each scene (fallback mode)
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
 * Main function to generate complete story audio using individual scenes
 */
const generateCompleteStoryAudio = async (scenes, storyId) => {
  try {
    const audioMode = TEST_MODE || !geminiClient ? 'PLACEHOLDER/TEST' : 'GEMINI TTS';
    console.log(`🎬 [${audioMode}] Starting complete audio generation for story: ${storyId}`);
    
    // Create output directory and file path
    const outputDir = path.join(__dirname, '../audio_backend');
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `story_${storyId}.mp3`);
    
    // Delete existing file if it exists (to ensure fresh generation)
    if (fs.existsSync(outputPath)) {
      console.log('🗑️ Removing existing audio file to regenerate...');
      fs.unlinkSync(outputPath);
    }
    
    // Generate audio for all scenes
    const audioSegments = await generateStoryAudio(scenes, storyId);
    
    // Check if we have any successful segments
    const successfulSegments = audioSegments.filter(a => !a.error);
    if (successfulSegments.length === 0) {
      throw new Error('No audio segments were generated successfully');
    }
    
    // Save audio segments to temporary files
    const audioFiles = await saveAudioSegments(successfulSegments, storyId);
    
    if (audioFiles.length === 0) {
      throw new Error('No audio files were saved successfully');
    }
    
    // Merge all audio files into a single file
    await mergeAudioFiles(audioFiles, outputPath);
    
    // Clean up temporary files
    const tempDir = path.join(__dirname, '../audio_backend/temp', storyId);
    await cleanupTempFiles(audioFiles, tempDir);
    
    // Verify the file was created and has reasonable size
    if (!fs.existsSync(outputPath)) {
      throw new Error('Final audio file was not created');
    }
    
    const stats = fs.statSync(outputPath);
    const fileSizeKB = stats.size / 1024;
    
    if (fileSizeKB < 10) {
      throw new Error(`Generated audio file too small: ${fileSizeKB.toFixed(1)}KB`);
    }
    
    // Calculate total duration from segments
    const totalDuration = successfulSegments.reduce((sum, segment) => sum + (segment.duration || 30), 0);
    
    // Convert to base64 for JSON storage
    const audioBase64 = await audioToBase64(outputPath);
    
    console.log(`🎉 [${audioMode}] Story audio generation completed! (${fileSizeKB.toFixed(1)}KB, ${Math.round(totalDuration)}s)`);
    
    return {
      audioBase64: audioBase64,
      audioPath: outputPath,
      mimeType: 'audio/mpeg',
      duration: Math.round(totalDuration),
      segmentCount: successfulSegments.length,
      totalScenes: scenes.length,
      fileSizeKB: fileSizeKB,
      placeholder: TEST_MODE || !geminiClient,
      testMode: TEST_MODE,
      model: !TEST_MODE && geminiClient ? 'Gemini TTS' : 'Placeholder',
      voice: !TEST_MODE && geminiClient ? GEMINI_TTS_VOICE : undefined,
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Complete story audio generation failed:`, error.message);
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