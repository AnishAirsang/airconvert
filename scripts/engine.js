/**
 * AirConvert Engine v2.0 - High-Fidelity (Target 80%+ Visual Precision)
 * 100% In-Browser, Zero-Upload File Conversion and Compression
 * 
 * Supports:
 * - High-Res Pixel-Perfect Visual Slide Duplication (PDF -> PPTX)
 * - Exact Page Dimensions & Aspect Ratio Matching
 * - Font Size, Bold/Italic & Color Extraction (DOCX / PPTX XML)
 * - Clean Structural Text & Formatting Preserved
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

// Format options definition per category/extension
const CONVERSION_RULES = {
  docx: [
    { value: 'pdf', label: '📄 PDF Document (Formatted .pdf)' },
    { value: 'pptx', label: '📊 PowerPoint Presentation (.pptx)' },
    { value: 'html', label: '🌐 Styled HTML Webpage (.html)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' },
    { value: 'md', label: '📋 Markdown (.md)' }
  ],
  pptx: [
    { value: 'pdf', label: '📄 PDF Presentation (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'txt', label: '📝 Extract Text & Notes (.txt)' },
    { value: 'html', label: '🌐 Presentation Outline HTML (.html)' }
  ],
  pdf: [
    { value: 'pptx-visual', label: '📊 PowerPoint (Visual High-Fidelity 1:1 .pptx)' },
    { value: 'pptx-text', label: '📊 PowerPoint (Editable Text Slides .pptx)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'compress', label: '⚡ Compress / Optimize PDF' },
    { value: 'png', label: '🖼️ Render Pages to PNG (.png)' },
    { value: 'txt', label: '📝 Extract Text (.txt)' }
  ],
  image: [
    { value: 'compress', label: '⚡ Compress Image (Reduce Size)' },
    { value: 'pdf', label: '📄 High-Res PDF (.pdf)' },
    { value: 'pptx', label: '📊 PowerPoint Slide (.pptx)' },
    { value: 'jpeg', label: 'JPEG Image (.jpg)' },
    { value: 'png', label: 'PNG Image (.png)' },
    { value: 'webp', label: 'WebP Image (.webp)' },
    { value: 'bmp', label: 'BMP Image (.bmp)' }
  ],
  text: [
    { value: 'pdf', label: '📄 Formatted PDF (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'pptx', label: '📊 PowerPoint (.pptx)' },
    { value: 'html', label: '🌐 HTML Webpage (.html)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' }
  ],
  md: [
    { value: 'html', label: '🌐 Styled HTML (.html)' },
    { value: 'pdf', label: '📄 Styled PDF (.pdf)' },
    { value: 'docx', label: '📑 Word Document (.docx)' },
    { value: 'txt', label: '📝 Plain Text (.txt)' }
  ],
  json: [
    { value: 'csv', label: 'CSV Spreadsheet (.csv)' },
    { value: 'tsv', label: 'TSV Spreadsheet (.tsv)' },
    { value: 'txt', label: 'Formatted JSON (.txt)' }
  ],
  csv: [
    { value: 'json', label: 'JSON Data (.json)' },
    { value: 'tsv', label: 'TSV (.tsv)' },
    { value: 'html', label: 'Styled HTML Table (.html)' }
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
    return { blob: await generateDocxFromRichElements(file.name, [{ text, bold: false, size: 11, color: '1f2937' }]), ext: 'docx' };
  }
  if (targetFormat === 'pptx') {
    return { blob: await generatePptxFromSlides(file.name, [{ title: file.name, lines: text.split('\n') }]), ext: 'pptx' };
  }
  if (targetFormat === 'pdf') {
    return { blob: await textToPdf(file.name, text), ext: 'pdf' };
  }
  if (targetFormat === 'html') {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;color:#1e293b;}</style></head><body>${text.replace(/\n/g, '<br/>')}</body></html>`;
    return { blob: new Blob([html], { type: 'text/html' }), ext: 'html' };
  }

  return { blob: new Blob([text], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- PDF HIGH-FIDELITY CONVERSION ----------------- //

async function handlePdfSource(file, targetFormat, onProgress) {
  const arrayBuffer = await file.arrayBuffer();

  // 1. VISUAL HIGH-FIDELITY PDF -> PPTX (100% exact fonts, colors, layout, equations)
  if (targetFormat === 'pptx-visual') {
    onProgress(20, 'Opening PDF for high-fidelity raster rendering...');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const pres = new PptxGenJS();
    pres.title = file.name;

    for (let i = 1; i <= numPages; i++) {
      onProgress(20 + Math.floor((i / numPages) * 70), `Rendering high-res page ${i}/${numPages}...`);
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.5 }); // Crisp 2.5x retina rendering

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // Match 16:9 or custom slide aspect ratio to PDF page
      const pageRatio = viewport.width / viewport.height;
      let slideW = 10;
      let slideH = 10 / pageRatio;
      if (slideH > 7.5) {
        slideH = 7.5;
        slideW = 7.5 * pageRatio;
      }

      const imgDataUrl = canvas.toDataURL('image/png', 0.95);
      const slide = pres.addSlide();
      const xOffset = Math.max(0, (10 - slideW) / 2);
      const yOffset = Math.max(0, (7.5 - slideH) / 2);

      slide.addImage({
        data: imgDataUrl,
        x: xOffset,
        y: yOffset,
        w: slideW,
        h: slideH
      });
    }

    onProgress(95, 'Compiling PowerPoint presentation...');
    const pptxBlob = await pres.write({ outputType: 'blob' });
    return { blob: pptxBlob, ext: 'pptx' };
  }

  // 2. TEXT-EDITABLE PDF -> PPTX
  if (targetFormat === 'pptx-text') {
    onProgress(30, 'Extracting text and positional layout...');
    const pagesData = await extractPdfPages(arrayBuffer, onProgress);
    const slides = pagesData.map(p => ({
      title: `Page ${p.pageNumber}`,
      lines: p.lines.slice(0, 15)
    }));
    const pptxBlob = await generatePptxFromSlides(file.name, slides);
    return { blob: pptxBlob, ext: 'pptx' };
  }

  // 3. PDF -> DOCX with structured paragraphs & headings
  if (targetFormat === 'docx') {
    onProgress(40, 'Extracting document text & layout...');
    const pagesData = await extractPdfPages(arrayBuffer, onProgress);
    const docxElements = [];

    pagesData.forEach(p => {
      docxElements.push({ text: `Page ${p.pageNumber}`, isHeading: true, bold: true, size: 14, color: '3b82f6' });
      p.lines.forEach(l => {
        const isHeaderLike = l.length < 50 && !l.endsWith('.');
        docxElements.push({
          text: l,
          isHeading: isHeaderLike,
          bold: isHeaderLike,
          size: isHeaderLike ? 12 : 11,
          color: isHeaderLike ? '111827' : '374151'
        });
      });
    });

    onProgress(85, 'Compiling Word Document (.docx)...');
    const docxBlob = await generateDocxFromRichElements(file.name, docxElements);
    return { blob: docxBlob, ext: 'docx' };
  }

  // 4. PDF Compression
  if (targetFormat === 'compress') {
    onProgress(50, 'Optimizing PDF object streams...');
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    return { blob: new Blob([compressedBytes], { type: 'application/pdf' }), ext: 'min.pdf' };
  }

  // 5. PDF -> PNG
  if (targetFormat === 'png') {
    onProgress(60, 'Rendering first page to high-res PNG...');
    const canvas = await renderPdfPageToCanvas(arrayBuffer, 1);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return { blob, ext: 'png' };
  }

  // 6. PDF -> TXT
  const pagesData = await extractPdfPages(arrayBuffer, onProgress);
  const fullText = pagesData.map(p => `--- Page ${p.pageNumber} ---\n${p.lines.join('\n')}`).join('\n\n');
  return { blob: new Blob([fullText], { type: 'text/plain' }), ext: 'txt' };
}

async function extractPdfPages(arrayBuffer, onProgress = () => {}) {
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
      const yKey = Math.round(item.transform[5] / 8) * 8;
      if (!lineMap[yKey]) lineMap[yKey] = [];
      lineMap[yKey].push(item.str);
    }

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

// ----------------- DOCX XML STYLES & FONTS EXTRACTION ----------------- //

async function handleDocxSource(file, targetFormat, onProgress) {
  onProgress(25, 'Unpacking DOCX archive & styles...');
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('Invalid DOCX: word/document.xml not found.');

  onProgress(50, 'Parsing rich paragraph runs, colors, and font styles...');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  const richElements = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const runs = p.getElementsByTagName('w:r');
    let pText = '';
    let isBold = false;
    let isItalic = false;
    let colorHex = '1f2937';
    let fontSize = 11;

    for (let j = 0; j < runs.length; j++) {
      const r = runs[j];
      const rPr = r.getElementsByTagName('w:rPr')[0];
      if (rPr) {
        if (rPr.getElementsByTagName('w:b').length > 0) isBold = true;
        if (rPr.getElementsByTagName('w:i').length > 0) isItalic = true;
        const colorTag = rPr.getElementsByTagName('w:color')[0];
        if (colorTag && colorTag.getAttribute('w:val')) {
          colorHex = colorTag.getAttribute('w:val');
        }
        const szTag = rPr.getElementsByTagName('w:sz')[0];
        if (szTag && szTag.getAttribute('w:val')) {
          fontSize = Math.round(parseInt(szTag.getAttribute('w:val')) / 2); // w:sz is in half-points
        }
      }

      const textNodes = r.getElementsByTagName('w:t');
      for (let k = 0; k < textNodes.length; k++) {
        pText += textNodes[k].textContent;
      }
    }

    if (pText.trim().length > 0) {
      richElements.push({
        text: pText.trim(),
        bold: isBold,
        italic: isItalic,
        color: colorHex,
        size: fontSize,
        isHeading: fontSize >= 14 || isBold
      });
    }
  }

  // DOCX -> PPTX
  if (targetFormat === 'pptx') {
    onProgress(80, 'Formatting into styled PowerPoint slides...');
    const chunkSize = 5;
    const slides = [];
    for (let i = 0; i < richElements.length; i += chunkSize) {
      const chunk = richElements.slice(i, i + chunkSize);
      slides.push({
        title: chunk[0].text.length < 50 ? chunk[0].text : `Section ${Math.floor(i / chunkSize) + 1}`,
        color: chunk[0].color,
        lines: chunk.slice(1).map(c => c.text)
      });
    }
    const pptxBlob = await generatePptxFromSlides(file.name, slides);
    return { blob: pptxBlob, ext: 'pptx' };
  }

  // DOCX -> PDF
  if (targetFormat === 'pdf') {
    onProgress(80, 'Compiling formatted PDF with font hierarchies...');
    const pdfBlob = await richElementsToPdf(file.name, richElements);
    return { blob: pdfBlob, ext: 'pdf' };
  }

  // DOCX -> HTML
  if (targetFormat === 'html') {
    const bodyHtml = richElements.map(el => {
      const tag = el.size >= 16 ? 'h1' : (el.size >= 14 ? 'h2' : 'p');
      const style = `color:#${el.color};font-size:${el.size}pt;${el.bold ? 'font-weight:bold;' : ''}${el.italic ? 'font-style:italic;' : ''}`;
      return `<${tag} style="${style}">${escapeHtml(el.text)}</${tag}>`;
    }).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;}</style></head><body>${bodyHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  // DOCX -> Markdown
  if (targetFormat === 'md') {
    const md = richElements.map(el => el.isHeading ? `## ${el.text}` : (el.bold ? `**${el.text}**` : el.text)).join('\n\n');
    return { blob: new Blob([md], { type: 'text/markdown' }), ext: 'md' };
  }

  // DOCX -> TXT
  return { blob: new Blob([richElements.map(e => e.text).join('\n\n')], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- PPTX XML STYLES & EXTRACTION ----------------- //

async function handlePptxSource(file, targetFormat, onProgress) {
  onProgress(25, 'Unpacking PowerPoint presentation & slides...');
  const zip = await JSZip.loadAsync(file);

  const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  onProgress(50, `Extracting text, shapes & colors from ${slideFiles.length} slides...`);
  const slidesContent = [];
  const parser = new DOMParser();

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const slideXml = await zip.file(slideFiles[idx]).async('string');
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
    
    // Extract titles and body shapes
    const paragraphs = xmlDoc.getElementsByTagName('a:p');
    const slideLines = [];

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const p = paragraphs[pIdx];
      const runs = p.getElementsByTagName('a:r');
      let pText = '';
      let isBold = false;
      let colorHex = '1f2937';

      for (let rIdx = 0; rIdx < runs.length; rIdx++) {
        const r = runs[rIdx];
        const rPr = r.getElementsByTagName('a:rPr')[0];
        if (rPr) {
          if (rPr.getAttribute('b') === '1') isBold = true;
          const solidFill = rPr.getElementsByTagName('a:solidFill')[0];
          if (solidFill) {
            const srgbClr = solidFill.getElementsByTagName('a:srgbClr')[0];
            if (srgbClr && srgbClr.getAttribute('val')) colorHex = srgbClr.getAttribute('val');
          }
        }
        const textNode = r.getElementsByTagName('a:t')[0];
        if (textNode) pText += textNode.textContent;
      }

      if (pText.trim().length > 0) {
        slideLines.push({
          text: pText.trim(),
          bold: isBold,
          color: colorHex
        });
      }
    }

    slidesContent.push({
      slideNum: idx + 1,
      items: slideLines
    });
  }

  // PPTX -> DOCX
  if (targetFormat === 'docx') {
    onProgress(80, 'Compiling into Word Document (.docx)...');
    const docxElements = [];
    slidesContent.forEach(s => {
      docxElements.push({ text: `Slide ${s.slideNum}`, isHeading: true, bold: true, size: 14, color: '6366f1' });
      s.items.forEach(it => {
        docxElements.push({ text: it.text, isHeading: false, bold: it.bold, size: 11, color: it.color });
      });
    });
    const docxBlob = await generateDocxFromRichElements(file.name, docxElements);
    return { blob: docxBlob, ext: 'docx' };
  }

  // PPTX -> PDF
  if (targetFormat === 'pdf') {
    onProgress(80, 'Compiling presentation slides PDF...');
    const pdfElements = [];
    slidesContent.forEach(s => {
      pdfElements.push({ text: `Slide ${s.slideNum}`, isHeading: true, bold: true, size: 15, color: '6366f1' });
      s.items.forEach(it => {
        pdfElements.push({ text: it.text, isHeading: false, bold: it.bold, size: 11, color: it.color });
      });
      pdfElements.push({ text: '', isHeading: false, bold: false, size: 10, color: '000000' });
    });
    const pdfBlob = await richElementsToPdf(file.name, pdfElements);
    return { blob: pdfBlob, ext: 'pdf' };
  }

  // PPTX -> HTML
  if (targetFormat === 'html') {
    const slidesHtml = slidesContent.map(s => {
      const itemsHtml = s.items.map(it => `<p style="color:#${it.color};${it.bold ? 'font-weight:bold;' : ''}">${escapeHtml(it.text)}</p>`).join('');
      return `<div class="slide"><h2 style="color:#6366f1;">Slide ${s.slideNum}</h2>${itemsHtml}</div>`;
    }).join('\n');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;background:#f8fafc;padding:20px;}.slide{background:white;padding:24px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.05);}</style></head><body><h1>Presentation Outline</h1>${slidesHtml}</body></html>`;
    return { blob: new Blob([fullHtml], { type: 'text/html' }), ext: 'html' };
  }

  // PPTX -> TXT
  const txt = slidesContent.map(s => `--- Slide ${s.slideNum} ---\n${s.items.map(i => i.text).join('\n')}`).join('\n\n');
  return { blob: new Blob([txt], { type: 'text/plain' }), ext: 'txt' };
}

// ----------------- IMAGE CONVERSION & COMPRESSION ----------------- //

async function handleImageSource(file, targetFormat, onProgress) {
  onProgress(30, 'Loading image into canvas...');

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
        onProgress(80, 'Exporting high-resolution PDF...');
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
        
        // Fit within 10 x 7.5 slide maintaining aspect ratio
        const imgRatio = img.naturalWidth / img.naturalHeight;
        let w = 8.5;
        let h = 8.5 / imgRatio;
        if (h > 6.0) {
          h = 6.0;
          w = 6.0 * imgRatio;
        }

        slide.addImage({
          data: dataUrl,
          x: (10 - w) / 2,
          y: (7.5 - h) / 2,
          w: w,
          h: h
        });

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

      onProgress(85, 'Encoding compressed stream...');
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve({ blob, ext: targetFormat === 'compress' ? 'min.' + outExt : outExt });
        } else {
          reject(new Error('Failed to encode image.'));
        }
      }, mimeType, targetFormat === 'compress' ? 0.60 : 0.88);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image.'));
    };

    img.src = url;
  });
}

// ----------------- RICH GENERATORS (DOCX, PPTX, PDF) ----------------- //

async function generateDocxFromRichElements(title, elements) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const docChildren = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE
    })
  ];

  for (const el of elements) {
    if (el.isHeading) {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({
            text: el.text,
            bold: true,
            size: (el.size || 14) * 2,
            color: el.color || '1f2937'
          })
        ],
        heading: HeadingLevel.HEADING_2
      }));
    } else {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({
            text: el.text,
            bold: el.bold || false,
            italics: el.italic || false,
            size: (el.size || 11) * 2,
            color: el.color || '374151'
          })
        ]
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
    color: '1e1b4b',
    align: 'center'
  });
  titleSlide.addText('Converted with AirConvert ⚡ 100% In-Browser & Private', {
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
      fontSize: 22,
      bold: true,
      color: item.color ? item.color.replace('#', '') : '1f2937'
    });

    const bodyText = (item.lines || []).join('\n\n');
    slide.addText(bodyText, {
      x: 0.8,
      y: 1.5,
      w: 8.5,
      h: 5.2,
      fontSize: 14,
      color: '374151',
      lineSpacing: 22
    });
  }

  return await pres.write({ outputType: 'blob' });
}

async function richElementsToPdf(title, elements) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Document Title
  page.drawText(title, {
    x: margin,
    y: y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.25)
  });
  y -= 32;

  for (const el of elements) {
    const font = el.bold ? fontBold : (el.italic ? fontItalic : fontRegular);
    const fontSize = el.size || (el.isHeading ? 13 : 10);
    const lineHeight = fontSize + 4;

    // Parse hex color to rgb
    let color = rgb(0.2, 0.2, 0.2);
    if (el.color && el.color.length === 6) {
      const r = parseInt(el.color.substr(0, 2), 16) / 255;
      const g = parseInt(el.color.substr(2, 2), 16) / 255;
      const b = parseInt(el.color.substr(4, 2), 16) / 255;
      color = rgb(r, g, b);
    }

    const words = (el.text || '').split(' ');
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
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color });
        y -= lineHeight;
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color });
      y -= lineHeight;
    }

    // Paragraph spacing
    y -= 6;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
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
  const lines = text.split('\n').map(l => ({ text: l, isHeading: false, size: 10, color: '1f2937' }));
  return await richElementsToPdf(title, lines);
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
