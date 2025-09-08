import React, { useState, useEffect, useCallback, useRef } from 'react';
import './StoryPlayer.css';
import RegenerationControl from './RegenerationControl';

const StoryPlayer = ({ story, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(true); // Auto-start playing
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleProgress, setSubtitleProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false); // Track auto-start
  const [showAutoStartMessage, setShowAutoStartMessage] = useState(false); // Show auto-start indicator
  const audioRef = useRef(null);

  // Timing calculations - use actual audio duration or fallback to 10 minutes
  const audioMetadata = story?.generatedStory?.audio;
  const actualAudioDuration = audioMetadata?.duration;
  const totalDuration = actualAudioDuration || 600; // Use actual audio duration or fallback to 10 minutes
  const scenes = story?.generatedStory?.scenes || [];
  const sceneCount = scenes.length;
  const sceneBaseDuration = totalDuration / sceneCount; // Dynamic duration per scene based on actual audio
  
  // Log timing info for debugging
  React.useEffect(() => {
    if (actualAudioDuration) {
      console.log(`🎬 Using actual audio duration: ${actualAudioDuration}s (${Math.round(actualAudioDuration/60*10)/10}min)`);
      console.log(`📊 ${sceneCount} scenes, ${Math.round(sceneBaseDuration*10)/10}s per scene`);
    } else {
      console.log(`⚠️ No audio duration found, using fallback: ${totalDuration}s`);
    }
  }, [actualAudioDuration, totalDuration, sceneCount, sceneBaseDuration]);
  
  const currentScene = scenes[currentSceneIndex];
  const currentImages = currentScene?.images?.filter(img => !img.error && img.base64Data) || [];
  // Each image gets equal time within the scene, no repeating
  const imageTransitionTime = currentImages.length > 1 ? sceneBaseDuration / currentImages.length : sceneBaseDuration;

  // Text scrolling setup
  const currentText = currentScene?.content || '';
  const wordsPerSecond = 3; // Reading speed (words per second)
  const textDuration = Math.max(currentText.split(' ').length / wordsPerSecond, sceneBaseDuration * 0.9);

  // Initialize subtitle text when scene changes
  useEffect(() => {
    if (currentScene?.content) {
      setSubtitleText(currentScene.content);
    }
  }, [currentSceneIndex]);

  // Auto-start playback when component mounts
  useEffect(() => {
    if (!hasAutoStarted && story?.generatedStory?.scenes?.length > 0) {
      console.log('🎬 Auto-starting video playback...');
      
      const startPlayback = () => {
        // Show auto-start message
        setShowAutoStartMessage(true);
        
        // Set the flag to prevent re-triggering
        setHasAutoStarted(true);
        
        // Start audio playback if available
        if (audioRef.current && story?.generatedStory?.audio?.audioBase64) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => {
            console.log('🎵 Audio auto-started successfully');
          }).catch(error => {
            console.warn('⚠️ Audio auto-play failed (browser policy):', error.message);
            console.log('💡 User will need to click play to start audio (visual will continue)');
            // Visual continues playing even if audio auto-play fails
          });
        } else {
          console.log('🎞️ No audio available, starting visual-only playback');
        }
        
        // Hide auto-start message after 2 seconds
        setTimeout(() => {
          setShowAutoStartMessage(false);
        }, 2000);
      };

      // Small delay to ensure smooth loading, then start
      const autoStartTimer = setTimeout(() => {
        if (audioRef.current && story?.generatedStory?.audio?.audioBase64) {
          // Try to start immediately, or wait for audio to load
          if (audioRef.current.readyState >= 1) {
            startPlayback();
          } else {
            audioRef.current.addEventListener('canplay', startPlayback, { once: true });
          }
        } else {
          // No audio, just start visual playback
          startPlayback();
        }
      }, 500); // 500ms delay for smooth experience

      return () => clearTimeout(autoStartTimer);
    }
  }, [hasAutoStarted, story?.generatedStory?.scenes?.length, story?.generatedStory?.audio?.audioBase64]);

  // Initialize and sync audio
  useEffect(() => {
    if (audioRef.current && story?.generatedStory?.audio?.audioBase64) {
      const audio = audioRef.current;
      
      // Set initial properties
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackSpeed;
      
      // Wait for audio metadata to load before syncing
      const syncAudioTime = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          // Use actual audio duration for sync calculation
          const audioCurrentTime = (timeElapsed / totalDuration) * audio.duration;
          if (Math.abs(audio.currentTime - audioCurrentTime) > 1) {
            console.log(`🔄 Syncing audio: visual=${timeElapsed.toFixed(1)}s, audio=${audioCurrentTime.toFixed(1)}s`);
            audio.currentTime = audioCurrentTime;
          }
        }
      };
      
      // Sync immediately if metadata is already loaded
      if (audio.readyState >= 1) {
        syncAudioTime();
      } else {
        // Wait for metadata to load
        audio.addEventListener('loadedmetadata', syncAudioTime, { once: true });
      }
    }
  }, [story, volume, isMuted, playbackSpeed, timeElapsed, totalDuration]);

  // Sync audio when progress is manually changed
  useEffect(() => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      const targetTime = (timeElapsed / totalDuration) * audioRef.current.duration;
      if (Math.abs(audioRef.current.currentTime - targetTime) > 0.5) {
        console.log(`🎯 Manual sync: seeking to ${targetTime.toFixed(1)}s`);
        audioRef.current.currentTime = targetTime;
      }
    }
  }, [timeElapsed, totalDuration]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + (0.1 * playbackSpeed);
          const newProgress = (newTime / totalDuration) * 100;
          setProgress(newProgress);

          // Auto-stop at end
          if (newTime >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }

          return newTime;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Separate useEffect for scene and image transitions based on time
  useEffect(() => {
    // Calculate which scene we should be on
    const targetSceneIndex = Math.floor(timeElapsed / sceneBaseDuration);
    
    if (targetSceneIndex !== currentSceneIndex && targetSceneIndex < sceneCount) {
      setCurrentSceneIndex(targetSceneIndex);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
    }

    // Handle image transitions within scene
    const sceneElapsedTime = timeElapsed - (currentSceneIndex * sceneBaseDuration);
    
    if (currentImages.length > 1) {
      // Don't repeat images - just show each once, then stay on the last one
      const targetImageIndex = Math.min(
        Math.floor(sceneElapsedTime / imageTransitionTime), 
        currentImages.length - 1
      );
      
      if (targetImageIndex !== currentImageIndex) {
        setCurrentImageIndex(targetImageIndex);
      }
    }
  }, [timeElapsed, sceneBaseDuration, currentSceneIndex, sceneCount, currentImages.length, imageTransitionTime, currentImageIndex, totalDuration]);

  const handlePlayPause = () => {
    // If we're at the end, restart from beginning
    if (timeElapsed >= totalDuration) {
      setTimeElapsed(0);
      setProgress(0);
      setCurrentSceneIndex(0);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
      setIsPlaying(true);
      // Reset audio to beginning
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      // Normal play/pause toggle
      const newPlayState = !isPlaying;
      setIsPlaying(newPlayState);
      
      // Sync audio playback
      if (audioRef.current) {
        if (newPlayState) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
    }
  };

  const handleSpeedChange = () => {
    const newSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 0.5 : 1;
    setPlaybackSpeed(newSpeed);
    
    // Sync audio playback speed
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickProgress = (clickX / rect.width) * 100;
    const newTime = (clickProgress / 100) * totalDuration;
    
    setTimeElapsed(newTime);
    setProgress(clickProgress);
    
    // Update scene and image indices
    const newSceneIndex = Math.floor(newTime / sceneBaseDuration);
    setCurrentSceneIndex(Math.min(newSceneIndex, sceneCount - 1));
    setCurrentImageIndex(0);
    setSubtitleProgress(0);
    
    // If clicking to the end, make sure we can restart
    if (newTime >= totalDuration) {
      setIsPlaying(false);
    }
  };

  const handlePreviousScene = () => {
    if (currentSceneIndex > 0) {
      const newSceneIndex = currentSceneIndex - 1;
      const newTime = newSceneIndex * sceneBaseDuration;
      setCurrentSceneIndex(newSceneIndex);
      setTimeElapsed(newTime);
      setProgress((newTime / totalDuration) * 100);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
    }
  };

  const handleNextScene = () => {
    if (currentSceneIndex < sceneCount - 1) {
      const newSceneIndex = currentSceneIndex + 1;
      const newTime = newSceneIndex * sceneBaseDuration;
      setCurrentSceneIndex(newSceneIndex);
      setTimeElapsed(newTime);
      setProgress((newTime / totalDuration) * 100);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentImage = () => {
    if (currentImages.length === 0) {
      // Fallback image
      return 'https://picsum.photos/1280/720?random=' + currentSceneIndex;
    }
    
    const image = currentImages[currentImageIndex];
    
    if (!image?.base64Data) {
      return 'https://picsum.photos/1280/720?random=' + currentSceneIndex;
    }
    
    return `data:${image.mimeType || 'image/png'};base64,${image.base64Data}`;
  };

  if (!story || !scenes.length) {
    return (
      <div className="story-player error">
        <div className="error-message">
          <h2>Story Not Available</h2>
          <p>This story doesn't have generated scenes yet.</p>
          <button onClick={onBack} className="btn-back">Back to Stories</button>
        </div>
      </div>
    );
  }

  return (
    <div className="story-player">
      <button onClick={onBack} className="back-button">
        <span className="icon">←</span> Back to Stories
      </button>
      
      <div className="video-container">
        <div className="video-viewport">
          <img 
            src={getCurrentImage()} 
            alt={currentScene?.title || `Scene ${currentSceneIndex + 1}`}
            className="scene-image"
            key={`${currentSceneIndex}-${currentImageIndex}`}
          />
          
          <div className="image-transition-overlay" />
          
          {/* Auto-start indicator */}
          {showAutoStartMessage && (
            <div className="auto-start-overlay" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '1.1em',
              fontWeight: '500',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeInOut 2s ease-in-out forwards'
            }}>
              <span style={{ fontSize: '1.2em' }}>▶️</span>
              <span>Auto-starting story...</span>
            </div>
          )}
          
          <div className="scene-info">
            <h3 className="scene-title">{currentScene?.title}</h3>
            <div className="scene-timing-info" style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.9em',
              opacity: 0.9
            }}>
              <span className="scene-number">{currentSceneIndex + 1} / {sceneCount}</span>
              {actualAudioDuration && (
                <span className="scene-duration" style={{ fontSize: '0.8em', color: '#888' }}>
                  ~{Math.round(sceneBaseDuration)}s each
                </span>
              )}
            </div>
          </div>


          <div className="subtitles">
            <div className="subtitle-text">
              {subtitleText || currentScene?.content || 'Scene content loading...'}
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="primary-controls">
            <button onClick={handlePreviousScene} className="control-btn" disabled={currentSceneIndex === 0}>
              <span className="icon">⏮</span>
            </button>
            
            <button onClick={handlePlayPause} className="play-pause-btn">
              <span className="icon">
                {timeElapsed >= totalDuration ? '🔄' : (isPlaying ? '⏸' : '▶')}
              </span>
            </button>
            
            <button onClick={handleNextScene} className="control-btn" disabled={currentSceneIndex === sceneCount - 1}>
              <span className="icon">⏭</span>
            </button>
          </div>

          <div className="progress-section">
            <span className="time-display">{formatTime(timeElapsed)}</span>
            <div className="progress-bar" onClick={handleProgressClick}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <div className="progress-handle" style={{ left: `${progress}%` }}></div>
              </div>
            </div>
            <span className="time-display">{formatTime(totalDuration)}</span>
          </div>

          <div className="secondary-controls">
            <button onClick={handleMuteToggle} className="control-btn volume-btn">
              <span className="icon">{isMuted ? '🔇' : '🔊'}</span>
            </button>
            
            <div className="volume-slider">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="volume-range"
              />
            </div>
            
            <button onClick={handleSpeedChange} className="control-btn speed-btn">
              <span className="icon">{playbackSpeed}x</span>
            </button>
            
            <button onClick={handleFullscreen} className="control-btn fullscreen-btn">
              <span className="icon">⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden audio element for narration */}
      {story?.generatedStory?.audio?.audioBase64 && (
        <audio
          ref={audioRef}
          preload="auto"
          style={{ display: 'none' }}
        >
          <source
            src={`data:${story.generatedStory.audio.mimeType || 'audio/mpeg'};base64,${story.generatedStory.audio.audioBase64}`}
            type={story.generatedStory.audio.mimeType || 'audio/mpeg'}
          />
          Your browser does not support the audio element.
        </audio>
      )}

      <div className="story-info">
        <h2 className="story-title">
          {story.characters?.map(char => char.name).join(' & ') || 'Untitled Story'}
        </h2>
        <p className="story-outline">{story.story?.outline}</p>
        
        {/* Audio sync status indicator */}
        <div className="audio-status" style={{ 
          fontSize: '0.8em', 
          color: actualAudioDuration ? '#4CAF50' : '#FF9800',
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>{actualAudioDuration ? '🎵' : '⚠️'}</span>
          <span>
            {actualAudioDuration 
              ? `Synced to ${Math.round(actualAudioDuration/60*10)/10}min ${audioMetadata.model || 'TTS'} audio`
              : `Using ${Math.round(totalDuration/60)}min fallback timing`
            }
          </span>
        </div>
        
        {/* Regeneration Control */}
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            🔧 Story Regeneration Control
          </div>
          <RegenerationControl 
            storyId={story.id}
            storyName={story.characters?.map(char => char.name).join(' & ') || 'Untitled Story'}
          />
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
            Use this control to force complete regeneration of all story content (scenes, entities, images, and audio).
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryPlayer;
