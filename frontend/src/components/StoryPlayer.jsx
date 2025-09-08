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

  // Timing calculations - 10 minutes total (600 seconds)
  const totalDuration = 600; // 10 minutes in seconds
  const scenes = story?.generatedStory?.scenes || [];
  const sceneCount = scenes.length;
  const sceneBaseDuration = totalDuration / sceneCount; // Base time per scene
  
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
      console.log(`Scene ${currentSceneIndex + 1}: "${currentScene.title}"`);
      console.log(`- Scene duration: ${sceneBaseDuration.toFixed(1)}s`);
      console.log(`- Images: ${currentImages.length}`);
      console.log(`- Image transition time: ${imageTransitionTime.toFixed(1)}s`);
      console.log(`- Text: ${currentText.substring(0, 100)}...`);
    }
  }, [currentSceneIndex, currentScene?.content, currentScene?.title, sceneBaseDuration, currentImages.length, imageTransitionTime, currentText]);

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
      console.log(`Switching from scene ${currentSceneIndex + 1} to scene ${targetSceneIndex + 1}`);
      setCurrentSceneIndex(targetSceneIndex);
      setCurrentImageIndex(0);
      setSubtitleProgress(0);
    }

    // Handle image transitions within scene
    const sceneElapsedTime = timeElapsed - (currentSceneIndex * sceneBaseDuration);
    if (currentImages.length > 1) {
      const targetImageIndex = Math.floor(sceneElapsedTime / imageTransitionTime) % currentImages.length;
      if (targetImageIndex !== currentImageIndex) {
        console.log(`Scene ${currentSceneIndex + 1}: Switching from image ${currentImageIndex + 1} to image ${targetImageIndex + 1}`);
        setCurrentImageIndex(targetImageIndex);
      }
    }
  }, [timeElapsed, sceneBaseDuration, currentSceneIndex, sceneCount, currentImages.length, imageTransitionTime, currentImageIndex]);

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
              <span className="icon">{isPlaying ? '⏸' : '▶'}</span>
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
