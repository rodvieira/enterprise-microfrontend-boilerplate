/**
 * Compose class names, dropping anything falsy.
 *
 * This is here instead of a `clsx` dependency on purpose:
 * Principle IX — a boilerplate's dependency list is inherited wholesale by every
 * adopter, and this is the whole feature.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
