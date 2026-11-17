// Fail fast at startup instead of crashing on the first request that needs the value.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}
