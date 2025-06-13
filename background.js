// Background script to handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle sidebar
  chrome.tabs.sendMessage(tab.id, { action: 'toggle-sidebar' });
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PromptWeaver extension installed');
});