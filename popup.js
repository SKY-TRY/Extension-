// PromptWeaver Sidebar Extension
class PromptWeaverSidebar {
  constructor() {
    this.isMinimized = false;
    this.initializeElements();
    this.attachEventListeners();
    this.loadStoredData();
  }

  initializeElements() {
    this.sidebarContainer = document.querySelector('.sidebar-container');
    this.promptInput = document.getElementById('promptInput');
    this.promptLevel = document.getElementById('promptLevel');
    this.refineBtn = document.getElementById('refineBtn');
    this.minimizeBtn = document.getElementById('minimizeBtn');
    this.expandBtn = document.getElementById('expandBtn');
    this.sidebarContent = document.getElementById('sidebarContent');
    this.minimizedState = document.getElementById('minimizedState');
    this.errorMessage = document.getElementById('errorMessage');
    this.resultsSection = document.getElementById('resultsSection');
    this.resultsContainer = document.getElementById('resultsContainer');
    this.buttonText = this.refineBtn.querySelector('.button-text');
    this.buttonSpinner = this.refineBtn.querySelector('.button-spinner');
  }

  attachEventListeners() {
    // Main functionality
    this.refineBtn.addEventListener('click', () => this.handleRefinePrompt());
    this.promptInput.addEventListener('input', () => this.clearError());
    
    // Minimize/Expand functionality
    this.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    this.expandBtn.addEventListener('click', () => this.toggleMinimize());
    
    // Auto-save form data
    this.promptInput.addEventListener('input', () => this.saveFormData());
    this.promptLevel.addEventListener('change', () => this.saveFormData());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.handleRefinePrompt();
      }
      if (e.key === 'Escape') {
        this.toggleMinimize();
      }
    });
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    
    if (this.isMinimized) {
      this.sidebarContainer.classList.add('minimized');
      this.sidebarContent.style.display = 'none';
      this.minimizedState.style.display = 'block';
    } else {
      this.sidebarContainer.classList.remove('minimized');
      this.sidebarContent.style.display = 'flex';
      this.minimizedState.style.display = 'none';
    }
    
    // Save minimized state
    chrome.storage.local.set({ isMinimized: this.isMinimized });
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get([
        'promptInput', 
        'promptLevel', 
        'isMinimized'
      ]);
      
      if (result.promptInput) {
        this.promptInput.value = result.promptInput;
      }
      if (result.promptLevel) {
        this.promptLevel.value = result.promptLevel;
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
      await chrome.storage.local.set({
        promptInput: this.promptInput.value,
        promptLevel: this.promptLevel.value
      });
    } catch (error) {
      console.log('Could not save form data');
    }
  }

  clearError() {
    this.errorMessage.style.display = 'none';
    this.errorMessage.textContent = '';
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  setLoading(loading) {
    this.refineBtn.disabled = loading;
    
    if (loading) {
      this.buttonText.style.display = 'none';
      this.buttonSpinner.style.display = 'flex';
    } else {
      this.buttonText.style.display = 'block';
      this.buttonSpinner.style.display = 'none';
    }
  }

  async handleRefinePrompt() {
    const text = this.promptInput.value.trim();
    const level = this.promptLevel.value;

    if (!text) {
      this.showError('Please enter an idea to refine.');
      this.promptInput.focus();
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
    this.resultsSection.style.display = 'none';
    this.resultsContainer.innerHTML = '';
  }

  displayResults(prompts) {
    this.resultsContainer.innerHTML = '';
    
    prompts.forEach((prompt, index) => {
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      
      resultCard.innerHTML = `
        <div class="result-header">
          <span class="result-title">Prompt ${index + 1}</span>
          <span class="result-rating">${prompt.rating}/10</span>
        </div>
        <div class="result-text">${prompt.promptText}</div>
        <button class="copy-button" data-text="${prompt.promptText}">
          Copy to Clipboard
        </button>
      `;
      
      const copyButton = resultCard.querySelector('.copy-button');
      copyButton.addEventListener('click', () => this.copyToClipboard(copyButton, prompt.promptText));
      
      this.resultsContainer.appendChild(resultCard);
    });
    
    this.resultsSection.style.display = 'block';
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      button.textContent = 'Copied!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = 'Copy to Clipboard';
        button.classList.remove('copied');
      }, 2000);
    }
  }
}

// Initialize the sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PromptWeaverSidebar();
});

// Handle extension lifecycle
chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle-sidebar') {
    const sidebar = document.querySelector('.sidebar-container');
    if (sidebar) {
      sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
    }
  }
});