export type GeneratorMode = 'monorepo' | 'standalone';

export interface RemoteAnswers {
  mode: GeneratorMode;
  name: string;
  routePath: string;
  label: string;
  /** Standalone mode only. */
  outputPath?: string;
}
