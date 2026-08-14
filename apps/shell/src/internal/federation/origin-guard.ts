import type { OriginDecision } from './types';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost');
}

function decide(
  allowed: boolean,
  reason: OriginDecision['reason'],
  origin: string,
): OriginDecision {
  return { allowed, reason, origin };
}

/**
 * The three origin-control rules from data-model.md, run in order:
 * 1. entry must parse as a URL.
 * 2. its origin must be on the allow-list.
 * 3. the transport must be secure, unless the host is loopback.
 *
 * This is the security boundary of the whole composition — it
 * runs before any remote code is fetched, so a refusal never becomes a load
 * attempt. See register.ts for where that ordering is enforced.
 */
export function judgeOrigin(entry: string, allowedOrigins: readonly string[]): OriginDecision {
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    return decide(false, 'malformed-url', '');
  }

  const origin = url.origin;

  if (!allowedOrigins.includes(origin)) {
    return decide(false, 'origin-not-allowed', origin);
  }

  if (url.protocol !== 'https:' && !isLoopback(url.hostname)) {
    return decide(false, 'insecure-transport', origin);
  }

  return decide(true, 'ok', origin);
}
