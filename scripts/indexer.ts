/**
 * indexer.ts
 *
 * Recursively scans /src for .ts and .tsx files.
 * Extracts exports, hook usage, and API call patterns using regex heuristics.
 * Outputs project-map.json in the project root.
 *
 * Run with: bun run scripts/indexer.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative, extname, dirname } from "path";
import { fileURLToPath } from "url";

// Portable __dirname for both Bun (__dir) and Node ESM
const __dir: string = typeof (import.meta as Record<string, unknown>).dir === "string"
  ? (import.meta as Record<string, unknown>).dir as string
  : dirname(fileURLToPath(import.meta.url));

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileEntry {
  path: string;              // relative path from project root
  exports: string[];         // named exports (functions, components, constants)
  hooks: string[];           // React hooks found (e.g. useState, useEffect)
  apiCalls: string[];        // fetch / axios / HTTP patterns found
  linesOfCode: number;
}

interface ProjectMap {
  generatedAt: string;
  totalFiles: number;
  files: FileEntry[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const SRC_DIR   = join(__dir, "..", "src");
const OUT_FILE  = join(__dir, "..", "project-map.json");
const EXTENSIONS = new Set([".ts", ".tsx"]);

// Patterns to skip
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

// ── Extraction helpers ────────────────────────────────────────────────────────

/**
 * Extract named exports from source text.
 * Handles:
 *   export const Foo = ...
 *   export function foo(
 *   export class Foo
 *   export type Foo / export interface Foo  (skipped — type-only)
 *   export { Foo, Bar }
 *   export default ComponentName  (as "default: ComponentName")
 */
function extractExports(src: string): string[] {
  const found = new Set<string>();

  // export const/function/class Name
  for (const m of src.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)) {
    found.add(m[1]);
  }

  // export { Foo, Bar as Baz }
  for (const m of src.matchAll(/^export\s+\{([^}]+)\}/gm)) {
    for (const part of m[1].split(",")) {
      // "Foo as Bar" → take the alias (Bar); plain "Foo" → take Foo
      const alias = part.match(/\bas\s+(\w+)/);
      const name  = alias ? alias[1] : part.trim().split(/\s+/)[0];
      if (name && !name.startsWith("//")) found.add(name);
    }
  }

  // export default Identifier
  for (const m of src.matchAll(/^export\s+default\s+(\w+)/gm)) {
    found.add(`default:${m[1]}`);
  }

  return [...found].filter(Boolean);
}

/**
 * Extract React hook names used in the file.
 * Matches use* calls: useState, useEffect, useCallback, useMemo, useRef, useContext, etc.
 */
function extractHooks(src: string): string[] {
  const found = new Set<string>();
  for (const m of src.matchAll(/\b(use[A-Z]\w*)\s*[(<(]/g)) {
    found.add(m[1]);
  }
  return [...found];
}

/**
 * Detect API / HTTP call patterns.
 * Looks for: fetch(, axios., axios.get/post/etc, XMLHttpRequest
 */
function extractApiCalls(src: string): string[] {
  const found = new Set<string>();

  if (/\bfetch\s*\(/.test(src))             found.add("fetch");
  if (/\baxios\s*\./.test(src))             found.add("axios");
  if (/\baxios\s*\(/.test(src))             found.add("axios");
  if (/\bnew\s+XMLHttpRequest\b/.test(src)) found.add("XMLHttpRequest");
  if (/\$\.ajax\s*\(/.test(src))            found.add("$.ajax");

  return [...found];
}

// ── File walker ───────────────────────────────────────────────────────────────

function walk(dir: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;

    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const projectRoot = join(__dir, "..");
  const files       = walk(SRC_DIR);

  const entries: FileEntry[] = files.map((absPath) => {
    const src      = readFileSync(absPath, "utf-8");
    const relPath  = relative(projectRoot, absPath).replace(/\\/g, "/");
    const lines    = src.split("\n").length;

    return {
      path:        relPath,
      exports:     extractExports(src),
      hooks:       extractHooks(src),
      apiCalls:    extractApiCalls(src),
      linesOfCode: lines,
    };
  });

  // Sort by path for stable output
  entries.sort((a, b) => a.path.localeCompare(b.path));

  const map: ProjectMap = {
    generatedAt: new Date().toISOString(),
    totalFiles:  entries.length,
    files:       entries,
  };

  writeFileSync(OUT_FILE, JSON.stringify(map, null, 2));

  console.log(`✓ Indexed ${entries.length} files → project-map.json`);

  // Print a brief summary of non-UI files (skip src/components/ui/)
  const notable = entries.filter(
    (e) => !e.path.startsWith("src/components/ui/") && e.exports.length > 0
  );
  console.log(`\nNotable files (${notable.length}):`);
  for (const e of notable) {
    const tags: string[] = [];
    if (e.hooks.length)    tags.push(`hooks: ${e.hooks.join(", ")}`);
    if (e.apiCalls.length) tags.push(`api: ${e.apiCalls.join(", ")}`);
    console.log(`  ${e.path}  [${e.exports.join(", ")}]${tags.length ? "  — " + tags.join(" | ") : ""}`);
  }
}

main();
