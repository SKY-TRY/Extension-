// PromptWeaver Content Script - Injects sidebar into any webpage
class PromptWeaverSidebar {
  constructor() {
    this.isVisible = false;
    this.isMinimized = false;
    this.sidebarElement = null;
    this.messageListener = null;
    this.init();
  }

  init() {
    // Prevent multiple instances
    if (document.getElementById('promptweaver-sidebar')) {
      return;
    }

    this.createSidebar();
    this.attachEventListeners();
    this.loadStoredData();
    this.setupMessageListener();
  }

  setupMessageListener() {
    // Remove existing listener if any
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
    }

    // Create new listener
    this.messageListener = (request, sender, sendResponse) => {
      try {
        if (request.action === 'toggle-sidebar') {
          this.toggleSidebar();
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true; // Keep message channel open for async response
    };

    // Add listener
    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  createSidebar() {
    // Create sidebar container
    this.sidebarElement = document.createElement('div');
    this.sidebarElement.id = 'promptweaver-sidebar';
    this.sidebarElement.className = 'promptweaver-sidebar-container';
    
    this.sidebarElement.innerHTML = `
      <div class="promptweaver-sidebar-content">
        <div class="promptweaver-sidebar-header">
          <div class="promptweaver-header-content">
            <h1 class="promptweaver-sidebar-title">🧠 PromptWeaver</h1>
            <div class="promptweaver-header-buttons">
              <button class="promptweaver-minimize-btn" id="promptweaver-minimize">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <button class="promptweaver-close-btn" id="promptweaver-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="promptweaver-sidebar-body" id="promptweaver-sidebar-body">
          <div class="promptweaver-form-section">
            <div class="promptweaver-input-group">
              <label for="promptweaver-prompt-input" class="promptweaver-input-label">Enter your idea</label>
              <textarea 
                id="promptweaver-prompt-input" 
                class="promptweaver-prompt-textarea"
                placeholder="Describe what you want to create a prompt for..."
                rows="4"
              ></textarea>
            </div>

            <div class="promptweaver-input-group">
              <label for="promptweaver-prompt-level" class="promptweaver-input-label">Prompt Level</label>
              <select id="promptweaver-prompt-level" class="promptweaver-prompt-select">
                <option value="Quick">Quick</option>
                <option value="Balanced" selected>Balanced</option>
                <option value="Creative">Creative</option>
                <option value="Detailed">Detailed</option>
                <option value="Comprehensive">Comprehensive</option>
              </select>
            </div>

            <button id="promptweaver-refine-btn" class="promptweaver-refine-button">
              <span class="promptweaver-button-text">Refine Prompt</span>
              <div class="promptweaver-button-spinner" style="display: none;">
                <div class="promptweaver-spinner"></div>
                <span>Refining...</span>
              </div>
            </button>
          </div>

          <div id="promptweaver-error-message" class="promptweaver-error-message" style="display: none;"></div>
          
          <div id="promptweaver-results-section" class="promptweaver-results-section" style="display: none;">
            <h3 class="promptweaver-results-title">Refined Prompts</h3>
            <div id="promptweaver-results-container" class="promptweaver-results-container"></div>
          </div>
        </div>

        <!-- Minimized state -->
        <div class="promptweaver-minimized-state" id="promptweaver-minimized-state" style="display: none;">
          <button class="promptweaver-expand-btn" id="promptweaver-expand">
            <span class="promptweaver-expand-icon">🧠</span>
            <span class="promptweaver-expand-text">PromptWeaver</span>
          </button>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.sidebarElement);
  }

  attachEventListeners() {
    // Get elements
    const promptInput = document.getElementById('promptweaver-prompt-input');
    const promptLevel = document.getElementById('promptweaver-prompt-level');
    const refineBtn = document.getElementById('promptweaver-refine-btn');
    const minimizeBtn = document.getElementById('promptweaver-minimize');
    const closeBtn = document.getElementById('promptweaver-close');
    const expandBtn = document.getElementById('promptweaver-expand');

    // Main functionality
    refineBtn?.addEventListener('click', () => this.handleRefinePrompt());
    promptInput?.addEventListener('input', () => this.clearError());
    
    // Sidebar controls
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    closeBtn?.addEventListener('click', () => this.toggleSidebar());
    expandBtn?.addEventListener('click', () => this.toggleMinimize());
    
    // Auto-save form data
    promptInput?.addEventListener('input', () => this.saveFormData());
    promptLevel?.addEventListener('change', () => this.saveFormData());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isVisible && e.ctrlKey && e.key === 'Enter') {
        this.handleRefinePrompt();
      }
      if (this.isVisible && e.key === 'Escape') {
        this.toggleMinimize();
      }
    });

    // Prevent sidebar from interfering with page interactions
    this.sidebarElement?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  toggleSidebar() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.sidebarElement.style.display = 'block';
      // Animate in
      setTimeout(() => {
        this.sidebarElement.classList.add('promptweaver-visible');
      }, 10);
    } else {
      this.sidebarElement.classList.remove('promptweaver-visible');
      // Hide after animation
      setTimeout(() => {
        this.sidebarElement.style.display = 'none';
      }, 300);
    }
    
    // Save visibility state
    this.saveToStorage({ isVisible: this.isVisible });
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const sidebarBody = document.getElementById('promptweaver-sidebar-body');
    const minimizedState = document.getElementById('promptweaver-minimized-state');
    
    if (this.isMinimized) {
      this.sidebarElement.classList.add('promptweaver-minimized');
      sidebarBody.style.display = 'none';
      minimizedState.style.display = 'block';
    } else {
      this.sidebarElement.classList.remove('promptweaver-minimized');
      sidebarBody.style.display = 'flex';
      minimizedState.style.display = 'none';
    }
    
    // Save minimized state
    this.saveToStorage({ isMinimized: this.isMinimized });
  }

  async loadStoredData() {
    try {
      const result = await this.getFromStorage([
        'promptInput', 
        'promptLevel', 
        'isVisible',
        'isMinimized'
      ]);
      
      const promptInput = document.getElementById('promptweaver-prompt-input');
      const promptLevel = document.getElementById('promptweaver-prompt-level');
      
      if (result.promptInput && promptInput) {
        promptInput.value = result.promptInput;
      }
      if (result.promptLevel && promptLevel) {
        promptLevel.value = result.promptLevel;
      }
      if (result.isVisible) {
        this.isVisible = result.isVisible;
        this.toggleSidebar();
      }
      if (result.isMinimized) {
        this.isMinimized = result.isMinimized;
        this.toggleMinimize();
      }
    } catch (error) {
      console.log('No stored data found');
    }
  }

  async saveFormData() {
    try {
      const promptInput = document.getElementById('promptweaver-prompt-input');
      const promptLevel = document.getElementById('promptweaver-prompt-level');
      
      await this.saveToStorage({
        promptInput: promptInput?.value || '',
        promptLevel: promptLevel?.value || 'Balanced'
      });
    } catch (error) {
      console.log('Could not save form data');
    }
  }

  // Helper methods for storage with error handling
  async saveToStorage(data) {
    try {
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(data);
      }
    } catch (error) {
      console.log('Storage not available:', error);
    }
  }

  async getFromStorage(keys) {
    try {
      if (chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.get(keys);
      }
      return {};
    } catch (error) {
      console.log('Storage not available:', error);
      return {};
    }
  }

  clearError() {
    const errorMessage = document.getElementById('promptweaver-error-message');
    if (errorMessage) {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }
  }

  showError(message) {
    const errorMessage = document.getElementById('promptweaver-error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  setLoading(loading) {
    const refineBtn = document.getElementById('promptweaver-refine-btn');
    const buttonText = refineBtn?.querySelector('.promptweaver-button-text');
    const buttonSpinner = refineBtn?.querySelector('.promptweaver-button-spinner');
    
    if (refineBtn) refineBtn.disabled = loading;
    
    if (loading) {
      if (buttonText) buttonText.style.display = 'none';
      if (buttonSpinner) buttonSpinner.style.display = 'flex';
    } else {
      if (buttonText) buttonText.style.display = 'block';
      if (buttonSpinner) buttonSpinner.style.display = 'none';
    }
  }

  async handleRefinePrompt() {
    const promptInput = document.getElementById('promptweaver-prompt-input');
    const promptLevel = document.getElementById('promptweaver-prompt-level');
    
    const text = promptInput?.value.trim() || '';
    const level = promptLevel?.value || 'Balanced';

    if (!text) {
      this.showError('Please enter an idea to refine.');
      promptInput?.focus();
      return;
    }

    this.clearError();
    this.setLoading(true);
    this.hideResults();

    try {
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

  async refinePromptAPI(instruction, promptLevel) {
    // For development - replace with your actual API endpoint
    const API_BASE_URL = 'http://localhost:9002';
    
    try {
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
    } catch (error) {
      // Fallback demo data for testing
      console.log('Using demo data - API not available');
      return {
        success: true,
        data: {
          refinedPrompts: [
            {
              promptText: `Create a comprehensive ${instruction.toLowerCase()} that focuses on user experience and modern design principles. Include specific examples and actionable steps.`,
              rating: 8.5
            },
            {
              promptText: `Design an innovative ${instruction.toLowerCase()} solution that addresses current market needs while incorporating emerging technologies and best practices.`,
              rating: 9.2
            }
          ]
        }
      };
    }
  }

  hideResults() {
    const resultsSection = document.getElementById('promptweaver-results-section');
    const resultsContainer = document.getElementById('promptweaver-results-container');
    
    if (resultsSection) resultsSection.style.display = 'none';
    if (resultsContainer) resultsContainer.innerHTML = '';
  }

  displayResults(prompts) {
    const resultsSection = document.getElementById('promptweaver-results-section');
    const resultsContainer = document.getElementById('promptweaver-results-container');
    
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    prompts.forEach((prompt, index) => {
      const resultCard = document.createElement('div');
      resultCard.className = 'promptweaver-result-card';
      
      resultCard.innerHTML = `
        <div class="promptweaver-result-header">
          <span class="promptweaver-result-title">Prompt ${index + 1}</span>
          <span class="promptweaver-result-rating">${prompt.rating}/10</span>
        </div>
        <div class="promptweaver-result-text">${prompt.promptText}</div>
        <button class="promptweaver-copy-button" data-text="${prompt.promptText}">
          Copy to Clipboard
        </button>
      `;
      
      const copyButton = resultCard.querySelector('.promptweaver-copy-button');
      copyButton?.addEventListener('click', () => this.copyToClipboard(copyButton, prompt.promptText));
      
      resultsContainer.appendChild(resultCard);
    });
    
    if (resultsSection) {
      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async copyToClipboard(button, text) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('promptweaver-copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('promptweaver-copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      button.textContent = 'Copied!';
      button.classList.add('promptweaver-copied');
      setTimeout(() => {
        button.textContent = 'Copy to Clipboard';
        button.classList.remove('promptweaver-copied');
      }, 2000);
    }
  }
}

// Initialize the sidebar when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PromptWeaverSidebar();
  });
} else {
  new PromptWeaverSidebar();
}