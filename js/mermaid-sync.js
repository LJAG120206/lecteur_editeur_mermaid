import { addEdge, createEmptyModel, layoutMissing, upsertNode } from "./graph-model.js";

const HEADER = /^(flowchart|graph)(?:\s+(TD|TB|BT|RL|LR))?\s*$/i;
const UNSUPPORTED = /^(subgraph\b|end$|classDef\b|class\s|click\s|style\s|linkStyle\b|%%\{)/i;

export function parseFlowchart(source) {
  const lines = [];
  for (const raw of String(source || "").replace(/\r\n/g, "\n").split("\n")) {
    const stripped = stripComment(raw).trim();
    if (stripped) lines.push(stripped);
  }

  if (!lines.length) {
    return { ok: true, model: createEmptyModel(), empty: true };
  }

  const header = HEADER.exec(lines[0]);
  if (!header) {
    return {
      ok: false,
      reason: "L’éditeur visuel gère uniquement les flowcharts (flowchart TD / LR, etc.). Passez à l’onglet Code pour les autres diagrammes.",
    };
  }

  const model = createEmptyModel();
  const dir = (header[2] || "TD").toUpperCase();
  model.direction = dir === "TB" ? "TD" : dir;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (UNSUPPORTED.test(line) || line.includes("&")) {
      return {
        ok: false,
        reason: "Ce flowchart utilise une syntaxe non gérée visuellement (subgraph, style, nœuds multiples, etc.). Modifiez-le dans l’onglet Code.",
      };
    }
    if (!parseStatement(line, model)) {
      return {
        ok: false,
        reason: `Ligne non reconnue par l’éditeur visuel : ${line}`,
      };
    }
  }

  layoutMissing(model);
  return { ok: true, model };
}

export function generateFlowchart(model) {
  const direction = model.direction || "TD";
  const lines = [`flowchart ${direction}`];
  for (const node of model.nodes) {
    lines.push(`  ${formatNode(node)}`);
  }
  for (const edge of model.edges) {
    if (edge.label) {
      lines.push(`  ${edge.from} -->|${escapeLink(edge.label)}| ${edge.to}`);
    } else {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function stripComment(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("%%{")) return trimmed;
  const index = line.indexOf("%%");
  return index >= 0 ? line.slice(0, index) : line;
}

function parseStatement(line, model) {
  const cursor = { s: line, i: 0 };
  skipWs(cursor);
  let current = parseNode(cursor, model);
  if (!current) return false;
  skipWs(cursor);
  while (cursor.i < cursor.s.length) {
    const arrow = parseArrow(cursor);
    if (!arrow) return false;
    skipWs(cursor);
    const next = parseNode(cursor, model);
    if (!next) return false;
    addEdge(model, { from: current.id, to: next.id, label: arrow.label });
    current = next;
    skipWs(cursor);
  }
  return true;
}

function parseNode(cursor, model) {
  skipWs(cursor);
  const id = match(cursor, /^[A-Za-z][\w-]*/);
  if (!id) return null;
  skipWs(cursor);
  const shaped = parseShape(cursor);
  return upsertNode(model, {
    id,
    label: shaped ? shaped.label : undefined,
    shape: shaped ? shaped.shape : undefined,
  });
}

function parseShape(cursor) {
  const { s, i } = cursor;
  if (s.startsWith("([", i)) {
    cursor.i += 2;
    const label = readLabel(cursor, "])");
    return label == null ? null : { shape: "stadium", label };
  }
  if (s[i] === "[") {
    cursor.i += 1;
    const label = readLabel(cursor, "]");
    return label == null ? null : { shape: "rect", label };
  }
  if (s[i] === "{") {
    cursor.i += 1;
    const label = readLabel(cursor, "}");
    return label == null ? null : { shape: "diamond", label };
  }
  if (s[i] === "(") {
    cursor.i += 1;
    const label = readLabel(cursor, ")");
    return label == null ? null : { shape: "round", label };
  }
  return null;
}

function readLabel(cursor, closer) {
  skipWs(cursor);
  if (cursor.s[cursor.i] === '"') {
    cursor.i += 1;
    let out = "";
    while (cursor.i < cursor.s.length && cursor.s[cursor.i] !== '"') {
      out += cursor.s[cursor.i];
      cursor.i += 1;
    }
    if (cursor.s[cursor.i] === '"') cursor.i += 1;
    skipWs(cursor);
    if (!cursor.s.startsWith(closer, cursor.i)) return null;
    cursor.i += closer.length;
    return decodeLabel(out);
  }
  const index = cursor.s.indexOf(closer, cursor.i);
  if (index < 0) return null;
  const label = cursor.s.slice(cursor.i, index).trim();
  cursor.i = index + closer.length;
  return decodeLabel(label);
}

function parseArrow(cursor) {
  skipWs(cursor);
  const rest = cursor.s.slice(cursor.i);
  const patterns = [
    /^-->(?:\|([^|]*)\|)?/,
    /^-.->(?:\|([^|]*)\|)?/,
    /^==>(?:\|([^|]*)\|)?/,
    /^---(?:\|([^|]*)\|)?/,
    /^--\s+([^>]+?)\s+-->/,
    /^-\.\s+([^.]+?)\s+\.->/,
    /^==\s+([^=]+?)\s+==>/,
  ];
  for (const pattern of patterns) {
    const matchResult = rest.match(pattern);
    if (matchResult) {
      cursor.i += matchResult[0].length;
      return { label: (matchResult[1] || "").trim() };
    }
  }
  return null;
}

function skipWs(cursor) {
  while (cursor.i < cursor.s.length && /\s/.test(cursor.s[cursor.i])) cursor.i += 1;
}

function match(cursor, pattern) {
  const result = cursor.s.slice(cursor.i).match(pattern);
  if (!result) return null;
  cursor.i += result[0].length;
  return result[0];
}

function decodeLabel(value) {
  return String(value).replace(/#quot;/g, '"').replace(/#39;/g, "'");
}

function formatNode(node) {
  const label = formatLabel(node.label);
  switch (node.shape) {
    case "diamond":
      return `${node.id}{${label}}`;
    case "stadium":
      return `${node.id}([${label}])`;
    case "round":
      return `${node.id}(${label})`;
    default:
      return `${node.id}[${label}]`;
  }
}

function formatLabel(text) {
  const value = String(text ?? "");
  if (/[\[\]{}()|"]/.test(value)) {
    return `"${value.replace(/"/g, "#quot;")}"`;
  }
  return value;
}

function escapeLink(text) {
  return String(text).replace(/\|/g, "/");
}
