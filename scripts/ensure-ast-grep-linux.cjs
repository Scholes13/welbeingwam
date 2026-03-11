const { execFileSync } = require("node:child_process");

const TARGET_PACKAGE = "@ast-grep/napi-linux-x64-gnu@0.40.5";

function hasLinuxBinding() {
  try {
    require.resolve("@ast-grep/napi-linux-x64-gnu");
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "linux" || process.arch !== "x64") {
  process.exit(0);
}

if (hasLinuxBinding()) {
  process.exit(0);
}

console.warn(`Missing ${TARGET_PACKAGE}; installing fallback for Cloudflare build.`);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

execFileSync(npmCommand, ["install", "--no-save", TARGET_PACKAGE], {
  stdio: "inherit",
  env: process.env,
});
