import { contractExists, contractRead } from './lib/dev-contract-paths.mjs';

export function read(rel) {
  return contractRead(rel);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function checkRequiredFiles(requiredFiles) {
  for (const rel of requiredFiles) {
    assert(contractExists(rel), `missing required file: ${rel}`);
  }
}

export function parseJsonFiles(requiredFiles) {
  for (const rel of requiredFiles.filter((item) => item.endsWith('.json'))) {
    JSON.parse(read(rel));
  }
}

export function parseGoldenLines(rel) {
  return read(rel)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
