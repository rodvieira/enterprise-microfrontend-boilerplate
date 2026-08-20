/**
 * `gifenc` ships no type declarations and has no @types package.
 *
 * Declared here rather than left implicitly `any`, so that a breaking change
 * in the encoder shows up as a compile error in scripts/record-demo.ts
 * instead of a corrupt GIF. Only the surface that script uses is described.
 */
declare module 'gifenc' {
  type Rgb = [number, number, number];

  interface WriteFrameOptions {
    /** Required on the first frame; omit afterwards to reuse the global one. */
    palette?: Rgb[];
    first?: boolean;
    /** Milliseconds this frame stays on screen. */
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    /** 1 leaves the previous frame in place, which is what makes transparency mean "unchanged". */
    dispose?: number;
    repeat?: number;
    colorDepth?: number;
  }

  interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }

  /**
   * Named, not default: the package's CommonJS build puts these on
   * `module.exports` directly and uses `default` for something else, so a
   * default import resolves to the wrong value once `tsx` transforms this
   * script to CJS.
   */
  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number): Rgb[];
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Rgb[]): Uint8Array;
}
