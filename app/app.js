// Format conversion matrix
const FORMAT_MAP = {
  // Images
  image: {
    formats: ['png', 'jpeg', 'webp', 'bmp', 'svg'],
    label: 'Image'
  },
  // Text / Docs
  markdown: {
    formats: ['html', 'txt', 'pdf'],
    label: 'Markdown Document'
  },
  text: {
    formats: ['pdf', 'html', 'md'],
    label: 'Plain Text'
  },
  json: {
    formats: ['csv', 'yaml', 'txt'],
    label: 'JSON Data'
  },
  csv: {
    formats: ['json', 'tsv', 'txt'],
    label: 'CSV Data'
  }
};

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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
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
  const ext = getFileExtension(file.name);
  targetFormatSelect.innerHTML = '';

  let available = [];

  if (file.type.startsWith('image/')) {
    available = ['png', 'jpeg', 'webp', 'bmp'].filter(f => f !== ext);
  } else if (ext === 'json') {
    available = ['csv', 'txt'];
  } else if (ext === 'csv') {
    available = ['json', 'txt'];
  } else if (['md', 'markdown'].includes(ext)) {
    available = ['html', 'txt'];
  } else {
    // Default fallback
    available = ['txt', 'pdf', 'png'];
  }

  available.forEach(fmt => {
    const opt = document.createElement('option');
    opt.value = fmt;
    opt.textContent = fmt.toUpperCase();
    targetFormatSelect.appendChild(opt);
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
}

// In-Browser Conversion Logic
convertBtn.addEventListener('click', async () => {
  if (!currentFile) return;

  const targetExt = targetFormatSelect.value;
  statusPanel.classList.remove('hidden');
  resultActions.classList.add('hidden');
  statusText.textContent = 'Processing locally...';
  statusPercent.textContent = '20%';
  progressBar.style.width = '20%';

  try {
    let resultBlob = null;

    if (currentFile.type.startsWith('image/')) {
      resultBlob = await convertImageInBrowser(currentFile, targetExt);
    } else if (getFileExtension(currentFile.name) === 'json' && targetExt === 'csv') {
      resultBlob = await convertJsonToCsv(currentFile);
    } else if (getFileExtension(currentFile.name) === 'csv' && targetExt === 'json') {
      resultBlob = await convertCsvToJson(currentFile);
    } else if (['md', 'markdown'].includes(getFileExtension(currentFile.name)) && targetExt === 'html') {
      resultBlob = await convertMarkdownToHtml(currentFile);
    } else {
      // Fallback text conversion
      resultBlob = await convertToPlainText(currentFile);
    }

    progressBar.style.width = '100%';
    statusPercent.textContent = '100%';
    statusText.textContent = 'Conversion Complete! ⚡';

    // Prepare Download
    const newFileName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) + '.' + targetExt;
    const url = URL.createObjectURL(resultBlob);
    downloadBtn.href = url;
    downloadBtn.download = newFileName;
    resultActions.classList.remove('hidden');

  } catch (err) {
    statusText.textContent = 'Error: ' + err.message;
    progressBar.style.backgroundColor = '#ef4444';
  }
});

// Image Conversion via Offscreen Canvas (100% In-Browser)
function convertImageInBrowser(file, targetFormat) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      progressBar.style.width = '60%';
      statusPercent.textContent = '60%';

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : `image/${targetFormat}`;
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate converted image blob'));
        }
      }, mimeType, 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = url;
  });
}

// JSON to CSV
async function convertJsonToCsv(file) {
  const text = await file.text();
  const json = JSON.parse(text);
  const items = Array.isArray(json) ? json : [json];
  
  if (items.length === 0) return new Blob([''], { type: 'text/csv' });

  const headers = Object.keys(items[0]);
  const rows = items.map(row => 
    headers.map(field => JSON.stringify(row[field] ?? '')).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  return new Blob([csvContent], { type: 'text/csv' });
}

// CSV to JSON
async function convertCsvToJson(file) {
  const text = await file.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return new Blob([JSON.stringify([])], { type: 'application/json' });

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });

  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

// Markdown to HTML
async function convertMarkdownToHtml(file) {
  const text = await file.text();
  // Basic markdown parser for headings, lists, bold, italics
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    .replace(/\n/gim, '<br/>');

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted Document</title></head><body>${html}</body></html>`;
  return new Blob([fullHtml], { type: 'text/html' });
}

// Plain text fallback
async function convertToPlainText(file) {
  const text = await file.text();
  return new Blob([text], { type: 'text/plain' });
}
