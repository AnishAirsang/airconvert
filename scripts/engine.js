/**
 * AirConvert Engine v1.2
 * 100% In-Browser, Zero-Upload File Conversion and Compression
 * Full Matrix: PDF <-> PPTX <-> DOCX <-> Images <-> Data
 */

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.js');
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';
    }
  } catch (e) {
    console.warn('PDF.js worker config notice:', e);
  }
}

// Available conversion matrices per input format
const CONVERSION_RULES = {
  // Office Document (.docx)
  docx: [
    { value: 'pdf', label: '📄 PDF Document (.pdf)' },
    { value: 'pptx', label: '📊 PowerPoint Presentation (.pptx)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' },
    { value: 'html', label: '🌐 HTML Webpage (.html)' },
    { value: 'md', label: '📋 Markdown (.md)' }
  ],
  // PowerPoint Presentation (.pptx)
  pptx: [
    { value: 'pdf', label: '📄 PDF Document (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'txt', label: '📝 Extract Slide Notes/Text (.txt)' },
    { value: 'html', label: '🌐 Presentation Outline HTML (.html)' }
  ],
  // PDF Document (.pdf)
  pdf: [
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'pptx', label: '📊 PowerPoint Presentation (.pptx)' },
    { value: 'compress', label: '⚡ Compress / Optimize PDF' },
    { value: 'png', label: '🖼️ Render Pages to PNG (.png)' },
    { value: 'txt', label: '📝 Extract Plain Text (.txt)' }
  ],
  // Images
  image: [
    { value: 'compress', label: '⚡ Compress Image (Reduce Size)' },
    { value: 'pdf', label: '📄 PDF Document (.pdf)' },
    { value: 'pptx', label: '📊 PowerPoint Slide (.pptx)' },
    { value: 'jpeg', label: 'JPEG Image (.jpg)' },
    { value: 'png', label: 'PNG Image (.png)' },
    { value: 'webp', label: 'WebP Image (.webp)' },
    { value: 'bmp', label: 'BMP Image (.bmp)' }
  ],
  // Text & Markdown
  text: [
    { value: 'pdf', label: '📄 PDF Document (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'pptx', label: '📊 PowerPoint Presentation (.pptx)' },
    { value: 'html', label: '🌐 HTML Webpage (.html)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' }
  ],
  md: [
    { value: 'html', label: '🌐 HTML Document (.html)' },
    { value: 'pdf', label: '📄 PDF Document (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' }
  ],
  // Structured Data
  json: [
    { value: 'csv', label: 'CSV Spreadsheet (.csv)' },
    { value: 'tsv', label: 'TSV Spreadsheet (.tsv)' },
    { value: 'txt', label: 'Formatted JSON Text (.txt)' }
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
  
  return CONVERSION_RULES.text;
}

// ----------------- UNIVERSAL DISPATCHER ----------------- //

async function convertFileUniversal(file, targetFormat, onProgress = () => {}) {
  const ext = getFileExtension(file.name);

  // PDF Source
  if (ext === 'pdf') {
    return await handlePdfSource(file, targetFormat, onProgress);
  }

  // DOCX Source
  if (ext === 'docx') {
    return await handleDocxSource(file, targetFormat, onProgress);
  }

  // PPTX Source
  if (ext === 'pptx') {
    return await handlePptxSource(file, targetFormat, onProgress);
  }

  // Image Source
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    return await handleImageSource(file, targetFormat, onProgress);
  }

  // Structured Data
  if (ext === 'json' || ext === 'csv') {
    onProgress(60, 'Transforming structured data...');
    return await processData(file, targetFormat);
  }

  // Markdown / Text Source
  const text = await file.text();
  if (targetFormat === 'docx') {
    return { blob: await generateDocxFromText(file.name, text.split('\n')), ext: 'docx' };
  }
  if (targetFormat === 'pptx') {
    return { blob: await generatePptxFromSlides(file.name, [{ title: file.name, lines: text.split('\n') }]), ext: 'pptx' };
  }
  if (targetFormat === 'pdf') {
    return { blob: await textToPdf(file.name, text), ext: 'pdf' };
  }
  if (targetFormat === 'html') {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;}</style></head><body>${text.replace(/\n/g, '<br/>')}</body></html>`;
    return { blob: new Blob([html], { type: 'text/html' }), ext: 'html' };
  }

  return { blob: new Blob([text], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- PDF CONVERSIONS (PDF -> DOCX, PPTX, COMPRESS, PNG) ----------------- //

async function handlePdfSource(file, targetFormat, onProgress) {
  const arrayBuffer = await file.arrayBuffer();

  // PDF Compression
  if (targetFormat === 'compress') {
    onProgress(50, 'Optimizing PDF object streams...');
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    return { blob: new Blob([compressedBytes], { type: 'application/pdf' }), ext: 'min.pdf' };
  }

  // Extract Pages / Text using PDF.js
  onProgress(30, 'Parsing PDF document structure...');
  const pagesData = await extractPdfPages(arrayBuffer, onProgress);

  // PDF -> DOCX
  if (targetFormat === 'docx') {
    onProgress(80, 'Compiling Word Document (.docx)...');
    const allLines = [];
    pagesData.forEach(p => {
      allLines.push(`=== PAGE ${p.pageNumber} ===`);
      allLines.push(...p.lines);
      allLines.push('');
    });
    const docxBlob = await generateDocxFromText(file.name, allLines);
    return { blob: docxBlob, ext: 'docx' };
  }

  // PDF -> PPTX
  if (targetFormat === 'pptx') {
    onProgress(80, 'Generating PowerPoint Presentation (.pptx)...');
    const slides = pagesData.map(p => ({
      title: `Page ${p.pageNumber}`,
      lines: p.lines.slice(0, 15) // Fit primary content onto slide
    }));
    const pptxBlob = await generatePptxFromSlides(file.name, slides);
    return { blob: pptxBlob, ext: 'pptx' };
  }

  // PDF -> PNG (Render first page / pages to image)
  if (targetFormat === 'png') {
    onProgress(70, 'Rendering PDF page to image canvas...');
    const canvas = await renderPdfPageToCanvas(arrayBuffer, 1);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return { blob, ext: 'png' };
  }

  // PDF -> TXT
  if (targetFormat === 'txt') {
    const fullText = pagesData.map(p => `--- Page ${p.pageNumber} ---\n${p.lines.join('\n')}`).join('\n\n');
    return { blob: new Blob([fullText], { type: 'text/plain' }), ext: 'txt' };
  }

  throw new Error(`Unsupported PDF target format: ${targetFormat}`);
}

async function extractPdfPages(arrayBuffer, onProgress = () => {}) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js parsing library is unavailable.');
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesData = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress(30 + Math.floor((i / numPages) * 40), `Extracting content from Page ${i}/${numPages}...`);
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items into lines
    const lineMap = {};
    for (const item of textContent.items) {
      if (!item.str || item.str.trim() === '') continue;
      // Round y position to bucket lines together
      const yKey = Math.round(item.transform[5] / 8) * 8;
      if (!lineMap[yKey]) lineMap[yKey] = [];
      lineMap[yKey].push(item.str);
    }

    // Sort top-to-bottom (descending y)
    const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    const lines = sortedY.map(y => lineMap[y].join(' ')).filter(l => l.trim().length > 0);

    pagesData.push({
      pageNumber: i,
      lines: lines.length > 0 ? lines : ['[No extractable text found on page]']
    });
  }

  return pagesData;
}

async function renderPdfPageToCanvas(arrayBuffer, pageNum = 1) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas;
}

// ----------------- DOCX CONVERSIONS (DOCX -> PDF, PPTX, HTML, TXT) ----------------- //

async function handleDocxSource(file, targetFormat, onProgress) {
  onProgress(30, 'Unpacking DOCX archive...');
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) throw new Error('Invalid DOCX: word/document.xml not found.');

  onProgress(50, 'Parsing paragraphs and headings...');
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
    if (line.trim().length > 0) textLines.push(line.trim());
  }

  // DOCX -> PPTX
  if (targetFormat === 'pptx') {
    onProgress(80, 'Formatting into PowerPoint slides...');
    // Chunk paragraphs into slides of ~5-7 lines each
    const chunkSize = 6;
    const slides = [];
    for (let i = 0; i < textLines.length; i += chunkSize) {
      const chunk = textLines.slice(i, i + chunkSize);
      slides.push({
        title: chunk[0].length < 40 ? chunk[0] : `Section ${Math.floor(i / chunkSize) + 1}`,
        lines: chunk.slice(1)
      });
    }
    if (slides.length === 0) slides.push({ title: file.name, lines: ['Document Content'] });
    const pptxBlob = await generatePptxFromSlides(file.name, slides);
    return { blob: pptxBlob, ext: 'pptx' };
  }

  // DOCX -> PDF
  if (targetFormat === 'pdf') {
    onProgress(80, 'Compiling PDF document...');
    const pdfBlob = await textToPdf(file.name, textLines.join('\n\n'));
    return { blob: pdfBlob, ext: 'pdf' };
  }

  // DOCX -> HTML
  if (targetFormat === 'html') {
    const bodyHtml = textLines.map(l => `<p>${escapeHtml(l)}</p>`).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;}</style></head><body>${bodyHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  // DOCX -> Markdown
  if (targetFormat === 'md') {
    const md = textLines.join('\n\n');
    return { blob: new Blob([md], { type: 'text/markdown' }), ext: 'md' };
  }

  // DOCX -> TXT
  return { blob: new Blob([textLines.join('\n\n')], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- PPTX CONVERSIONS (PPTX -> PDF, DOCX, HTML, TXT) ----------------- //

async function handlePptxSource(file, targetFormat, onProgress) {
  onProgress(30, 'Unpacking PowerPoint presentation...');
  const zip = await JSZip.loadAsync(file);

  const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  onProgress(50, `Extracting ${slideFiles.length} slides...`);
  const slidesContent = [];
  const parser = new DOMParser();

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const slideXml = await zip.file(slideFiles[idx]).async('string');
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
    const textNodes = xmlDoc.getElementsByTagName('a:t');
    
    const lines = [];
    for (let j = 0; j < textNodes.length; j++) {
      const txt = textNodes[j].textContent.trim();
      if (txt) lines.push(txt);
    }
    slidesContent.push({
      slideNum: idx + 1,
      lines: lines
    });
  }

  // PPTX -> DOCX
  if (targetFormat === 'docx') {
    onProgress(80, 'Compiling into Word Document (.docx)...');
    const docxLines = [];
    slidesContent.forEach(s => {
      docxLines.push(`Slide ${s.slideNum}`);
      docxLines.push(...s.lines);
      docxLines.push('');
    });
    const docxBlob = await generateDocxFromText(file.name, docxLines);
    return { blob: docxBlob, ext: 'docx' };
  }

  // PPTX -> PDF
  if (targetFormat === 'pdf') {
    onProgress(80, 'Rendering presentation summary PDF...');
    const fullText = slidesContent.map(s => `[SLIDE ${s.slideNum}]\n${s.lines.join('\n')}`).join('\n\n');
    const pdfBlob = await textToPdf(file.name, fullText);
    return { blob: pdfBlob, ext: 'pdf' };
  }

  // PPTX -> HTML
  if (targetFormat === 'html') {
    const slidesHtml = slidesContent.map(s => 
      `<div class="slide"><h2>Slide ${s.slideNum}</h2><p>${escapeHtml(s.lines.join(' '))}</p></div>`
    ).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;background:#f8fafc;padding:20px;}.slide{background:white;padding:24px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.05);}</style></head><body><h1>Presentation Outline</h1>${slidesHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  // PPTX -> TXT
  const txt = slidesContent.map(s => `--- Slide ${s.slideNum} ---\n${s.lines.join('\n')}`).join('\n\n');
  return { blob: new Blob([txt], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- IMAGE ENGINE & COMPRESSION ----------------- //

async function handleImageSource(file, targetFormat, onProgress) {
  onProgress(30, 'Loading image into memory...');

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Image -> PDF
      if (targetFormat === 'pdf') {
        onProgress(80, 'Creating PDF from image...');
        const pdfBlob = await imageToPdf(canvas, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(url);
        resolve({ blob: pdfBlob, ext: 'pdf' });
        return;
      }

      // Image -> PPTX
      if (targetFormat === 'pptx') {
        onProgress(80, 'Inserting image into PowerPoint slide...');
        const dataUrl = canvas.toDataURL('image/png');
        const pres = new PptxGenJS();
        const slide = pres.addSlide();
        slide.addImage({ data: dataUrl, x: 1, y: 1, w: 8, h: 4.5 });
        const pptxBlob = await pres.write({ outputType: 'blob' });
        URL.revokeObjectURL(url);
        resolve({ blob: pptxBlob, ext: 'pptx' });
        return;
      }

      // Image Compression or Format Conversion
      let mimeType = 'image/jpeg';
      let outExt = targetFormat;

      if (targetFormat === 'compress') {
        outExt = file.type === 'image/png' ? 'png' : (file.type === 'image/webp' ? 'webp' : 'jpeg');
        mimeType = outExt === 'png' ? 'image/png' : (outExt === 'webp' ? 'image/webp' : 'image/jpeg');
      } else if (targetFormat === 'png') {
        mimeType = 'image/png';
      } else if (targetFormat === 'webp') {
        mimeType = 'image/webp';
      } else if (targetFormat === 'bmp') {
        mimeType = 'image/bmp';
      }

      onProgress(85, 'Encoding compressed image...');
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve({ blob, ext: targetFormat === 'compress' ? 'min.' + outExt : outExt });
        } else {
          reject(new Error('Failed to encode image.'));
        }
      }, mimeType, targetFormat === 'compress' ? 0.60 : 0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to parse image data.'));
    };

    img.src = url;
  });
}

// ----------------- DOCUMENT GENERATORS (DOCX, PPTX, PDF) ----------------- //

async function generateDocxFromText(title, lines) {
  if (typeof docx === 'undefined') {
    throw new Error('DOCX generation engine not loaded.');
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const docChildren = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE
    })
  ];

  for (const line of lines) {
    if (line.startsWith('===') || line.startsWith('Slide')) {
      docChildren.push(new Paragraph({
        text: line,
        heading: HeadingLevel.HEADING_2
      }));
    } else {
      docChildren.push(new Paragraph({
        children: [new TextRun(line)]
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }]
  });

  return await Packer.toBlob(doc);
}

async function generatePptxFromSlides(title, slides) {
  if (typeof PptxGenJS === 'undefined') {
    throw new Error('PowerPoint generation engine not loaded.');
  }

  const pres = new PptxGenJS();
  pres.title = title;

  // Title Slide
  const titleSlide = pres.addSlide();
  titleSlide.addText(title, {
    x: 1,
    y: 2,
    w: 8,
    h: 1.5,
    fontSize: 28,
    bold: true,
    color: '363636',
    align: 'center'
  });
  titleSlide.addText('Converted with AirConvert (100% In-Browser)', {
    x: 1,
    y: 3.8,
    w: 8,
    h: 0.5,
    fontSize: 14,
    color: '6366f1',
    align: 'center'
  });

  // Content Slides
  for (const item of slides) {
    const slide = pres.addSlide();
    slide.addText(item.title || 'Slide', {
      x: 0.8,
      y: 0.6,
      w: 8.5,
      h: 0.8,
      fontSize: 20,
      bold: true,
      color: '1f2937'
    });

    const bodyText = (item.lines || []).join('\n');
    slide.addText(bodyText, {
      x: 0.8,
      y: 1.5,
      w: 8.5,
      h: 5.0,
      fontSize: 13,
      color: '4b5563',
      lineSpacing: 22
    });
  }

  return await pres.write({ outputType: 'blob' });
}

async function imageToPdf(canvas, width, height) {
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.create();
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

  page.drawText(title, {
    x: margin,
    y: y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.2)
  });
  y -= 30;

  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
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

// ----------------- DATA (CSV / JSON) ----------------- //

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
  }

  return { blob: new Blob([text], { type: 'text/plain' }), ext: 'txt' };
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
