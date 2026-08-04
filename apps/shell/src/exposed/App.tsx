/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses (constitution Principle I) —
 * even though the shell exposes nothing over federation today.
 */
export function App() {
  return <div>apps/shell</div>;
}
