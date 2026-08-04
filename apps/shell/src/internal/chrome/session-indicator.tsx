import { useAuth } from '@enterprise-mfe/auth';
import { Button } from '@enterprise-mfe/ui';

/**
 * Shows the signed-in person's name, or a control to sign in — the frame's
 * one visible sign that the session contract from sprint 2 works when
 * compiled and run for real (FR-003).
 */
export function SessionIndicator() {
  const { status, user, login, logout } = useAuth();

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
