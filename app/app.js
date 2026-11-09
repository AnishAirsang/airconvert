let currentFile = null;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropContent = document.getElementById('drop-content');
const fileDetails = document.getElementById('file-details');
const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const removeFileBtn = document.getElementById('remove-file-btn');

const controlsPanel = document.getElementById('controls-panel');
const targetFormatSelect = document.getElementById('target-format');
const convertBtn = document.getElementById('convert-btn');

const statusPanel = document.getElementById('status-panel');
const statusText = document.getElementById('status-text');
const statusPercent = document.getElementById('status-percent');
const progressBar = document.getElementById('progress-bar');
const resultActions = document.getElementById('result-actions');
const downloadBtn = document.getElementById('download-btn');
const openTabBtn = document.getElementById('open-tab-btn');

// Setup Drag & Drop Listeners
['dragenter', 'dragover'].forEach(event => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(event => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFile(e.target.files[0]);
  }
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetState();
});

if (openTabBtn) {
  openTabBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('app/index.html') });
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleFile(file) {
  currentFile = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatFileSize(file.size);

  dropContent.classList.add('hidden');
  fileDetails.classList.remove('hidden');

  populateTargetFormats(file);
  controlsPanel.classList.remove('hidden');
  statusPanel.classList.add('hidden');
}

function populateTargetFormats(file) {
  targetFormatSelect.innerHTML = '';
  const options = getAvailableConversions(file);

  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    targetFormatSelect.appendChild(el);
  });
}

function resetState() {
  currentFile = null;
  fileInput.value = '';
  dropContent.classList.remove('hidden');
  fileDetails.classList.add('hidden');
  controlsPanel.classList.add('hidden');
  statusPanel.classList.add('hidden');
  resultActions.classList.add('hidden');
  progressBar.style.width = '0%';
  progressBar.style.backgroundColor = 'var(--accent)';
}

// Convert action
convertBtn.addEventListener('click', async () => {
  if (!currentFile) return;

  const targetFormat = targetFormatSelect.value;
  statusPanel.classList.remove('hidden');
  resultActions.classList.add('hidden');
  progressBar.style.backgroundColor = 'var(--accent)';

  const updateProgress = (pct, text) => {
    progressBar.style.width = `${pct}%`;
    statusPercent.textContent = `${pct}%`;
    statusText.textContent = text;
  };

  updateProgress(15, 'Starting local process...');

  try {
    const result = await convertFileUniversal(currentFile, targetFormat, updateProgress);
    
    updateProgress(100, 'Finished! ⚡');
    
    const baseName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
    const finalName = `${baseName}.${result.ext}`;
    const url = URL.createObjectURL(result.blob);

    downloadBtn.href = url;
    downloadBtn.download = finalName;
    downloadBtn.textContent = `Download ${finalName} (${formatFileSize(result.blob.size)})`;
    resultActions.classList.remove('hidden');

  } catch (err) {
    statusText.textContent = 'Error: ' + err.message;
    progressBar.style.backgroundColor = '#ef4444';
  }
});
