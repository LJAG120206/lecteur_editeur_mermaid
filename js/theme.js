const UI_KEY = "mermaid-editor-ui-theme";
const DIAGRAM_KEY = "mermaid-editor-diagram-theme";

export function initTheme({ onDiagramThemeChange }) {
  const button = document.getElementById("btn-ui-theme");
  const select = document.getElementById("diagram-theme");

  let ui = localStorage.getItem(UI_KEY) || "light";
  let diagram = localStorage.getItem(DIAGRAM_KEY) || "default";
  if (!["default", "dark", "forest", "neutral"].includes(diagram)) diagram = "default";
  if (ui !== "dark") ui = "light";

  applyUi(ui);
  select.value = diagram;

  button.addEventListener("click", () => {
    ui = ui === "light" ? "dark" : "light";
    localStorage.setItem(UI_KEY, ui);
    applyUi(ui);
  });

  select.addEventListener("change", () => {
    diagram = select.value;
    localStorage.setItem(DIAGRAM_KEY, diagram);
    onDiagramThemeChange(diagram);
  });

  return {
    getDiagramTheme: () => diagram,
    getUiTheme: () => ui,
  };
}

function applyUi(ui) {
  document.documentElement.dataset.theme = ui;
  const button = document.getElementById("btn-ui-theme");
  const dark = ui === "dark";
  button.textContent = dark ? "Clair" : "Sombre";
  button.setAttribute("aria-label", dark ? "Passer au thème clair" : "Passer au thème sombre");
}
