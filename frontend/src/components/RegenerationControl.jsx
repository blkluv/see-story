import React, { useState, useEffect } from 'react';

const RegenerationControl = ({ storyId, storyName }) => {
  const [isRegenerateEnabled, setIsRegenerateEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load initial regeneration status
  useEffect(() => {
    if (storyId) {
      loadRegenerationStatus();
    }
  }, [storyId]);

  const loadRegenerationStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/regenerate`);
      if (response.ok) {
        const data = await response.json();
        setIsRegenerateEnabled(data.forceRegenerate);
      }
    } catch (error) {
      console.error('Error loading regeneration status:', error);
    }
  };

  const toggleRegeneration = async () => {
    if (!isRegenerateEnabled) {
      // Show confirmation dialog when enabling
      setShowConfirmDialog(true);
      return;
    }
    
    // Directly disable if already enabled
    await updateRegenerationFlag(false);
  };

  const confirmRegeneration = async () => {
    setShowConfirmDialog(false);
    await updateRegenerationFlag(true);
  };

  const cancelRegeneration = () => {
    setShowConfirmDialog(false);
  };

  const updateRegenerationFlag = async (forceRegenerate) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/stories/${storyId}/regenerate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRegenerate }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsRegenerateEnabled(forceRegenerate);
        
        // Show success message
        if (forceRegenerate) {
          alert(`✅ Regeneration flag set for "${storyName}".\n\nThe story will be completely regenerated on next processing.`);
        } else {
          alert(`❌ Regeneration flag removed for "${storyName}".`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating regeneration flag:', error);
      alert('Failed to update regeneration flag. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = {
    backgroundColor: isRegenerateEnabled ? '#ff4444' : '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: isLoading ? 0.6 : 1,
    transition: 'all 0.3s ease',
  };

  const dialogStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 1000,
    minWidth: '300px',
    maxWidth: '500px',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        style={buttonStyle}
        onClick={toggleRegeneration}
        disabled={isLoading}
        title={isRegenerateEnabled 
          ? "Regeneration flag is SET - story will be completely regenerated" 
          : "Regeneration flag is OFF - click to force regeneration"
        }
      >
        {isLoading ? '⏳' : isRegenerateEnabled ? '🔄 ON' : '⭕ OFF'}
        {' '}Regenerate
      </button>
      
      {isRegenerateEnabled && (
        <span style={{
          fontSize: '12px',
          color: '#ff4444',
          fontWeight: 'bold',
          backgroundColor: '#fff3f3',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #ffcccc'
        }}>
          ⚠️ Will regenerate all content
        </span>
      )}

      {showConfirmDialog && (
        <>
          <div style={overlayStyle} onClick={cancelRegeneration}></div>
          <div style={dialogStyle}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
              🔄 Confirm Regeneration
            </h3>
            <p style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>
              This will mark "<strong>{storyName}</strong>" for complete regeneration.
              <br/><br/>
              <strong>All content will be regenerated:</strong>
              <br/>• Story scenes and content
              <br/>• Character entities
              <br/>• Scene images
              <br/>• Audio narration
            </p>
            <p style={{ 
              margin: '0 0 20px 0', 
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              ⚠️ <strong>Warning:</strong> This process cannot be undone and will replace all existing content.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={cancelRegeneration}
              >
                Cancel
              </button>
              <button
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={confirmRegeneration}
              >
                🔄 Yes, Regenerate
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RegenerationControl;
