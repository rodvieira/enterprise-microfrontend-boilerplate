import { describe, expect, it } from 'vitest';
import {
  UnknownEnvironmentError,
  resolveRegistrySourcePath,
} from '../src/internal/federation/resolve-registry-source';

const allFilesExist = () => true;

describe('resolveRegistrySourcePath', () => {
  it('defaults to dev when FEDERATION_ENV is unset (FR-005)', () => {
    expect(resolveRegistrySourcePath(undefined, allFilesExist)).toBe(
      './src/internal/federation/remotes.dev.json',
    );
  });

  it('resolves each known environment to its own file', () => {
    expect(resolveRegistrySourcePath('staging', allFilesExist)).toBe(
      './src/internal/federation/remotes.staging.json',
    );
    expect(resolveRegistrySourcePath('production', allFilesExist)).toBe(
      './src/internal/federation/remotes.production.json',
    );
  });

  it('refuses an unknown environment, naming it and the file it expected', () => {
    expect(() => resolveRegistrySourcePath('qa', allFilesExist)).toThrow(UnknownEnvironmentError);
    expect(() => resolveRegistrySourcePath('qa', allFilesExist)).toThrow(/"qa"/);
    expect(() => resolveRegistrySourcePath('qa', allFilesExist)).toThrow(/remotes\.qa\.json/);
  });

  it('refuses a known environment whose file is missing, naming both — never falls back silently', () => {
    const noFilesExist = () => false;
    expect(() => resolveRegistrySourcePath('production', noFilesExist)).toThrow(
      UnknownEnvironmentError,
    );
    expect(() => resolveRegistrySourcePath('production', noFilesExist)).toThrow(/"production"/);
    expect(() => resolveRegistrySourcePath('production', noFilesExist)).toThrow(
      /remotes\.production\.json/,
    );
  });
});
