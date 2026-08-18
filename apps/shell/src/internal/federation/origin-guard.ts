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
 * Origin control, run before any remote code is fetched, so a refusal never
 * becomes a load attempt. See register.ts for where that ordering is
 * enforced.
 *
 * An `entry` may be absolute or **root-relative**:
 *
 * - `https://cdn.example/dashboard/mf-manifest.json` — its origin must be on
 *   the allow-list, and the transport must be secure unless the host is
 *   loopback.
 * - `/remotes/dashboard/mf-manifest.json` — the remote is served from the
 *   same origin as the shell. That is allowed without appearing on the
 *   allow-list, because it *is* the origin already executing the shell's own
 *   code: listing it would be a check that cannot meaningfully fail, and the
 *   generated CSP already covers it as `'self'`.
 *
 * Same-origin entries exist because an absolute URL has to be kept in step
 * with wherever the shell is actually deployed. When the two drift — a host
 * that truncates the project name, or a preview deployment on a URL nobody
 * wrote down — the shell fetches from a domain that does not resolve. A
 * relative entry cannot drift, because it has no origin of its own to be
 * wrong about.
 *
 * `selfOrigin` is passed in rather than read from `location` so this stays a
 * pure function.
 */
export function judgeOrigin(
  entry: string,
  allowedOrigins: readonly string[],
  selfOrigin: string,
): OriginDecision {
  // `//host/path` is protocol-relative: it names another origin while looking
  // relative, so it is judged as the absolute URL it really is.
  if (entry.startsWith('/') && !entry.startsWith('//')) {
    // Root-relative only. A bare `remotes/…` would resolve against whatever
    // route the person happens to be on — `/dashboard/remotes/…` — which is
    // a different file on most deployments and a 404 on the rest.
    return decide(true, 'ok', selfOrigin);
  }

  return judgeAbsolute(entry, allowedOrigins, selfOrigin);
}

function judgeAbsolute(
  entry: string,
  allowedOrigins: readonly string[],
  selfOrigin: string,
): OriginDecision {
  let url: URL;
  try {
    // Protocol-relative entries need the base to resolve a scheme; nothing
    // else does. Passing a base unconditionally would make `new URL` resolve
    // arbitrary junk — "not a url" becomes "<selfOrigin>/not%20a%20url" —
    // and quietly turn a malformed entry into an allowed same-origin one.
    url = entry.startsWith('//') ? new URL(entry, selfOrigin) : new URL(entry);
  } catch {
    return decide(false, 'malformed-url', '');
  }

  const origin = url.origin;

  // An absolute URL naming the shell's own origin is the same situation as a
  // relative one, and is allowed on the same reasoning — including the
  // transport check. The shell's own code was already delivered over this
  // exact scheme; refusing its remote for using it too protects nothing, and
  // would make an http deployment work with relative entries but not with
  // the absolute form of the identical URL.
  if (origin === selfOrigin) {
    return decide(true, 'ok', origin);
  }

  if (!allowedOrigins.includes(origin)) {
    return decide(false, 'origin-not-allowed', origin);
  }

  if (url.protocol !== 'https:' && !isLoopback(url.hostname)) {
    return decide(false, 'insecure-transport', origin);
  }

  return decide(true, 'ok', origin);
}
