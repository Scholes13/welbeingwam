const fs = require("node:fs");
const path = require("node:path");

function getCanonicalPath(inputPath) {
  const resolved = path.resolve(inputPath);
  const parsed = path.parse(resolved);
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;

  for (const part of parts) {
    const entries = fs.readdirSync(current || parsed.root);
    const exactPart = entries.find((entry) => entry.toLowerCase() === part.toLowerCase()) ?? part;
    current = path.join(current, exactPart);
  }

  return current;
}

const cwd = path.resolve(process.cwd());
const canonicalCwd = getCanonicalPath(cwd);

if (cwd === canonicalCwd) {
  process.exit(0);
}

console.error("Project path casing mismatch detected.");
console.error(`Current path:   ${cwd}`);
console.error(`Canonical path: ${canonicalCwd}`);
console.error("Run commands from the canonical path to avoid duplicate Next.js modules on Windows.");
console.error(`PowerShell: Set-Location -LiteralPath "${canonicalCwd}"`);
console.error(`CMD: cd /d "${canonicalCwd}"`);
process.exit(1);
