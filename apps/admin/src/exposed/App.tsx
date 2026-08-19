import type { RemoteAppProps } from '@enterprise-mfe/shared-types';
import { HostProvider, useHost } from '../internal/host-context';
import { PaginationControls } from '../internal/users/pagination-controls';
import { useUserList } from '../internal/users/use-user-list';
import { UserFormModal } from '../internal/users/user-form-modal';
import { UserTable } from '../internal/users/user-table';
import '../internal/styles.css';

/**
 * What the shell mounts at `/admin` (via RemoteRegion, "admin/App").
 * This app's public exposed surface — everything else lives in `internal/`.
 *
 * The styles.css import and this file's default export both matter *here*,
 * not only in bootstrap.tsx/as an afterthought — see
 * apps/dashboard/src/exposed/App.tsx and docs/USAGE.md's "Remotes"
 * section for why (the CSS-federation and default-export
 * findings, applied from day one in this app).
 *
 * Everything it needs from the host arrives as props — `session` and `bus`.
 * It imports nothing of the host's, which is what lets a remote live in its
 * own repository: there is no package to install.
 */
export function App({ basePath, session, bus }: RemoteAppProps) {
  return (
    <HostProvider value={{ session, bus }}>
      <AdminScreen basePath={basePath} />
    </HostProvider>
  );
}

function AdminScreen({ basePath }: { basePath: string }) {
  const { session } = useHost();
  const { user, isAuthenticated } = session;
  const userList = useUserList();

  return (
    <div className="flex flex-col gap-6 p-6" data-base-path={basePath}>
      <header>
        <h1 className="text-xl font-medium text-(--color-text)">Admin</h1>
        <p className="text-sm text-(--color-text-muted)">
          {isAuthenticated && user ? `Signed in as ${user.name}` : 'Not signed in'}
        </p>
      </header>
      <UserTable
        users={userList.users}
        sortColumn={userList.sortColumn}
        sortDirection={userList.sortDirection}
        onSort={userList.setSort}
      />
      <PaginationControls
        page={userList.page}
        pageCount={userList.pageCount}
        onNext={userList.nextPage}
        onPrevious={userList.previousPage}
      />
      <UserFormModal
        users={userList.allUsers}
        onInvite={userList.addUser}
        onChangeRole={userList.changeRole}
      />
    </div>
  );
}

export default App;
