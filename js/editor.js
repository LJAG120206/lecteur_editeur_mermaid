export function initEditor(textarea, { onChange }) {
  let timer = 0;

  textarea.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => onChange(textarea.value), 280);
  });

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.setRangeText("  ", start, end, "end");
      textarea.dispatchEvent(new Event("input"));
    }
  });

  return {
    setValue(value) {
      if (textarea.value !== value) textarea.value = value;
    },
    getValue() {
      return textarea.value;
    },
  };
}
