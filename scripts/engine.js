/**
 * AirConvert Engine
 * 100% In-Browser, Zero-Upload File Conversion and Compression
 */

// Format options definition per category/extension
const CONVERSION_RULES = {
  // Images
  image: [
    { value: 'compress', label: '⚡ Compress Image (Reduce Size)' },
    { value: 'jpeg', label: 'JPEG (.jpg)' },
    { value: 'png', label: 'PNG (.png)' },
    { value: 'webp', label: 'WebP (.webp)' },
    { value: 'bmp', label: 'BMP (.bmp)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' }
  ],
  // Documents / Office
  docx: [
    { value: 'txt', label: 'Plain Text (.txt)' },
    { value: 'html', label: 'HTML Webpage (.html)' },
    { value: 'md', label: 'Markdown (.md)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' }
  ],
  pptx: [
    { value: 'txt', label: 'Extract Text Outline (.txt)' },
    { value: 'html', label: 'Slide Notes/Outline HTML (.html)' },
    { value: 'pdf', label: 'Summary Slides PDF (.pdf)' }
  ],
  pdf: [
    { value: 'compress', label: '⚡ Compress / Re-pack PDF' },
    { value: 'txt', label: 'Extract Plain Text (.txt)' }
  ],
  // Text & Markdown
  text: [
    { value: 'pdf', label: 'PDF Document (.pdf)' },
    { value: 'html', label: 'HTML Webpage (.html)' },
    { value: 'txt', label: 'Plain Text (.txt)' }
  ],
  md: [
    { value: 'html', label: 'HTML Document (.html)' },
    { value: 'txt', label: 'Plain Text (.txt)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' }
  ],
  // Structured Data
  json: [
    { value: 'csv', label: 'CSV Spreadsheet (.csv)' },
    { value: 'tsv', label: 'TSV (.tsv)' },
    { value: 'txt', label: 'Formatted Text (.txt)' }
  ],
  csv: [
    { value: 'json', label: 'JSON Data (.json)' },
    { value: 'tsv', label: 'TSV (.tsv)' },
    { value: 'html', label: 'HTML Table (.html)' }
  ]
};

function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

function getAvailableConversions(file) {
  const ext = getFileExtension(file.name);
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'svg'].includes(ext)) {
    return CONVERSION_RULES.image.filter(opt => opt.value !== ext);
  }
  if (ext === 'docx') return CONVERSION_RULES.docx;
  if (ext === 'pptx') return CONVERSION_RULES.pptx;
  if (ext === 'pdf') return CONVERSION_RULES.pdf;
  if (['md', 'markdown'].includes(ext)) return CONVERSION_RULES.md;
  if (ext === 'json') return CONVERSION_RULES.json;
  if (ext === 'csv') return CONVERSION_RULES.csv;
  
  // Generic fallback
  return [
    { value: 'txt', label: 'Plain Text (.txt)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' }
  ];
}

// ----------------- IMAGE CONVERSION & COMPRESSION ----------------- //

async function processImage(file, targetFormat, quality = 0.75, onProgress = () => {}) {
  onProgress(30, 'Loading image into memory...');
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      onProgress(60, 'Rendering canvas frames...');
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Convert to PDF?
      if (targetFormat === 'pdf') {
        onProgress(80, 'Generating PDF pages...');
        try {
          const pdfBlob = await imageToPdf(canvas, img.naturalWidth, img.naturalHeight);
          URL.revokeObjectURL(url);
          resolve({ blob: pdfBlob, ext: 'pdf' });
        } catch (e) {
          reject(e);
        }
        return;
      }

      // Normal or Compressed Image
      let mimeType = 'image/jpeg';
      let outExt = targetFormat;

      if (targetFormat === 'compress') {
        // Keep original format or fallback to webp/jpeg for optimal compression
        outExt = file.type === 'image/png' ? 'png' : (file.type === 'image/webp' ? 'webp' : 'jpeg');
        mimeType = outExt === 'png' ? 'image/png' : (outExt === 'webp' ? 'image/webp' : 'image/jpeg');
      } else if (targetFormat === 'png') {
        mimeType = 'image/png';
      } else if (targetFormat === 'webp') {
        mimeType = 'image/webp';
      } else if (targetFormat === 'bmp') {
        mimeType = 'image/bmp';
      }

      onProgress(85, 'Encoding compressed stream...');
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve({ blob, ext: outExt === 'compress' ? 'min.' + outExt : outExt });
        } else {
          reject(new Error('Failed to encode image.'));
        }
      }, mimeType, targetFormat === 'compress' ? 0.60 : quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image file.'));
    };

    img.src = url;
  });
}

async function imageToPdf(canvas, width, height) {
  if (typeof PDFLib === 'undefined') {
    throw new Error('PDF library not loaded.');
  }
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.create();

  // Create page matching image aspect ratio
  const page = pdfDoc.addPage([width, height]);
  const pngDataUrl = canvas.toDataURL('image/png');
  const pngImage = await pdfDoc.embedPng(pngDataUrl);

  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width,
    height
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ----------------- DOCX & PPTX EXTRACTION & CONVERSION ----------------- //

async function processDocx(file, targetFormat, onProgress = () => {}) {
  if (typeof JSZip === 'undefined') {
    throw new Error('ZIP processing library not loaded.');
  }

  onProgress(30, 'Unpacking DOCX XML archive...');
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Invalid DOCX format: word/document.xml missing');
  }

  onProgress(60, 'Parsing document elements...');
  // Extract text from w:t and paragraphs from w:p
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  const textLines = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagName('w:t');
    let line = '';
    for (let j = 0; j < textNodes.length; j++) {
      line += textNodes[j].textContent;
    }
    textLines.push(line);
  }

  const rawText = textLines.filter(l => l.trim().length > 0).join('\n\n');

  if (targetFormat === 'txt') {
    return { blob: new Blob([rawText], { type: 'text/plain' }), ext: 'txt' };
  }

  if (targetFormat === 'html') {
    const bodyHtml = textLines.map(l => `<p>${escapeHtml(l)}</p>`).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:0 20px;}</style></head><body>${bodyHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  if (targetFormat === 'md') {
    const md = textLines.join('\n\n');
    return { blob: new Blob([md], { type: 'text/markdown' }), ext: 'md' };
  }

  if (targetFormat === 'pdf') {
    onProgress(80, 'Compiling PDF document...');
    const pdfBlob = await textToPdf(file.name, rawText);
    return { blob: pdfBlob, ext: 'pdf' };
  }

  throw new Error(`Unsupported DOCX target format: ${targetFormat}`);
}

async function processPptx(file, targetFormat, onProgress = () => {}) {
  if (typeof JSZip === 'undefined') {
    throw new Error('ZIP processing library not loaded.');
  }

  onProgress(30, 'Unpacking PowerPoint presentation...');
  const zip = await JSZip.loadAsync(file);
  
  // Find all slide XML files
  const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  onProgress(60, `Reading ${slideFiles.length} slides...`);
  const slidesContent = [];
  const parser = new DOMParser();

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const slideXml = await zip.file(slideFiles[idx]).async('string');
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
    const textNodes = xmlDoc.getElementsByTagName('a:t');
    
    const lines = [];
    for (let j = 0; j < textNodes.length; j++) {
      lines.push(textNodes[j].textContent);
    }
    slidesContent.push({
      slideNum: idx + 1,
      text: lines.join(' ')
    });
  }

  if (targetFormat === 'txt') {
    const txt = slidesContent.map(s => `--- Slide ${s.slideNum} ---\n${s.text}`).join('\n\n');
    return { blob: new Blob([txt], { type: 'text/plain' }), ext: 'txt' };
  }

  if (targetFormat === 'html') {
    const slidesHtml = slidesContent.map(s => 
      `<div class="slide"><h2>Slide ${s.slideNum}</h2><p>${escapeHtml(s.text)}</p></div>`
    ).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;background:#f8fafc;color:#1e293b;padding:20px;}.slide{background:white;padding:24px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.05);}</style></head><body><h1>Presentation Outline</h1>${slidesHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  if (targetFormat === 'pdf') {
    onProgress(85, 'Rendering presentation summary PDF...');
    const fullText = slidesContent.map(s => `[SLIDE ${s.slideNum}]\n${s.text}`).join('\n\n');
    const pdfBlob = await textToPdf(file.name, fullText);
    return { blob: pdfBlob, ext: 'pdf' };
  }

  throw new Error(`Unsupported PPTX target format: ${targetFormat}`);
}

// ----------------- PDF UTILITIES ----------------- //

async function processPdf(file, targetFormat, onProgress = () => {}) {
  if (typeof PDFLib === 'undefined') {
    throw new Error('PDF library not loaded.');
  }

  onProgress(40, 'Reading PDF structure...');
  const { PDFDocument } = PDFLib;
  const arrayBuffer = await file.arrayBuffer();

  if (targetFormat === 'compress') {
    onProgress(70, 'Optimizing and rebuilding PDF streams...');
    // Load and re-save with stream compression enabled
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    return { blob: new Blob([compressedBytes], { type: 'application/pdf' }), ext: 'min.pdf' };
  }

  if (targetFormat === 'txt') {
    onProgress(70, 'Extracting text streams...');
    // Simple ASCII stream extraction
    const textDecoder = new TextDecoder('latin1');
    const content = textDecoder.decode(arrayBuffer);
    const matches = content.match(/\((.*?)\)\s*Tj/g) || [];
    const extracted = matches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
    const result = extracted || 'Text extraction complete. (Note: Scanned/vector fonts may require OCR).';
    return { blob: new Blob([result], { type: 'text/plain' }), ext: 'txt' };
  }

  throw new Error(`Unsupported PDF target format: ${targetFormat}`);
}

async function textToPdf(title, text) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 10;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  page.drawText(title, {
    x: margin,
    y: y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.2)
  });
  y -= 30;

  // Split into lines
  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
    // Word wrap
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width < pageWidth - (margin * 2)) {
        currentLine = testLine;
      } else {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
        y -= lineHeight;
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ----------------- STRUCTURED DATA (CSV / JSON) ----------------- //

async function processData(file, targetFormat) {
  const ext = getFileExtension(file.name);
  const text = await file.text();

  if (ext === 'json') {
    const json = JSON.parse(text);
    const items = Array.isArray(json) ? json : [json];
    if (items.length === 0) return { blob: new Blob([''], { type: 'text/csv' }), ext: 'csv' };

    const headers = Object.keys(items[0]);
    const delimiter = targetFormat === 'tsv' ? '\t' : ',';
    const rows = items.map(row => headers.map(f => JSON.stringify(row[f] ?? '')).join(delimiter));
    const content = [headers.join(delimiter), ...rows].join('\n');
    return { blob: new Blob([content], { type: targetFormat === 'tsv' ? 'text/tab-separated-values' : 'text/csv' }), ext: targetFormat };
  }

  if (ext === 'csv') {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });

    if (targetFormat === 'json') {
      return { blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), ext: 'json' };
    }
    if (targetFormat === 'html') {
      const tableRows = data.map(row => `<tr>${headers.map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`).join('\n');
      const tableHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;font-family:sans-serif;}th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;}th{background:#f1f5f9;}</style></head><body><table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
      return { blob: new Blob([tableHtml], { type: 'text/html' }), ext: 'html' };
    }
  }

  return { blob: new Blob([text], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- UNIVERSAL CONVERT DISPATCHER ----------------- //

async function convertFileUniversal(file, targetFormat, onProgress = () => {}) {
  const ext = getFileExtension(file.name);

  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    return await processImage(file, targetFormat, 0.8, onProgress);
  }
  if (ext === 'docx') {
    return await processDocx(file, targetFormat, onProgress);
  }
  if (ext === 'pptx') {
    return await processPptx(file, targetFormat, onProgress);
  }
  if (ext === 'pdf') {
    return await processPdf(file, targetFormat, onProgress);
  }
  if (ext === 'json' || ext === 'csv') {
    onProgress(60, 'Transforming structured data...');
    return await processData(file, targetFormat);
  }
  if (['md', 'markdown'].includes(ext)) {
    const text = await file.text();
    if (targetFormat === 'html') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;}</style></head><body>${text.replace(/\n/g, '<br/>')}</body></html>`;
      return { blob: new Blob([html], { type: 'text/html' }), ext: 'html' };
    }
    if (targetFormat === 'pdf') {
      const pdfBlob = await textToPdf(file.name, text);
      return { blob: pdfBlob, ext: 'pdf' };
    }
  }

  // Fallback text
  const raw = await file.text();
  return { blob: new Blob([raw], { type: 'text/plain' }), ext: 'txt' };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
