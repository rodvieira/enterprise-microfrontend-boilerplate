import { useSession } from '../session/context';
import { Button } from './button';

/**
 * Shows the signed-in person's name, or a control to sign in — the frame's
 * one visible sign that the host's session works when
 * compiled and run for real.
 */
export function SessionIndicator() {
  const { status, user, login, logout } = useSession();

  if (status === 'unknown') {
    return null;
  }

  if (status === 'unauthenticated') {
    return (
      <Button variant="secondary" size="sm" onClick={() => void login()}>
        Sign in
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void logout()}>
      {user?.name}
    </Button>
  );
}
