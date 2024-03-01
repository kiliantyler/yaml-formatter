import * as path from 'path';
import { platform } from 'node:process';

export function getCmd(): string {
  // __dirname is `out`, so go back one level
  let cmd = path.join(path.dirname(__dirname), 'bin', 'yamlfmt');
  if (platform === 'win32') {
    cmd = path.join(path.dirname(__dirname), 'bin', 'yamlfmt.exe');
  }
  return cmd;
}
