// app.js - client-side EML to PDF
// Minimal EML parser for common multipart/alternative and multipart/related Outlook-style EML files.
// Runs entirely in the browser; no upload to any server. Uses html2pdf.js to create the PDF.

(function () {
  const fileInput = document.getElementById('fileinput');
  const fileList = document.getElementById('fileList');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const includeImages = document.getElementById('includeImages');
  const includeAttachments = document.getElementById('includeAttachments');
  const orderSelect = document.getElementById('orderSelect');
  const previewArea = document.getElementById('previewArea');
  const mergedHtmlEl = document.getElementById('mergedHtml');

  let files = [];

  fileInput.addEventListener('change', (ev) => {
    addFiles(Array.from(ev.target.files));
  });

  clearBtn.addEventListener('click', () => {
    files = [];
    fileInput.value = '';
    renderFileList();
    previewArea.hidden = true;
    mergedHtmlEl.innerHTML = '';
  });

  function addFiles(fileArray) {
    for (const f of fileArray) {
      if (f.name.toLowerCase().endsWith('.eml')) {
        files.push(f);
      }
    }
    renderFileList();
  }

  function renderFileList() {
    fileList.innerHTML = '';
    if (files.length === 0) {
      fileList.textContent = 'Geen .eml geselecteerd.';
      return;
    }
    const ul = document.createElement('ul');
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.textContent = f.name + ' (' + Math.round(f.size / 1024) + ' kB)';
      ul.appendChild(li);
    });
    fileList.appendChild(ul);
  }

  function readFileAsText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  // Very small helper to find parts by regex (not a full MIME parser, but works for typical EMLs)
  function extractParts(emlText) {
    const result = { headers: {}, parts: [] };
    // Normalize line endings
    const txt = emlText.replace(/\r\n/g, '\n');
    // split headers / body
    const idx = txt.indexOf('\n\n');
    const hdrText = idx >= 0 ? txt.slice(0, idx) : '';
    const body = idx >= 0 ? txt.slice(idx + 2) : '';
    // parse simple headers
    hdrText.split('\n').forEach((line) => {
      const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
      if (m) {
        const k = m[1];
        const v = m[2];
        if (result.headers[k]) result.headers[k] += '\n' + v; else result.headers[k] = v;
      }
    });
    // Find boundary token if multipart
    let boundary = null;
    const ct = (result.headers['Content-Type'] || '').match(/boundary=\