import { Button } from '@enterprise-mfe/ui';

/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses (constitution Principle I) —
 * even though the shell exposes nothing over federation today.
 *
 * The Button below is a smoke test for issue #4, not real chrome — it proves
 * the Tailwind pipeline actually generates the utility classes this component
 * uses (T016/T017). Removed once real chrome lands in T031.
 */
export function App() {
  return (
    <div style={{ padding: 24 }}>
      <Button variant="primary">apps/shell</Button>
    </div>
  );
}
