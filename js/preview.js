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
  } catch (err) {
    if (current !== sequence) return;
    showError(error, humanize(err));
  }
}

export function getPreviewSvg() {
  return document.querySelector("#preview svg");
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
