import React, { useState } from 'react';

const CreateStoryForm = () => {
  const [formData, setFormData] = useState({
    characters: [{ name: '', photo: '' }], // Array of characters, start with one empty character
    storyOutline: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleCharacterChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters.map((char, i) => 
        i === index ? { ...char, [field]: value } : char
      )
    }));
  };

  const addCharacter = () => {
    setFormData(prev => ({
      ...prev,
      characters: [...prev.characters, { name: '', photo: '' }]
    }));
  };

  const removeCharacter = (index) => {
    if (formData.characters.length > 1) {
      setFormData(prev => ({
        ...prev,
        characters: prev.characters.filter((_, i) => i !== index)
      }));
    }
  };

  const handleStoryOutlineChange = (e) => {
    setFormData(prev => ({
      ...prev,
      storyOutline: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate that at least one character has a name
      const validCharacters = formData.characters.filter(char => char.name.trim() !== '');
      if (validCharacters.length === 0) {
        alert('Please add at least one character with a name.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characters: validCharacters,
          storyOutline: formData.storyOutline
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setFormData({
          characters: [{ name: '', photo: '' }],
          storyOutline: ''
        });
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        throw new Error('Failed to submit story');
      }
    } catch (error) {
      console.error('Error submitting story:', error);
      alert('Failed to submit story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation helper
  const isFormValid = () => {
    const hasValidCharacter = formData.characters.some(char => char.name.trim() !== '');
    const hasStoryOutline = formData.storyOutline.trim() !== '';
    return hasValidCharacter && hasStoryOutline;
  };

  return (
    <div className="create-story-container">
      <div className="create-story-form">
        <h1 className="form-title">Create Your Story</h1>
        <p className="form-subtitle">Bring your character and story to life</p>
        
        {submitSuccess && (
          <div className="success-message">
            ✅ Story submitted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="section-header">
              <h2 className="section-title">Characters</h2>
              <button
                type="button"
                onClick={addCharacter}
                className="btn btn-add-character"
              >
                + Add Character
              </button>
            </div>
            
            {formData.characters.map((character, index) => (
              <div key={index} className="character-group">
                <div className="character-header">
                  <h3 className="character-title">Character {index + 1}</h3>
                  {formData.characters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCharacter(index)}
                      className="btn btn-remove-character"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor={`characterName-${index}`} className="form-label">
                    Character Name *
                  </label>
                  <input
                    type="text"
                    id={`characterName-${index}`}
                    value={character.name}
                    onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                    className="form-input"
                    placeholder="Enter character's name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`characterPhoto-${index}`} className="form-label">
                    Character Photo URL
                  </label>
                  <input
                    type="url"
                    id={`characterPhoto-${index}`}
                    value={character.photo}
                    onChange={(e) => handleCharacterChange(index, 'photo', e.target.value)}
                    className="form-input"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <small className="form-help">
                    Optional: Add a URL to this character's photo
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <h2 className="section-title">Story Details</h2>
            
            <div className="form-group">
              <label htmlFor="storyOutline" className="form-label">
                Story Outline *
              </label>
              <textarea
                id="storyOutline"
                value={formData.storyOutline}
                onChange={handleStoryOutlineChange}
                className="form-textarea"
                placeholder="Describe your story outline here... What's the main plot? What adventures await your characters?"
                rows={6}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-submit"
              disabled={isSubmitting || !isFormValid()}
            >
              {isSubmitting ? 'Creating Story...' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStoryForm;
