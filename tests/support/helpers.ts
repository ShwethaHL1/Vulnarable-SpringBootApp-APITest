import * as fs from 'fs';

export function ensureReportDir(path: string) {
  fs.mkdirSync(path, { recursive: true });
}
