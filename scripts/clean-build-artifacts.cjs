const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const targets = ['.next', '.open-next'];

function clean(targetPath) {
  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  } catch (error) {
    if (process.platform !== 'win32') {
      throw error;
    }

    spawnSync('cmd', ['/c', 'rd', '/s', '/q', targetPath], {
      stdio: 'inherit',
      shell: false,
    });
  }

  if (fs.existsSync(targetPath)) {
    throw new Error(`Failed to remove ${targetPath}`);
  }
}

for (const target of targets) {
  clean(path.resolve(process.cwd(), target));
}
