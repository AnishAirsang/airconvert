# ⚡ AirConvert

> **100% In-Browser, Zero-Upload File Converter & Compressor Chrome Extension.**  
> Convert and compress documents, images, and data locally on your device using WebAssembly and modern browser APIs. Zero cloud uploads. Total privacy.

---

## 🔒 Why AirConvert?

Most online file converters upload your private documents, contracts, and photos to third-party cloud servers. They impose daily limits, queue times, and paywalls.

**AirConvert changes that:**
* **Zero Cloud Uploads:** 100% of the conversion and compression happens in client-side JavaScript/WASM memory.
* **Completely Offline:** Works without an internet connection.
* **Zero Limits:** No file counts, no credit cards, no subscriptions.
* **Dual Interface:** Run it quickly inside the **Chrome Popup**, or launch the **Full Tab Studio** for larger files.

---

## 🚀 Supported Conversions & Tools

| Source Format | Available Conversions / Actions | Engine |
| :--- | :--- | :--- |
| **Images** (`.png`, `.jpg`, `.webp`, `.bmp`) | ⚡ Compress Image, convert to PNG, JPG, WebP, BMP, or export to PDF | Canvas2D / OffscreenCanvas / PDF-Lib |
| **Word** (`.docx`) | Extract to Plain Text (`.txt`), HTML Webpage (`.html`), Markdown (`.md`), or compile to PDF (`.pdf`) | JSZip + DOMParser + PDF-Lib |
| **PowerPoint** (`.pptx`) | Extract Slide Outline (`.txt`), HTML Notes (`.html`), or Summary PDF (`.pdf`) | JSZip + XMLParser + PDF-Lib |
| **PDF** (`.pdf`) | ⚡ Compress / Re-pack PDF streams, Extract Plain Text (`.txt`) | PDF-Lib |
| **Data** (`.json`, `.csv`) | Convert JSON to CSV/TSV, CSV to JSON, or generate HTML Table | Native Client Stream Parser |
| **Markdown / Text** (`.md`, `.txt`) | Convert to styled HTML (`.html`) or formatted PDF (`.pdf`) | Native Parser + PDF-Lib |

---

## 📦 How to Install in Chrome / Brave / Edge

1. Clone or download this repository:
   ```bash
   git clone https://github.com/AnishAirsang/airconvert.git
   ```
2. Open your browser and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked** (top left).
5. Select the `airconvert` directory.
6. Pin the AirConvert extension to your toolbar and enjoy!

---

## 🛠️ Tech Stack

* **Manifest V3** Chrome Extension Architecture
* **[PDF-Lib](https://github.com/Hopding/pdf-lib)**: In-browser PDF generation, stream compression, and rendering
* **[JSZip](https://stuk.github.io/jszip/)**: Client-side XML archive parsing for Office documents (`.docx`, `.pptx`)
* **HTML5 Canvas / Blob API**: High-performance image transcoding and quality compression
* **Vanilla JavaScript & Modern CSS**: Zero heavy frontend frameworks, instant load times

---

## 📜 License

MIT License. Free to use, modify, and distribute.
