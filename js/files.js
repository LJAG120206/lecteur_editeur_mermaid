const ACCEPT = {
  description: "Mermaid",
  accept: { "text/plain": [".mmd", ".md", ".txt"] },
};

export function initFiles({ getSource, setSource, getSuggestedName }) {
  const openBtn = document.getElementById("btn-open");
  const saveBtn = document.getElementById("btn-save");
  const saveAsBtn = document.getElementById("btn-save-as");
  const input = document.getElementById("file-input");

  let handle = null;
  let fileName = getSuggestedName() || "diagramme.mmd";

  openBtn.addEventListener("click", () => openFile());
  saveBtn.addEventListener("click", () => saveFile(false));
  saveAsBtn.addEventListener("click", () => saveFile(true));

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    fileName = file.name;
    handle = null;
    setSource(await file.text());
    input.value = "";
  });

  window.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      saveFile(event.shiftKey);
    }
    if (key === "o") {
      event.preventDefault();
      openFile();
    }
  });

  async function openFile() {
    if (window.showOpenFilePicker) {
      try {
        const [picked] = await window.showOpenFilePicker({
          types: [ACCEPT],
          multiple: false,
        });
        handle = picked;
        const file = await picked.getFile();
        fileName = file.name;
        setSource(await file.text());
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    input.click();
  }

  async function saveFile(saveAs) {
    const text = getSource();
    const name = fileName || getSuggestedName() || "diagramme.mmd";

    if (window.showSaveFilePicker) {
      try {
        if (saveAs || !handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [ACCEPT],
          });
          fileName = handle.name || name;
        }
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    downloadText(text, name);
  }

  return {
    markUnnamed() {
      handle = null;
    },
  };
}

function downloadText(text, name) {
  const fileName = /\.(mmd|md|txt)$/i.test(name) ? name : `${name}.mmd`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
