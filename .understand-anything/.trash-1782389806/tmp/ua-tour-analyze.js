#!/usr/bin/env node
"use strict";

const fs = require("fs");

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error("Usage: ua-tour-analyze.js <input.json> <output.json>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const layers = data.layers || [];

  const nodeById = new Map();
  for (const n of nodes) nodeById.set(n.id, n);

  const isNodeLevel = (id) => nodeById.has(id);

  // ---- Fan-in / Fan-out (only count edges between known nodes) ----
  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
  }
  for (const e of edges) {
    if (isNodeLevel(e.source) && isNodeLevel(e.target)) {
      fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
      fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
    }
  }

  const byName = (id) => (nodeById.get(id) ? nodeById.get(id).name : id);
  const sumOf = (id) => (nodeById.get(id) ? nodeById.get(id).summary : "");

  const fanInRanking = [...fanIn.entries()]
    .map(([id, c]) => ({ id, fanIn: c, name: byName(id) }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);

  const fanOutRanking = [...fanOut.entries()]
    .map(([id, c]) => ({ id, fanOut: c, name: byName(id) }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  // ---- Entry point candidates ----
  const codeEntryNames = new Set([
    "index.ts","index.js","main.ts","main.js","app.ts","app.js","server.ts","server.js",
    "mod.rs","main.go","main.py","main.rs","manage.py","app.py","wsgi.py","asgi.py",
    "run.py","__main__.py","Application.java","Main.java","Program.cs","config.ru",
    "index.php","App.swift","Application.kt","main.cpp","main.c"
  ]);

  const fanOutVals = [...fanOut.values()].sort((a, b) => b - a);
  const top10pctIdx = Math.max(0, Math.floor(fanOutVals.length * 0.1) - 1);
  const top10pctThreshold = fanOutVals.length ? fanOutVals[Math.min(top10pctIdx, fanOutVals.length - 1)] : 0;
  const fanInVals = [...fanIn.values()].sort((a, b) => a - b);
  const bottom25Idx = Math.max(0, Math.floor(fanInVals.length * 0.25) - 1);
  const bottom25Threshold = fanInVals.length ? fanInVals[Math.min(bottom25Idx, fanInVals.length - 1)] : 0;

  const depth = (fp) => (fp ? fp.split("/").filter(Boolean).length : 99);

  const epScored = [];
  for (const n of nodes) {
    let score = 0;
    const name = n.name || "";
    const fp = n.filePath || "";
    if (n.type === "document") {
      if (name === "README.md" && depth(fp) <= 1) score += 5;
      else if (/\.md$/i.test(name) && depth(fp) <= 1) score += 2;
    } else if (n.type === "file") {
      if (codeEntryNames.has(name)) score += 3;
      if (depth(fp) <= 2) score += 1;
      if ((fanOut.get(n.id) || 0) >= top10pctThreshold && top10pctThreshold > 0) score += 1;
      if ((fanIn.get(n.id) || 0) <= bottom25Threshold) score += 1;
    }
    if (score > 0) epScored.push({ id: n.id, score, name, summary: n.summary || "" });
  }
  epScored.sort((a, b) => b.score - a.score);
  const entryPointCandidates = epScored.slice(0, 5);

  // ---- BFS from top code entry point ----
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if ((e.type === "imports" || e.type === "calls") && e.direction !== "reverse") {
      if (isNodeLevel(e.source) && isNodeLevel(e.target)) {
        adj.get(e.source).push(e.target);
      }
    }
  }

  const codeEntry = epScored.find((c) => {
    const n = nodeById.get(c.id);
    return n && n.type === "file";
  });
  const startNode = codeEntry ? codeEntry.id : (nodes[0] && nodes[0].id);

  const order = [];
  const depthMap = {};
  if (startNode) {
    const queue = [[startNode, 0]];
    const seen = new Set([startNode]);
    while (queue.length) {
      const [cur, d] = queue.shift();
      order.push(cur);
      depthMap[cur] = d;
      for (const nx of adj.get(cur) || []) {
        if (!seen.has(nx)) {
          seen.add(nx);
          queue.push([nx, d + 1]);
        }
      }
    }
  }
  const byDepth = {};
  for (const id of order) {
    const d = String(depthMap[id]);
    (byDepth[d] = byDepth[d] || []).push(id);
  }

  // ---- Non-code inventory ----
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const n of nodes) {
    const rec = { id: n.id, name: n.name, summary: n.summary || "" };
    if (n.type === "document") nonCodeFiles.documentation.push(rec);
    else if (["service", "pipeline", "resource"].includes(n.type)) nonCodeFiles.infrastructure.push(rec);
    else if (["table", "schema", "endpoint"].includes(n.type)) nonCodeFiles.data.push(rec);
    else if (n.type === "config") nonCodeFiles.config.push(rec);
  }

  // ---- Clusters: bidirectional pairs, expanded ----
  const edgeSet = new Set();
  for (const e of edges) {
    if (isNodeLevel(e.source) && isNodeLevel(e.target)) {
      edgeSet.add(e.source + "->" + e.target);
    }
  }
  const undirCount = new Map(); // unordered pair -> count of directed edges between
  for (const e of edges) {
    if (isNodeLevel(e.source) && isNodeLevel(e.target) && e.source !== e.target) {
      const key = [e.source, e.target].sort().join("|");
      undirCount.set(key, (undirCount.get(key) || 0) + 1);
    }
  }
  // seed clusters from pairs that have >=2 edges (bidirectional or multi-relation)
  const clusters = [];
  const neighbors = new Map();
  for (const n of nodes) neighbors.set(n.id, new Set());
  for (const e of edges) {
    if (isNodeLevel(e.source) && isNodeLevel(e.target) && e.source !== e.target) {
      neighbors.get(e.source).add(e.target);
      neighbors.get(e.target).add(e.source);
    }
  }
  const usedSeeds = new Set();
  for (const [key, cnt] of [...undirCount.entries()].sort((a, b) => b[1] - a[1])) {
    if (cnt < 2) continue;
    const [a, b] = key.split("|");
    if (usedSeeds.has(key)) continue;
    usedSeeds.add(key);
    const cl = new Set([a, b]);
    // expand: add nodes connected to >=2 members
    let changed = true;
    while (changed && cl.size < 5) {
      changed = false;
      const candidates = new Map();
      for (const m of cl) {
        for (const nb of neighbors.get(m)) {
          if (!cl.has(nb)) candidates.set(nb, (candidates.get(nb) || 0) + 1);
        }
      }
      for (const [c, deg] of candidates.entries()) {
        if (deg >= 2 && cl.size < 5) {
          cl.add(c);
          changed = true;
        }
      }
    }
    const edgeCount = countInternalEdges(cl, edges, isNodeLevel);
    clusters.push({ nodes: [...cl], edgeCount });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount);
  const topClusters = clusters.slice(0, 10);

  // ---- Layers ----
  const layerOut = {
    count: layers.length,
    list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description })),
  };

  // ---- Node summary index ----
  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || "" };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: topClusters,
    layers: layerOut,
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit(0);
}

function countInternalEdges(cl, edges, isNodeLevel) {
  let c = 0;
  for (const e of edges) {
    if (isNodeLevel(e.source) && isNodeLevel(e.target) && cl.has(e.source) && cl.has(e.target)) c++;
  }
  return c;
}

try {
  main();
} catch (err) {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
}
