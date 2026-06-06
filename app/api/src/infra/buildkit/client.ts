import { DockerError } from '../../shared/utils/error';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BUILDKIT_SOCK = '/run/buildkit/buildkitd.sock';
const ALLOWED_BUILDKIT_ADDR = process.env.BUILDKIT_ADDR;

export function validateBuildkitAddr(addr: string): void {
  if (addr.startsWith('tcp://')) {
    throw new DockerError('TCP BuildKit connections require mTLS and are disabled in this build.');
  }
  if (!addr.startsWith('unix://')) {
    throw new DockerError(`Invalid BuildKit address scheme: ${addr}`);
  }
  const sockPath = addr.replace('unix://', '');
  if (!fs.existsSync(sockPath)) {
    throw new DockerError(`BuildKit socket not found at ${sockPath}`);
  }
}