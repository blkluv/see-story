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

  // Timing calculations - 10 minutes total (600 seconds)
  const totalDuration = 600; // 10 minutes in seconds
  const scenes = story?.generatedStory?.scenes || [];
  const sceneCount = scenes.length;
  const sceneBaseDuration = totalDuration / sceneCount; // Base time per scene
  
  const currentScene = scenes[currentSceneIndex];
  const currentImages = currentScene?.images?.filter(img => !img.error) || [];
  const imageTransitionTime = currentImages.length > 0 ? sceneBaseDuration / (currentImages.length * 2) : sceneBaseDuration / 2;

  // Text scrolling setup
  const currentText = currentScene?.content || '';
  const wordsPerSecond = 2.5; // Reading speed
  const textDuration = Math.max(currentText.length / (wordsPerSecond * 5), sceneBaseDuration * 0.8);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 0.1;
          const newProgress = (newTime / totalDuration) * 100;
          setProgress(newProgress);

          // Calculate which scene we should be on
          const targetSceneIndex = Math.floor(newTime / sceneBaseDuration);
          if (targetSceneIndex !== currentSceneIndex && targetSceneIndex < sceneCount) {
            setCurrentSceneIndex(targetSceneIndex);
            setCurrentImageIndex(0);
            setSubtitleProgress(0);
          }

          // Handle image transitions within scene
          const sceneElapsedTime = newTime - (currentSceneIndex * sceneBaseDuration);
          if (currentImages.length > 1) {
            const targetImageIndex = Math.floor(sceneElapsedTime / imageTransitionTime) % currentImages.length;
            if (targetImageIndex !== currentImageIndex) {
              setCurrentImageIndex(targetImageIndex);
            }
          }

          // Handle subtitle scrolling
          const subtitleElapsed = sceneElapsedTime;
          const subtitleProgressPercent = Math.min((subtitleElapsed / textDuration) * 100, 100);
          setSubtitleProgress(subtitleProgressPercent);
          
          // Calculate visible text
          const charactersToShow = Math.floor((subtitleProgressPercent / 100) * currentText.length);
          setSubtitleText(currentText.substring(0, charactersToShow));

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
  }, [isPlaying, currentSceneIndex, sceneBaseDuration, totalDuration, sceneCount, currentImages.length, imageTransitionTime, currentText, textDuration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
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
      // Fallback image
      return 'https://picsum.photos/1280/720?random=' + currentSceneIndex;
    }
    return `data:${currentImages[currentImageIndex]?.mimeType || 'image/png'};base64,${currentImages[currentImageIndex]?.base64Data}`;
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
              {subtitleText}
              {subtitleProgress < 100 && <span className="cursor">|</span>}
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
            <button onClick={onBack} className="control-btn back-btn">
              <span className="icon">←</span> Back
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
