const SIZES = {
  rect: { w: 154, h: 54 },
  diamond: { w: 158, h: 90 },
  stadium: { w: 168, h: 54 },
  round: { w: 154, h: 54 },
};

const RESERVED = /^(end|subgraph|graph|flowchart)$/i;

export function nodeSize(shape) {
  return SIZES[shape] || SIZES.rect;
}

export function createEmptyModel() {
  return {
    direction: "TD",
    nodes: [],
    edges: [],
    nextNode: 1,
    nextEdge: 1,
  };
}

export function generateNodeId(model) {
  const used = new Set(model.nodes.map((n) => n.id));
  let id;
  do {
    id = `n${model.nextNode++}`;
  } while (used.has(id) || RESERVED.test(id));
  return id;
}

export function generateEdgeId(model) {
  return `e${model.nextEdge++}`;
}

function bumpCounters(model, id, prefix, field) {
  const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
  if (match) {
    model[field] = Math.max(model[field], Number(match[1]) + 1);
  }
}

export function addNode(model, payload) {
  const id = payload.id || generateNodeId(model);
  if (payload.id) bumpCounters(model, payload.id, "n", "nextNode");
  const node = {
    id,
    label: payload.label != null ? payload.label : payload.id || "Nœud",
    shape: payload.shape ?? "rect",
    x: payload.x,
    y: payload.y,
  };
  model.nodes.push(node);
  return node;
}

export function upsertNode(model, payload) {
  const existing = model.nodes.find((n) => n.id === payload.id);
  if (!existing) {
    return addNode(model, payload);
  }
  if (payload.label != null) existing.label = payload.label;
  if (payload.shape != null) existing.shape = payload.shape;
  return existing;
}

export function removeNode(model, id) {
  model.nodes = model.nodes.filter((n) => n.id !== id);
  model.edges = model.edges.filter((e) => e.from !== id && e.to !== id);
}

export function addEdge(model, payload) {
  if (!payload.from || !payload.to || payload.from === payload.to) return null;
  const label = payload.label || "";
  const duplicate = model.edges.some(
    (e) => e.from === payload.from && e.to === payload.to && (e.label || "") === label,
  );
  if (duplicate) return null;
  const edge = {
    id: payload.id || generateEdgeId(model),
    from: payload.from,
    to: payload.to,
    label,
  };
  if (payload.id) bumpCounters(model, payload.id, "e", "nextEdge");
  model.edges.push(edge);
  return edge;
}

export function removeEdge(model, id) {
  model.edges = model.edges.filter((e) => e.id !== id);
}

export function findNode(model, id) {
  return model.nodes.find((n) => n.id === id);
}

export function findEdge(model, id) {
  return model.edges.find((e) => e.id === id);
}

export function mergeLayout(prev, next) {
  const byId = new Map((prev?.nodes || []).map((n) => [n.id, n]));
  for (const node of next.nodes) {
    const old = byId.get(node.id);
    if (old && Number.isFinite(old.x) && Number.isFinite(old.y)) {
      node.x = old.x;
      node.y = old.y;
    }
  }
  layoutMissing(next);
  const maxN = Math.max(0, ...next.nodes.map((n) => Number((/^n(\d+)$/.exec(n.id) || [])[1] || 0)));
  const maxE = Math.max(0, ...next.edges.map((e) => Number((/^e(\d+)$/.exec(e.id) || [])[1] || 0)));
  next.nextNode = Math.max(next.nextNode || 1, maxN + 1);
  next.nextEdge = Math.max(next.nextEdge || 1, maxE + 1);
  return next;
}

export function layoutMissing(model) {
  const placed = model.nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  const missing = model.nodes.filter((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y));
  if (!missing.length) return;
  if (!placed.length) {
    autoLayout(model);
    return;
  }
  let maxX = 40;
  let maxY = 40;
  for (const node of placed) {
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  missing.forEach((node, index) => {
    node.x = maxX + 180;
    node.y = 48 + index * 100;
  });
}

export function autoLayout(model) {
  const incoming = new Map(model.nodes.map((n) => [n.id, 0]));
  const outgoing = new Map(model.nodes.map((n) => [n.id, []]));
  for (const edge of model.edges) {
    if (incoming.has(edge.to)) incoming.set(edge.to, incoming.get(edge.to) + 1);
    if (outgoing.has(edge.from)) outgoing.get(edge.from).push(edge.to);
  }

  const roots = model.nodes.filter((n) => incoming.get(n.id) === 0).map((n) => n.id);
  if (!roots.length && model.nodes.length) roots.push(model.nodes[0].id);

  const depth = new Map();
  const queue = roots.map((id) => ({ id, d: 0 }));
  const seen = new Set();
  while (queue.length) {
    const { id, d } = queue.shift();
    if (seen.has(id)) {
      depth.set(id, Math.max(depth.get(id) || 0, d));
      continue;
    }
    seen.add(id);
    depth.set(id, d);
    for (const to of outgoing.get(id) || []) {
      queue.push({ id: to, d: d + 1 });
    }
  }
  for (const node of model.nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  const layers = new Map();
  for (const node of model.nodes) {
    const d = depth.get(node.id) || 0;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d).push(node);
  }

  const vertical = model.direction === "TD" || model.direction === "TB" || model.direction === "BT";
  const colGap = 190;
  const rowGap = 120;
  const invert = model.direction === "BT" || model.direction === "RL";
  const maxDepth = Math.max(0, ...depth.values());

  for (const [d, nodes] of layers) {
    const layerIndex = invert ? maxDepth - d : d;
    nodes.forEach((node, index) => {
      if (vertical) {
        node.x = 48 + index * colGap;
        node.y = 48 + layerIndex * rowGap;
      } else {
        node.x = 48 + layerIndex * colGap;
        node.y = 48 + index * rowGap;
      }
    });
  }
}
