/**
 * context-builder.ts
 *
 * Reads all /docs markdown files and project-map.json,
 * then produces claude-context.txt — a single file ready to paste
 * into a Claude Code session or attach as context.
 *
 * Run with: bun run scripts/context-builder.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join, relative, extname, dirname } from "path";
import { fileURLToPath } from "url";

// Portable __dirname for both Bun (__dir) and Node ESM
const __dir: string = typeof (import.meta as Record<string, unknown>).dir === "string"
  ? (import.meta as Record<string, unknown>).dir as string
  : dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT        = join(__dir, "..");
const DOCS_DIR    = join(ROOT, "docs");
const MAP_FILE    = join(ROOT, "project-map.json");
const OUT_FILE    = join(ROOT, "claude-context.txt");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect .md files from a directory, sorted by path. */
function collectMarkdown(dir: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      results.push(...collectMarkdown(full));
    } else if (extname(entry) === ".md") {
      results.push(full);
    }
  }

  return results.sort();
}

/** Format a relative path as a section header. */
function sectionHeader(absPath: string, base: string): string {
  const rel = relative(base, absPath).replace(/\\/g, "/");
  return `### ${rel}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const parts: string[] = [];

  // ── Section 1: Project docs ────────────────────────────────────────────────
  parts.push("## PROJECT CONTEXT");
  parts.push("");

  if (!existsSync(DOCS_DIR)) {
    parts.push("_No /docs directory found. Run the documentation step first._");
  } else {
    const mdFiles = collectMarkdown(DOCS_DIR);

    if (mdFiles.length === 0) {
      parts.push("_No markdown files found in /docs._");
    } else {
      for (const file of mdFiles) {
        parts.push(sectionHeader(file, DOCS_DIR));
        parts.push("");
        parts.push(readFileSync(file, "utf-8").trimEnd());
        parts.push("");
        parts.push("---");
        parts.push("");
      }
      console.log(`✓ Included ${mdFiles.length} doc files`);
    }
  }

  // ── Section 2: Code map ────────────────────────────────────────────────────
  parts.push("## CODE MAP");
  parts.push("");

  if (!existsSync(MAP_FILE)) {
    parts.push("_project-map.json not found. Run `bun run index` first._");
    console.warn("⚠  project-map.json not found — run `bun run index` first");
  } else {
    const raw  = readFileSync(MAP_FILE, "utf-8");
    const map  = JSON.parse(raw);

    parts.push("```json");
    parts.push(raw.trimEnd());
    parts.push("```");
    console.log(`✓ Included project-map.json (${map.totalFiles} files, generated ${map.generatedAt})`);
  }

  parts.push("");

  // ── Write output ───────────────────────────────────────────────────────────
  const output = parts.join("\n");
  writeFileSync(OUT_FILE, output);

  const kb = (Buffer.byteLength(output, "utf-8") / 1024).toFixed(1);
  console.log(`✓ claude-context.txt written (${kb} kB)`);
}

main();
