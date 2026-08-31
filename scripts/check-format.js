const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ALLOWED_EXTENSIONS = new Set(['.js', '.css', '.html', '.md', '.json', '.yaml', '.yml']);
const INCLUDE_DIRECTORIES = ['apps', 'scripts', '.github'];
const INCLUDE_FILES = ['README.md', 'package.json', '.env.example', '.editorconfig', '.gitignore', '.nvmrc'];

function shouldScan(filePath) {
  const ext = path.extname(filePath);
  return ALLOWED_EXTENSIONS.has(ext);
}

function collectFiles(dirPath, result) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, result);
      continue;
    }
    if (shouldScan(fullPath)) {
      result.push(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\n/);
  const trailingWhitespaceLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/\s+$/.test(lines[i])) {
      trailingWhitespaceLines.push(i + 1);
    }
  }

  const endsWithNewline = content.length === 0 || content.endsWith('\n');
  return { trailingWhitespaceLines, endsWithNewline };
}

const files = [];

for (const includeDir of INCLUDE_DIRECTORIES) {
  const includePath = path.join(ROOT, includeDir);
  if (fs.existsSync(includePath) && fs.statSync(includePath).isDirectory()) {
    collectFiles(includePath, files);
  }
}

for (const includeFile of INCLUDE_FILES) {
  const includePath = path.join(ROOT, includeFile);
  if (fs.existsSync(includePath) && fs.statSync(includePath).isFile() && shouldScan(includePath)) {
    files.push(includePath);
  }
}

let hasFailures = false;
for (const filePath of files) {
  const { trailingWhitespaceLines, endsWithNewline } = checkFile(filePath);
  const relative = path.relative(ROOT, filePath);

  if (trailingWhitespaceLines.length > 0) {
    hasFailures = true;
    console.error(`[format-check] Trailing whitespace in ${relative} at lines: ${trailingWhitespaceLines.join(', ')}`);
  }

  if (!endsWithNewline) {
    hasFailures = true;
    console.error(`[format-check] Missing trailing newline in ${relative}`);
  }
}

if (hasFailures) {
  process.exit(1);
}

console.log(`[format-check] Passed for ${files.length} files.`);
