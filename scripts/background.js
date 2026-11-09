let popupWindowId = null;

// When the user clicks the extension action icon in the toolbar
chrome.action.onClicked.addListener(async (tab) => {
  // If a popup window is already open, focus it
  if (popupWindowId !== null) {
    try {
      const existingWin = await chrome.windows.get(popupWindowId);
      if (existingWin) {
        await chrome.windows.update(popupWindowId, { focused: true });
        return;
      }
    } catch (e) {
      popupWindowId = null;
    }
  }

  // Get current display dimensions to position popup neatly in the top right
  try {
    const currentWin = await chrome.windows.getCurrent();
    const width = 450;
    const height = 700;
    const left = Math.max(0, (currentWin.left || 0) + (currentWin.width || 1200) - width - 20);
    const top = Math.max(0, (currentWin.top || 0) + 60);

    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: width,
      height: height,
      left: Math.round(left),
      top: Math.round(top),
      focused: true
    });
    popupWindowId = win.id;
  } catch (err) {
    // Fallback simple create
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 450,
      height: 700,
      focused: true
    });
    popupWindowId = win.id;
  }
});

// Clear reference when window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});
