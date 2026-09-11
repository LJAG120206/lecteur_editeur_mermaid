let sequence = 0;
let lastTheme = "default";

export async function renderPreview(source, { theme = "default" } = {}) {
  const preview = document.getElementById("preview");
  const error = document.getElementById("error");
  const current = ++sequence;

  preview.dataset.diagramTheme = theme;
  lastTheme = theme;

  if (!window.mermaid) {
    showError(error, "La librairie Mermaid n’a pas pu être chargée (vendor/mermaid.min.js).");
    return;
  }

  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme,
    suppressErrorRendering: true,
    flowchart: { htmlLabels: false, useMaxWidth: true },
  });

  const code = String(source || "").trim();
  if (!code || /^flowchart\s+\w+\s*$/i.test(code)) {
    preview.innerHTML = '<p class="placeholder">L’aperçu du diagramme apparaîtra ici.</p>';
    hideError(error);
    return;
  }

  try {
    const id = `mermaid-preview-${current}`;
    const { svg } = await window.mermaid.render(id, code);
    if (current !== sequence) return;
    preview.innerHTML = svg;
    hideError(error);
    if (document.body.classList.contains("presenting")) fitPreviewToViewport();
  } catch (err) {
    if (current !== sequence) return;
    showError(error, humanize(err));
  }
}

export function getPreviewSvg() {
  return document.querySelector("#preview svg");
}

export function fitPreviewToViewport() {
  const svg = getPreviewSvg();
  const wrap = document.getElementById("preview");
  if (!svg || !wrap) return;

  svg.style.maxWidth = "none";
  svg.style.width = "";
  svg.style.height = "";

  let boxWidth = 0;
  let boxHeight = 0;
  if (svg.viewBox?.baseVal?.width) {
    boxWidth = svg.viewBox.baseVal.width;
    boxHeight = svg.viewBox.baseVal.height;
  } else {
    try {
      const box = svg.getBBox();
      boxWidth = box.width;
      boxHeight = box.height;
    } catch {
      return;
    }
  }
  if (!boxWidth || !boxHeight) return;

  const padding = 48;
  const availW = Math.max(120, Math.min(wrap.clientWidth || Infinity, window.innerWidth) - padding);
  const availH = Math.max(120, Math.min(wrap.clientHeight || Infinity, window.innerHeight) - padding);
  const scale = Math.min(availW / boxWidth, availH / boxHeight);
  if (!Number.isFinite(scale) || scale <= 0) return;
  svg.setAttribute("width", String(boxWidth * scale));
  svg.setAttribute("height", String(boxHeight * scale));
}

export function getLastTheme() {
  return lastTheme;
}

function humanize(err) {
  const message = err?.str || err?.message || String(err);
  return message.replace(/^Error:\s*/i, "").trim();
}

function showError(el, message) {
  el.hidden = false;
  el.textContent = message;
}

function hideError(el) {
  el.hidden = true;
  el.textContent = "";
}
