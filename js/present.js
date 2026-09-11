export function initPresent({ onChange }) {
  const enterBtn = document.getElementById("btn-present");
  const exitBtn = document.getElementById("btn-present-exit");
  const hint = document.getElementById("present-hint");
  let active = false;
  let hintTimer = 0;
  let exitingFullscreen = false;

  enterBtn.addEventListener("click", () => enter());
  exitBtn.addEventListener("click", () => exit());

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active) {
      event.preventDefault();
      exit();
      return;
    }
    const typing = event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    if (!active && !typing && event.key === "F8") {
      event.preventDefault();
      enter();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (active && !document.fullscreenElement && !exitingFullscreen) {
      exit({ skipFullscreen: true });
    }
  });

  async function enter() {
    if (active) return;
    active = true;
    document.body.classList.add("presenting");
    enterBtn.setAttribute("aria-pressed", "true");
    exitBtn.hidden = false;
    showHint();
    onChange(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* Le mode présentation reste utilisable sans plein écran OS. */
    }
    requestAnimationFrame(() => onChange(true));
  }

  async function exit({ skipFullscreen = false } = {}) {
    if (!active) return;
    active = false;
    document.body.classList.remove("presenting");
    enterBtn.setAttribute("aria-pressed", "false");
    exitBtn.hidden = true;
    hideHint();
    if (!skipFullscreen && document.fullscreenElement) {
      exitingFullscreen = true;
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      exitingFullscreen = false;
    }
    onChange(false);
  }

  function showHint() {
    if (!hint) return;
    hint.hidden = false;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hideHint(), 2800);
  }

  function hideHint() {
    if (!hint) return;
    hint.hidden = true;
    window.clearTimeout(hintTimer);
  }

  return {
    isActive: () => active,
  };
}
