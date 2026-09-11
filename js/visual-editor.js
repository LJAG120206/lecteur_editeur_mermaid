import {
  addEdge,
  addNode,
  createEmptyModel,
  findEdge,
  findNode,
  nodeSize,
  removeEdge,
  removeNode,
} from "./graph-model.js";

const NS = "http://www.w3.org/2000/svg";
const DEFAULT_LABELS = {
  rect: "Processus",
  diamond: "Décision",
  stadium: "Début",
  round: "Étape",
};

export function initVisualEditor({ onChange }) {
  const wrap = document.getElementById("canvas-wrap");
  const svg = document.getElementById("canvas");
  const overlay = document.getElementById("visual-unsupported");
  const overlayText = document.getElementById("visual-unsupported-text");
  const directionSelect = document.getElementById("flow-direction");

  let model = createEmptyModel();
  let selected = null;
  let unsupported = null;
  let drag = null;
  let link = null;
  let editing = false;

  for (const item of document.querySelectorAll(".palette-item")) {
    item.addEventListener("dragstart", (event) => {
      item.dataset.didDrag = "1";
      const shape = item.dataset.shape;
      event.dataTransfer.setData("text/plain", shape);
      event.dataTransfer.setData("text/shape", shape);
      event.dataTransfer.effectAllowed = "copy";
    });
    item.addEventListener("click", () => {
      if (item.dataset.didDrag === "1") {
        delete item.dataset.didDrag;
        return;
      }
      if (unsupported) return;
      spawnNode(item.dataset.shape);
    });
  }

  wrap.addEventListener("dragover", (event) => {
    if (unsupported) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  wrap.addEventListener("drop", (event) => {
    if (unsupported) return;
    event.preventDefault();
    const shape = event.dataTransfer.getData("text/shape") || event.dataTransfer.getData("text/plain");
    if (!shape || !DEFAULT_LABELS[shape]) return;
    const point = clientToCanvas(event.clientX, event.clientY);
    const size = nodeSize(shape);
    addNode(model, {
      shape,
      label: DEFAULT_LABELS[shape],
      x: Math.max(16, point.x - size.w / 2),
      y: Math.max(16, point.y - size.h / 2),
    });
    emit();
  });

  directionSelect.addEventListener("change", () => {
    if (unsupported) return;
    model.direction = directionSelect.value;
    emit();
  });

  svg.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);

  function spawnNode(shape) {
    const size = nodeSize(shape);
    const index = model.nodes.length;
    addNode(model, {
      shape,
      label: DEFAULT_LABELS[shape],
      x: 48 + (index % 4) * (size.w + 36),
      y: 48 + Math.floor(index / 4) * (size.h + 48),
    });
    emit();
  }

  function onPointerDown(event) {
    if (unsupported || event.button !== 0 || editing) return;
    const port = event.target.closest?.(".port");
    if (port) {
      event.preventDefault();
      selected = { type: "node", id: port.dataset.nodeId };
      link = {
        from: port.dataset.nodeId,
        fromSide: port.dataset.side,
        x: event.clientX,
        y: event.clientY,
      };
      render();
      return;
    }

    const nodeGroup = event.target.closest?.(".vnode");
    if (nodeGroup) {
      event.preventDefault();
      const id = nodeGroup.dataset.id;
      selected = { type: "node", id };
      const node = findNode(model, id);
      const point = clientToCanvas(event.clientX, event.clientY);
      drag = { id, dx: point.x - node.x, dy: point.y - node.y, moved: false };
      if (event.detail === 2) {
        drag = null;
        startLabelEdit(node, "node");
        return;
      }
      render();
      return;
    }

    const edge = event.target.closest?.("[data-edge-id]");
    if (edge) {
      event.preventDefault();
      selected = { type: "edge", id: edge.dataset.edgeId };
      if (event.detail === 2) {
        const current = findEdge(model, selected.id);
        if (current) startLabelEdit(current, "edge");
      }
      render();
      return;
    }

    selected = null;
    render();
  }

  function onPointerMove(event) {
    if (drag) {
      const node = findNode(model, drag.id);
      if (!node) return;
      const point = clientToCanvas(event.clientX, event.clientY);
      node.x = Math.max(8, point.x - drag.dx);
      node.y = Math.max(8, point.y - drag.dy);
      drag.moved = true;
      render();
      return;
    }
    if (link) {
      link.x = event.clientX;
      link.y = event.clientY;
      renderTempLink();
    }
  }

  function onPointerUp(event) {
    if (drag) {
      const moved = drag.moved;
      drag = null;
      if (moved) emit();
      else render();
      return;
    }
    if (link) {
      const port = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".port");
      const toId = port?.dataset.nodeId;
      if (toId) addEdge(model, { from: link.from, to: toId });
      link = null;
      const temp = svg.querySelector(".temp-link");
      if (temp) temp.remove();
      emit();
    }
  }

  function onKeyDown(event) {
    if (unsupported || editing) return;
    const target = event.target;
    if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")) {
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selected) {
      event.preventDefault();
      if (selected.type === "node") removeNode(model, selected.id);
      else removeEdge(model, selected.id);
      selected = null;
      emit();
    }
  }

  function startLabelEdit(item, type) {
    editing = true;
    const input = document.createElement("input");
    input.className = "label-edit";
    input.value = item.label || "";
    const size = type === "node" ? nodeSize(item.shape) : { w: 140, h: 28 };
    const x = type === "node" ? item.x : Number(item._lx || 40);
    const y = type === "node" ? item.y : Number(item._ly || 40);
    input.style.left = `${x - wrap.scrollLeft}px`;
    input.style.top = `${y + (type === "node" ? size.h / 2 - 12 : 0) - wrap.scrollTop}px`;
    input.style.width = `${Math.max(120, size.w - 16)}px`;
    wrap.appendChild(input);
    input.focus();
    input.select();

    const finish = (commit) => {
      if (!editing) return;
      editing = false;
      if (commit) {
        const value = input.value.trim();
        if (type === "node") item.label = value || item.label;
        else item.label = value;
      }
      input.remove();
      emit();
    };

    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
  }

  function emit() {
    render();
    onChange(model);
  }

  function render() {
    directionSelect.value = model.direction || "TD";
    const size = canvasSize();
    svg.setAttribute("width", String(size.w));
    svg.setAttribute("height", String(size.h));
    svg.innerHTML = "";
    ensureArrowMarker();

    for (const edge of model.edges) {
      drawEdge(edge);
    }
    for (const node of model.nodes) {
      drawNode(node);
    }
    if (link) renderTempLink();
  }

  function renderTempLink() {
    let temp = svg.querySelector(".temp-link");
    if (!temp) {
      temp = document.createElementNS(NS, "path");
      temp.setAttribute("class", "temp-link");
      svg.appendChild(temp);
    }
    const from = findNode(model, link.from);
    if (!from) return;
    const start = portPoint(from, link.fromSide);
    const end = clientToCanvas(link.x, link.y);
    temp.setAttribute("d", curve(start, end, link.fromSide, oppositeSide(link.fromSide)));
  }

  function drawNode(node) {
    const { w, h } = nodeSize(node.shape);
    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", selected?.type === "node" && selected.id === node.id ? "vnode selected" : "vnode");
    group.dataset.id = node.id;
    group.setAttribute("transform", `translate(${node.x},${node.y})`);

    const shape = document.createElementNS(NS, node.shape === "diamond" ? "polygon" : "rect");
    shape.setAttribute("class", "shape");
    if (node.shape === "diamond") {
      shape.setAttribute("points", `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`);
    } else {
      shape.setAttribute("x", "0");
      shape.setAttribute("y", "0");
      shape.setAttribute("width", String(w));
      shape.setAttribute("height", String(h));
      shape.setAttribute("rx", node.shape === "stadium" ? String(h / 2) : node.shape === "round" ? "12" : "4");
    }
    group.appendChild(shape);

    const lines = wrapLabel(node.label);
    const startY = h / 2 - ((lines.length - 1) * 14) / 2;
    lines.forEach((line, index) => {
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", String(w / 2));
      text.setAttribute("y", String(startY + index * 14));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = line;
      group.appendChild(text);
    });

    for (const side of ["n", "e", "s", "w"]) {
      const [px, py] = localPort(side, w, h);
      const port = document.createElementNS(NS, "circle");
      port.setAttribute("class", "port");
      port.setAttribute("cx", String(px));
      port.setAttribute("cy", String(py));
      port.setAttribute("r", "5.5");
      port.dataset.side = side;
      port.dataset.nodeId = node.id;
      group.appendChild(port);
    }

    svg.appendChild(group);
  }

  function drawEdge(edge) {
    const from = findNode(model, edge.from);
    const to = findNode(model, edge.to);
    if (!from || !to) return;
    const [fromSide, toSide] = bestSides(from, to);
    const start = portPoint(from, fromSide);
    const end = portPoint(to, toSide);
    const path = curve(start, end, fromSide, toSide);

    const hit = document.createElementNS(NS, "path");
    hit.setAttribute("class", "vedge hit");
    hit.setAttribute("d", path);
    hit.dataset.edgeId = edge.id;
    svg.appendChild(hit);

    const line = document.createElementNS(NS, "path");
    line.setAttribute("class", selected?.type === "edge" && selected.id === edge.id ? "vedge selected" : "vedge");
    line.setAttribute("d", path);
    line.setAttribute("marker-end", "url(#arrow)");
    line.dataset.edgeId = edge.id;
    svg.appendChild(line);

    if (edge.label) {
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8 };
      edge._lx = mid.x;
      edge._ly = mid.y;
      const text = document.createElementNS(NS, "text");
      text.setAttribute("class", "vedge-label");
      text.setAttribute("x", String(mid.x));
      text.setAttribute("y", String(mid.y));
      text.setAttribute("text-anchor", "middle");
      text.dataset.edgeId = edge.id;
      text.textContent = edge.label;
      svg.appendChild(text);
    }
  }

  function ensureArrowMarker() {
    const defs = document.createElementNS(NS, "defs");
    const marker = document.createElementNS(NS, "marker");
    marker.setAttribute("id", "arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto-start-reverse");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    path.setAttribute("fill", "#4a5568");
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  function canvasSize() {
    let w = Math.max(720, wrap.clientWidth || 720);
    let h = Math.max(520, wrap.clientHeight || 520);
    for (const node of model.nodes) {
      const size = nodeSize(node.shape);
      w = Math.max(w, node.x + size.w + 80);
      h = Math.max(h, node.y + size.h + 80);
    }
    return { w, h };
  }

  function clientToCanvas(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    return {
      x: clientX - rect.left + wrap.scrollLeft,
      y: clientY - rect.top + wrap.scrollTop,
    };
  }

  return {
    setModel(next) {
      model = next;
      selected = null;
      render();
    },
    setUnsupported(reason) {
      unsupported = reason;
      overlay.hidden = !reason;
      overlayText.textContent = reason || "";
    },
    getModel() {
      return model;
    },
    resize() {
      render();
    },
  };
}

function localPort(side, w, h) {
  if (side === "n") return [w / 2, 0];
  if (side === "e") return [w, h / 2];
  if (side === "s") return [w / 2, h];
  return [0, h / 2];
}

function portPoint(node, side) {
  const size = nodeSize(node.shape);
  const [x, y] = localPort(side, size.w, size.h);
  return { x: node.x + x, y: node.y + y };
}

function nodeCenter(node) {
  const size = nodeSize(node.shape);
  return { x: node.x + size.w / 2, y: node.y + size.h / 2 };
}

function bestSides(from, to) {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? ["e", "w"] : ["w", "e"];
  }
  return dy > 0 ? ["s", "n"] : ["n", "s"];
}

function oppositeSide(side) {
  return { n: "s", s: "n", e: "w", w: "e" }[side];
}

function curve(start, end, fromSide, toSide) {
  const offset = 40;
  const c1 = control(start, fromSide, offset);
  const c2 = control(end, toSide, offset);
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function control(point, side, offset) {
  if (side === "n") return { x: point.x, y: point.y - offset };
  if (side === "s") return { x: point.x, y: point.y + offset };
  if (side === "e") return { x: point.x + offset, y: point.y };
  return { x: point.x - offset, y: point.y };
}

function wrapLabel(text) {
  const value = String(text ?? "");
  const max = 16;
  if (value.length <= max) return [value];
  const lines = [];
  let rest = value;
  while (rest.length && lines.length < 3) {
    if (rest.length <= max) {
      lines.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(" ", max);
    if (cut < 5) cut = max;
    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut).trim();
  }
  if (lines.length === 3 && rest) {
    lines[2] = `${lines[2].slice(0, Math.max(1, max - 1))}…`;
  }
  return lines;
}
