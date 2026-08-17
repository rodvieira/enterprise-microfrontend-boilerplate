import type { Role, User } from '@enterprise-mfe/shared-types';
import { Button, Input, Modal, Select } from '@enterprise-mfe/ui';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { useCanWriteUsers } from '../permissions/use-can-write-users';
import type { MutationOutcome, NewUserInput } from './use-user-list';

export interface UserFormModalProps {
  users: readonly User[];
  onInvite: (input: NewUserInput) => MutationOutcome;
  onChangeRole: (userId: string, newRole: Role) => MutationOutcome;
}

type Mode = 'invite' | 'edit';

const ROLES: readonly Role[] = ['admin', 'editor', 'viewer'];

/**
 * One modal for both invite and role-change, gated by
 * useCanWriteUsers — not offered at all without users:write.
 */
export function UserFormModal({ users, onInvite, onChangeRole }: UserFormModalProps) {
  const canWrite = useCanWriteUsers();
  const modeGroupName = useId();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('invite');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');
  const [targetUserId, setTargetUserId] = useState(users[0]?.id ?? '');
  const [editRole, setEditRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | null>(null);

  if (!canWrite) {
    return null;
  }

  function reset() {
    setMode('invite');
    setName('');
    setEmail('');
    setInviteRole('viewer');
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const outcome =
      mode === 'invite'
        ? onInvite({ name, email, role: inviteRole })
        : onChangeRole(targetUserId, editRole);

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    handleClose();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Invite or edit user
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        title="Invite or edit user"
        footer={
          <Button type="submit" form="user-form-modal-form">
            Submit
          </Button>
        }
      >
        <form id="user-form-modal-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <fieldset className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={modeGroupName}
                checked={mode === 'invite'}
                onChange={() => setMode('invite')}
              />
              Invite a new user
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={modeGroupName}
                checked={mode === 'edit'}
                onChange={() => setMode('edit')}
              />
              Change an existing user's role
            </label>
          </fieldset>

          {mode === 'invite' ? (
            <>
              <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Select
                label="Role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as Role)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Select
                label="User"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
              <Select
                label="New role"
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as Role)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </>
          )}

          {error ? (
            <p role="alert" className="text-sm text-(--color-danger-600)">
              {error}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
