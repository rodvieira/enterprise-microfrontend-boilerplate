import { describe, expect, it } from 'vitest';
import { judgeOrigin } from '../src/internal/federation/origin-guard';

describe('judgeOrigin', () => {
  it('refuses an origin absent from allowedOrigins', () => {
    const decision = judgeOrigin('https://evil.example/mf-manifest.json', [
      'https://dashboard.example',
    ]);
    expect(decision).toEqual({
      allowed: false,
      reason: 'origin-not-allowed',
      origin: 'https://evil.example',
    });
  });

  it('refuses insecure transport on a non-loopback origin', () => {
    const decision = judgeOrigin('http://dashboard.example/mf-manifest.json', [
      'http://dashboard.example',
    ]);
    expect(decision).toEqual({
      allowed: false,
      reason: 'insecure-transport',
      origin: 'http://dashboard.example',
    });
  });

  it('allows insecure transport on loopback — local development must keep working', () => {
    const decision = judgeOrigin('http://localhost:3001/mf-manifest.json', [
      'http://localhost:3001',
    ]);
    expect(decision).toEqual({
      allowed: true,
      reason: 'ok',
      origin: 'http://localhost:3001',
    });
  });

  it('allows insecure transport on 127.0.0.1, the other common loopback form', () => {
    const decision = judgeOrigin('http://127.0.0.1:3001/mf-manifest.json', [
      'http://127.0.0.1:3001',
    ]);
    expect(decision.allowed).toBe(true);
  });

  it('refuses an entry that is not a valid URL', () => {
    const decision = judgeOrigin('not a url', ['http://localhost:3001']);
    expect(decision).toEqual({
      allowed: false,
      reason: 'malformed-url',
      origin: '',
    });
  });

  it('allows a secure origin that is on the allow-list', () => {
    const decision = judgeOrigin('https://dashboard.example/mf-manifest.json', [
      'https://dashboard.example',
    ]);
    expect(decision).toEqual({
      allowed: true,
      reason: 'ok',
      origin: 'https://dashboard.example',
    });
  });
});
