import React, { useState, useEffect, useCallback } from 'react';
import './StoryPlayer.css';

const StoryPlayer = ({ story, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleProgress, setSubtitleProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Timing calculations - TESTING: 30 seconds total (3 seconds per scene for quick testing)
  const totalDuration = 30; // TESTING: 30 seconds total instead of 600
  const scenes = story?.generatedStory?.scenes || [];
  const sceneCount = scenes.length;
  const sceneBaseDuration = totalDuration / sceneCount; // Base time per scene (3 seconds each for testing)
  
  const currentScene = scenes[currentSceneIndex];
  const currentImages = currentScene?.images?.filter(img => !img.error && img.base64Data) || [];
  const imageTransitionTime = currentImages.length > 1 ? sceneBaseDuration / (currentImages.length * 2) : sceneBaseDuration;

  // Text scrolling setup
  const currentText = currentScene?.content || '';
  const wordsPerSecond = 3; // Reading speed (words per second)
  const textDuration = Math.max(currentText.split(' ').length / wordsPerSecond, sceneBaseDuration * 0.9);

  // Initialize subtitle text when scene changes
  useEffect(() => {
    if (currentScene?.content) {
      setSubtitleText(currentScene.content);
      console.log(`=== SCENE ${currentSceneIndex + 1} SETUP ===`);
      console.log(`Title: "${currentScene.title}"`);
      console.log(`Total scenes: ${sceneCount}`);
      console.log(`Scene duration: ${sceneBaseDuration.toFixed(1)}s`);
      console.log(`Total duration: ${totalDuration}s`);
      console.log(`Images in scene: ${currentImages.length}`);
      console.log(`Image transition time: ${imageTransitionTime.toFixed(1)}s`);
      console.log(`Current time: ${timeElapsed.toFixed(1)}s`);
      console.log(`Next scene at: ${((currentSceneIndex + 1) * sceneBaseDuration).toFixed(1)}s`);
      console.log(`Text: ${currentText.substring(0, 100)}...`);
      console.log(`========================`);
    }
  }, [currentSceneIndex]);

  useEffect(() => {
    console.log(`Timer useEffect: isPlaying=${isPlaying}, speed=${playbackSpeed}`);
    let interval;
    if (isPlaying) {
      console.log('Starting timer interval');
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + (0.1 * playbackSpeed);
          const newProgress = (newTime / totalDuration) * 100;
          setProgress(newProgress);
          console.log(`Timer tick: ${newTime.toFixed(1)}s / ${totalDuration}s`);

          // Auto-stop at end
          if (newTime >= totalDuration) {
            console.log('Auto-stopping at end');
            setIsPlaying(false);
            return totalDuration;
          }

          return newTime;
        });
      }, 100);
    } else {
      console.log('Timer stopped');
    }
    return () => {
      console.log('Cleaning up timer interval');
      clearInterval(interval);
    };
  }, [isPlaying, totalDuration, playbackSpeed]);

  // Separate useEffect for scene and image transitions based on time
  useEffect(() => {
    console.log(`\n🕐 TRANSITION CHECK: timeElapsed=${timeElapsed.toFixed(1)}s`);
    console.log(`📏 sceneBaseDuration=${sceneBaseDuration.toFixed(1)}s (${totalDuration}s ÷ ${sceneCount} scenes)`);
    
    // Calculate which scene we should be on
    const targetSceneIndex = Math.floor(timeElapsed / sceneBaseDuration);
    console.log(`🎬 targetSceneIndex: ${targetSceneIndex}, currentSceneIndex: ${currentSceneIndex}`);
    console.log(`📊 Scene thresholds:`);
    for (let i = 0; i < Math.min(sceneCount, 5); i++) {
      const threshold = i * sceneBaseDuration;
      console.log(`  Scene ${i + 1}: ${threshold.toFixed(1)}s ${timeElapsed >= threshold ? '✅' : '❌'}`);
    }
    
    if (targetSceneIndex !== currentSceneIndex && targetSceneIndex < sceneCount) {
      console.log(`🚀 SCENE CHANGE! ${currentSceneIndex + 1} → ${targetSceneIndex + 1}`);
      setCurrentSceneIndex(targetSceneIndex);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
    } else if (targetSceneIndex >= sceneCount) {
      console.log(`⚠️ Target scene ${targetSceneIndex} >= sceneCount ${sceneCount}`);
    } else if (targetSceneIndex === currentSceneIndex) {
      console.log(`✅ Staying in scene ${currentSceneIndex + 1}`);
    }

    // Handle image transitions within scene
    const sceneElapsedTime = timeElapsed - (currentSceneIndex * sceneBaseDuration);
    console.log(`🖼️ Scene elapsed: ${sceneElapsedTime.toFixed(1)}s, images: ${currentImages.length}`);
    
    if (currentImages.length > 1) {
      const targetImageIndex = Math.floor(sceneElapsedTime / imageTransitionTime) % currentImages.length;
      console.log(`🎭 Image: ${currentImageIndex + 1} → ${targetImageIndex + 1} (every ${imageTransitionTime.toFixed(1)}s)`);
      
      if (targetImageIndex !== currentImageIndex) {
        console.log(`🖼️ IMAGE CHANGE! ${currentImageIndex + 1} → ${targetImageIndex + 1}`);
        setCurrentImageIndex(targetImageIndex);
      }
    }
    console.log(`---`);
  }, [timeElapsed, sceneBaseDuration, currentSceneIndex, sceneCount, currentImages.length, imageTransitionTime, currentImageIndex, totalDuration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = () => {
    setPlaybackSpeed(prev => prev === 1 ? 2 : prev === 2 ? 0.5 : 1);
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
      console.log(`Scene ${currentSceneIndex + 1}: No images available, using fallback`);
      // Fallback image
      return 'https://picsum.photos/1280/720?random=' + currentSceneIndex;
    }
    
    const image = currentImages[currentImageIndex];
    console.log(`Scene ${currentSceneIndex + 1}: Image ${currentImageIndex + 1}/${currentImages.length} (${image?.type})`);
    
    if (!image?.base64Data) {
      console.log('No base64Data found, using fallback');
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
          
          <div className="scene-info">
            <h3 className="scene-title">{currentScene?.title}</h3>
            <span className="scene-number">{currentSceneIndex + 1} / {sceneCount}</span>
          </div>

          {/* Debug info */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            <div>Playing: {isPlaying ? 'Yes' : 'No'}</div>
            <div>Time: {timeElapsed.toFixed(1)}s / {totalDuration}s</div>
            <div>Scene: {currentSceneIndex + 1}/{sceneCount}</div>
            <div>Image: {currentImageIndex + 1}/{currentImages.length}</div>
            <div>Speed: {playbackSpeed}x</div>
          </div>

          <div className="subtitles">
            <div className="subtitle-text">
              {subtitleText || currentScene?.content || 'Scene content loading...'}
            </div>
          </div>
        </div>

        <div className="controls" style={{
          background: 'rgba(255,0,0,0.8)', 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 9999,
          display: 'flex',
          padding: '20px'
        }}>
          <div className="primary-controls">
            <button onClick={handlePreviousScene} className="control-btn" disabled={currentSceneIndex === 0} style={{
              background: 'blue',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              <span className="icon">⏮</span>
            </button>
            
            <button onClick={handlePlayPause} className="play-pause-btn" style={{
              background: 'green',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '0 10px'
            }}>
              <span className="icon">{isPlaying ? '⏸' : '▶'}</span>
            </button>
            
            <button onClick={handleNextScene} className="control-btn" disabled={currentSceneIndex === sceneCount - 1} style={{
              background: 'purple',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              <span className="icon">⏭</span>
            </button>

            <button onClick={() => {
              console.log('FORCE ADVANCE SCENE');
              setCurrentSceneIndex(prev => Math.min(prev + 1, sceneCount - 1));
              setCurrentImageIndex(0);
            }} style={{
              background: 'orange',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '0 10px'
            }}>
              FORCE NEXT
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
            <button onClick={handleSpeedChange} className="control-btn speed-btn">
              <span className="icon">{playbackSpeed}x</span>
            </button>
            
            <button onClick={handleFullscreen} className="control-btn fullscreen-btn">
              <span className="icon">{isFullscreen ? '⛶' : '⛶'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="story-info">
        <h2 className="story-title">
          {story.characters?.map(char => char.name).join(' & ') || 'Untitled Story'}
        </h2>
        <p className="story-outline">{story.story?.outline}</p>
      </div>
    </div>
  );
};

export default StoryPlayer;
