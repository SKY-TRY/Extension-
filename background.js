// Background script to handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can access the tab
    if (!tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('Cannot inject into this page type');
      return;
    }

    // Send message to content script to toggle sidebar
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-sidebar' });
  } catch (error) {
    console.log('Content script not ready, injecting...');
    
    // If content script isn't loaded, inject it manually
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['sidebar.css']
      });
      
      // Wait a bit for injection to complete, then send message
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'toggle-sidebar' });
        } catch (retryError) {
          console.log('Failed to communicate with content script:', retryError);
        }
      }, 100);
      
    } catch (injectionError) {
      console.log('Failed to inject content script:', injectionError);
    }
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptWeaver extension installed');
});