export function initExport({ getSvg }) {
  document.getElementById("btn-export-svg").addEventListener("click", () => {
    const svg = getSvg();
    if (!svg) return;
    const blob = new Blob([serializeSvg(svg)], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, "diagramme.svg");
  });

  document.getElementById("btn-export-png").addEventListener("click", async () => {
    const svg = getSvg();
    if (!svg) return;
    const xml = serializeSvg(flattenForeignObjects(svg));
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = await loadImage(url);
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = backgroundForPng();
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, "diagramme.png");
          resolve();
        }, "image/png");
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

function flattenForeignObjects(svg) {
  const clone = svg.cloneNode(true);
  for (const foreign of [...clone.querySelectorAll("foreignObject")]) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const width = Number(foreign.getAttribute("width") || 0);
    const height = Number(foreign.getAttribute("height") || 0);
    const x = Number(foreign.getAttribute("x") || 0) + width / 2;
    const y = Number(foreign.getAttribute("y") || 0) + height / 2;
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#333333");
    text.setAttribute("font-size", "16");
    text.textContent = (foreign.textContent || "").trim();
    foreign.replaceWith(text);
  }
  return clone;
}

function serializeSvg(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  let width = parseSize(clone.getAttribute("width"));
  let height = parseSize(clone.getAttribute("height"));
  const viewBox = clone.getAttribute("viewBox");
  if (viewBox && (!width || !height)) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      width = parts[2];
      height = parts[3];
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
    }
  }
  if (!width || !height) {
    try {
      const box = svg.getBBox();
      width = Math.ceil(box.width + box.x + 8) || 400;
      height = Math.ceil(box.height + box.y + 8) || 300;
    } catch {
      const rect = svg.getBoundingClientRect();
      width = Math.ceil(rect.width) || 400;
      height = Math.ceil(rect.height) || 300;
    }
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
  }
  if (!clone.getAttribute("viewBox") && width && height) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function parseSize(value) {
  if (!value || value.endsWith("%")) return 0;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de rasteriser le SVG."));
    image.src = url;
  });
}

function backgroundForPng() {
  const theme = document.getElementById("preview")?.dataset.diagramTheme;
  return theme === "dark" ? "#1a1f27" : "#ffffff";
}

function downloadBlob(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
