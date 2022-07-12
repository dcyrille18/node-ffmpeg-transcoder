import * as os from 'os';

export function isLinux(): boolean {
  return os.type().toLowerCase() === 'linux';
}

export function isWindows(): boolean {
  return os.type().toLowerCase().indexOf('windows') !== -1;
}

export function isMacOS(): boolean {
  return os.type().toLowerCase() === 'darwin';
}
