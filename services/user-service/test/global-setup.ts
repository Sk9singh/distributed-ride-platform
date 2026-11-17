import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { TEST_DATABASE_URL } from './helpers';

// Run the real migrations against the test DB, exactly as you would by hand.
// (node-pg-migrate v9 is ESM-only, so we use its CLI rather than importing it into Jest.)
export default function globalSetup() {
  execFileSync('npx', ['node-pg-migrate', 'up', '--migrations-dir', 'migrations'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
