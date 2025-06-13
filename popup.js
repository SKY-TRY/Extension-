// Chrome Extension Popup Script
class PromptWeaverExtension {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadStoredData();
  }

  initializeElements() {
    this.form = document.getElementById('promptForm');
    this.inputText = document.getElementById('inputText');
    this.promptLevel = document.getElementById('promptLevel');
    this.refineButton = document.getElementById('refineButton');
    this.errorDiv = document.getElementById('error');
    this.resultsDiv = document.getElementById('results');
  }

  attachEventListeners() {
    this.refineButton.addEventListener('click', () => this.handleRefinePrompt());
    this.inputText.addEventListener('input', () => this.clearError());
    
    // Save form data on change
    this.inputText.addEventListener('input', () => this.saveFormData());
    this.promptLevel.addEventListener('change', () => this.saveFormData());
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['inputText', 'promptLevel']);
      if (result.inputText) {
        this.inputText.value = result.inputText;
      }
      if (result.promptLevel) {
        this.promptLevel.value = result.promptLevel;
      }
    } catch (error) {
      console.log('No stored data found');
    }
  }

  async saveFormData() {
    try {
      await chrome.storage.local.set({
        inputText: this.inputText.value,
        promptLevel: this.promptLevel.value
      });
    } catch (error) {
      console.log('Could not save form data');
    }
  }

  clearError() {
    this.errorDiv.style.display = 'none';
    this.errorDiv.textContent = '';
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.style.display = 'block';
  }

  setLoading(loading) {
    this.refineButton.disabled = loading;
    if (loading) {
      this.refineButton.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          Refining...
        </div>
      `;
    } else {
      this.refineButton.textContent = 'Refine Prompt';
    }
  }

  async handleRefinePrompt() {
    const text = this.inputText.value.trim();
    const level = this.promptLevel.value;

    if (!text) {
      this.showError('Please enter an idea to refine.');
      return;
    }

    this.clearError();
    this.setLoading(true);
    this.resultsDiv.innerHTML = '';

    try {
      // Real API call to your PromptWeaver backend
      const response = await this.refinePromptAPI(text, level);
      
      if (response.success && response.data?.refinedPrompts) {
        this.displayResults(response.data.refinedPrompts);
      } else {
        throw new Error(response.error || 'Failed to refine prompt');
      }
    } catch (error) {
      this.showError(`Error: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  // Real API function - calls your PromptWeaver backend
  async refinePromptAPI(instruction, promptLevel) {
    const API_BASE_URL = 'http://localhost:9002'; // For local development
    
    const response = await fetch(`${API_BASE_URL}/api/refine-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruction: instruction,
        promptLevel: promptLevel
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  displayResults(prompts) {
    this.resultsDiv.innerHTML = '<h3 style="margin-bottom: 12px; font-size: 16px; font-weight: 600;">Refined Prompts:</h3>';
    
    prompts.forEach((prompt, index) => {
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      
      resultCard.innerHTML = `
        <div class="result-header">
          <span class="result-title">Prompt ${index + 1}</span>
          <span class="rating">${prompt.rating}/10</span>
        </div>
        <div class="result-text">${prompt.promptText}</div>
        <button class="copy-button" data-text="${prompt.promptText}">
          Copy to Clipboard
        </button>
      `;
      
      const copyButton = resultCard.querySelector('.copy-button');
      copyButton.addEventListener('click', () => this.copyToClipboard(copyButton, prompt.promptText));
      
      this.resultsDiv.appendChild(resultCard);
    });
  }

  async copyToClipboard(button, text) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy to Clipboard';
      }, 2000);
    }
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create the popup HTML structure
  document.getElementById('root').innerHTML = `
    <div class="container">
      <div class="header">
        <img src="icons/icon-32.png" alt="PromptWeaver" class="logo">
        <h1 class="title">PromptWeaver</h1>
      </div>
      
      <div id="error" class="error" style="display: none;"></div>
      
      <form id="promptForm">
        <div class="form-group">
          <label for="inputText" class="label">Enter your idea:</label>
          <textarea 
            id="inputText" 
            class="textarea" 
            placeholder="Describe what you want to create a prompt for..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="promptLevel" class="label">Prompt Level:</label>
          <select id="promptLevel" class="select">
            <option value="Quick">Quick</option>
            <option value="Balanced" selected>Balanced</option>
            <option value="Comprehensive">Comprehensive</option>
          </select>
        </div>
        
        <button type="button" id="refineButton" class="button">
          Refine Prompt
        </button>
      </form>
      
      <div id="results" class="results"></div>
    </div>
  `;
  
  // Initialize the extension
  new PromptWeaverExtension();
});

// Add this to the top of your popup.js or in a <style> tag in popup.html
const style = document.createElement('style');
style.textContent = `
  body {
    background: #18181b;
    color: #f4f4f5;
    font-family: 'PT Sans', sans-serif;
    min-width: 350px;
    min-height: 400px;
    position: relative;
    overflow: hidden;
  }
  .bg-icon {
    position: absolute;
    opacity: 0.12;
    pointer-events: none;
    z-index: 0;
  }
  .bg-icon.pen { top: 18px; left: 18px; width: 48px; height: 48px; }
  .bg-icon.brain { bottom: 18px; right: 18px; width: 48px; height: 48px; }
  .bg-icon.wand { top: 18px; right: 18px; width: 40px; height: 40px; }
`;
document.head.appendChild(style);

// Add SVG icons to the body
const penIcon = `<svg class="bg-icon pen" viewBox="0 0 48 48" fill="none"><path d="M29.6 7.5L34.8 12.8M29.6 7.5L10 27.2C9.5 27.7 9.1 28.4 8.9 29.2L8 37.2L16 36.2C16.7 36.1 17.4 35.7 18 35.2L37.6 15.5M29.6 7.5L37.6 15.5M37.6 15.5L34.8 12.8M34.8 12.8L22 25.7" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 11.2L33.2 18.4" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const brainIcon = `<svg class="bg-icon brain" viewBox="0 0 24 24" fill="none"><path d="M12 2C9.2 2 7 4.2 7 7C7 8.6 7.6 10 8.7 11H5C3.9 11 3 11.9 3 13V16C3 17.1 3.9 18 5 18H6.5C6.8 18 7 18.2 7 18.5V20C7 21.1 7.9 22 9 22H15C16.1 22 17 21.1 17 20V18.5C17 18.2 17.2 18 17.5 18H19C20.1 18 21 17.1 21 16V13C21 11.9 20.1 11 19 11H15.3C16.4 10 17 8.6 17 7C17 4.2 14.8 2 12 2Z" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const wandIcon = `<svg class="bg-icon wand" viewBox="0 0 24 24" fill="none"><path d="M15 4L19 8M19 4L15 8M12 2V6M12 18V22M4 12H8M16 12H20M5.6 5.6L8.5 8.5M15.5 15.5L18.4 18.4" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
document.body.insertAdjacentHTML('beforeend', penIcon + brainIcon + wandIcon);
