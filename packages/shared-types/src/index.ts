/** The only public entry point of @enterprise-mfe/shared-types. */

export type { Permission, Role, User } from './user';
export { ROLE_PERMISSIONS, permissionsForRole } from './user';
export type {
  RemoteAppProps,
  RemoteBus,
  RemoteSession,
  WithClassName,
} from './component';
