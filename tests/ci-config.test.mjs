import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

test("ci verify gates only on build and Cloudflare bundle", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    pkg.scripts["ci:verify"],
    "npm run ci:clean && npm run pages:build",
  );
  assert.equal(
    pkg.scripts["ci:clean"],
    "node scripts/clean-build-artifacts.cjs",
  );
  assert.equal(
    pkg.scripts["prepages:build"],
    "node scripts/ensure-ast-grep-linux.cjs",
  );
});

test("next config pins turbopack root to this checkout", () => {
  const nextConfig = read("next.config.ts");
  assert.match(nextConfig, /turbopack\s*:/);
  assert.match(nextConfig, /root\s*:/);
});

test("verify-db script has a matching runtime dependency", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.devDependencies.tsx, "^4.20.6");
});

test("cloudflare build dependencies are on a compatible version line", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies.next, "16.1.6");
  assert.equal(pkg.devDependencies["eslint-config-next"], "16.1.6");
  assert.equal(pkg.devDependencies["@opennextjs/cloudflare"], "^1.17.1");
});

test("cloudflare build lockfile includes the linux ast-grep native package", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));

  assert.equal(pkg.optionalDependencies["@ast-grep/napi-linux-x64-gnu"], "0.40.5");
  assert.ok(lock.packages["node_modules/@ast-grep/napi-linux-x64-gnu"]);
});

test("deploy workflow waits for successful CI on staging and main", () => {
  const workflow = read(".github/workflows/deploy-cloudflare.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\n\s*-\s*CI/);
  assert.match(workflow, /head_branch == 'staging'/);
  assert.match(workflow, /head_branch == 'main'/);
  assert.match(workflow, /head_sha/);
});

test("cloudflare deployment keeps auth gate on edge middleware, not node proxy", () => {
  assert.equal(exists("src/middleware.ts"), true);
  assert.equal(exists("src/proxy.ts"), false);
});

test("wrangler config matches the connected worker and enables minification", () => {
  const wrangler = read("wrangler.jsonc");
  assert.match(wrangler, /"name"\s*:\s*"cta"/);
  assert.match(wrangler, /"minify"\s*:\s*true/);
});
