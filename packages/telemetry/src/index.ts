/** The only public entry point of @enterprise-mfe/telemetry. */

export { TelemetryProvider, useTelemetry } from './context';
export type { TelemetryProviderProps } from './context';
export { consoleTelemetry } from './console-telemetry';
export type { RemoteContext, Telemetry } from './types';
