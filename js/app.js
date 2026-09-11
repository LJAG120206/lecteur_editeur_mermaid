import { initEditor } from "./editor.js";
import { initExport } from "./export.js";
import { initFiles } from "./files.js";
import { createEmptyModel, mergeLayout } from "./graph-model.js";
import { generateFlowchart, parseFlowchart } from "./mermaid-sync.js";
import { initPresent } from "./present.js";
import { fitPreviewToViewport, getPreviewSvg, renderPreview } from "./preview.js";
import { initTheme } from "./theme.js";
import { initVisualEditor } from "./visual-editor.js";

const DRAFT_KEY = "mermaid-editor-draft";
const DEFAULT_SOURCE = `flowchart TD
  start([Début]) --> process[Traiter]
  process --> decision{OK ?}
  decision -->|Oui| done([Fin])
  decision -->|Non| process
`;

const sourceEl = document.getElementById("source");
const panelCode = document.getElementById("panel-code");
const panelVisual = document.getElementById("panel-visual");
const tabs = document.querySelectorAll("[data-tab]");

let source = localStorage.getItem(DRAFT_KEY) || DEFAULT_SOURCE;
let model = createEmptyModel();

const theme = initTheme({
  onDiagramThemeChange() {
    renderPreview(source, { theme: theme.getDiagramTheme() });
  },
});

const editor = initEditor(sourceEl, {
  onChange(value) {
    source = value;
    persist();
    syncVisualFromCode();
    renderPreview(source, { theme: theme.getDiagramTheme() });
  },
});

const visual = initVisualEditor({
  onChange(nextModel) {
    model = nextModel;
    source = generateFlowchart(model);
    persist();
    editor.setValue(source);
    renderPreview(source, { theme: theme.getDiagramTheme() });
  },
});

initFiles({
  getSource: () => source,
  setSource,
  getSuggestedName: () => "diagramme.mmd",
});

initExport({
  getSvg: () => getPreviewSvg(),
});

tabs.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    tabs.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    panelCode.hidden = tab !== "code";
    panelVisual.hidden = tab !== "visual";
    if (tab === "visual") visual.resize();
  });
});

initPresent({
  onChange(presenting) {
    if (presenting) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitPreviewToViewport());
      });
      return;
    }
    renderPreview(source, { theme: theme.getDiagramTheme() });
    if (!panelVisual.hidden) visual.resize();
  },
});

window.addEventListener("resize", () => {
  if (document.body.classList.contains("presenting")) {
    fitPreviewToViewport();
    return;
  }
  if (!panelVisual.hidden) visual.resize();
});

function persist() {
  localStorage.setItem(DRAFT_KEY, source);
}

function syncVisualFromCode() {
  const parsed = parseFlowchart(source);
  if (!parsed.ok) {
    visual.setUnsupported(parsed.reason);
    return;
  }
  model = mergeLayout(model, parsed.model);
  visual.setUnsupported(null);
  visual.setModel(model);
}

function setSource(value) {
  source = value;
  persist();
  editor.setValue(source);
  syncVisualFromCode();
  renderPreview(source, { theme: theme.getDiagramTheme() });
}

setSource(source);
