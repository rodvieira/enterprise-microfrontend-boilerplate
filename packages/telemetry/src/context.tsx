import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { consoleTelemetry } from './console-telemetry';
import type { RemoteContext, Telemetry } from './types';

export interface TelemetryProviderProps {
  children: ReactNode;
  /** Defaults to the console sink. Swap for your own vendor adapter. */
  telemetry?: Telemetry;
}

const TelemetryContext = createContext<Telemetry | null>(null);

/**
 * Wraps an implementation so a throw inside it can never reach the app.
 *
 * Telemetry is the one dependency that must not be able to break the thing
 * it observes: a vendor SDK that throws on a malformed payload, or during a
 * provider outage, would otherwise take out the remote it was reporting on.
 * Enforced here rather than trusted to every implementation, because the
 * implementations are written by adopters.
 */
function shielded(telemetry: Telemetry): Telemetry {
  function guard<Args extends unknown[]>(
    method: (...args: Args) => void,
    name: string,
  ): (...args: Args) => void {
    return (...args: Args) => {
      try {
        method.apply(telemetry, args);
      } catch (cause) {
        console.error(`[telemetry] ${name} threw and was swallowed:`, cause);
      }
    };
  }

  return {
    remoteLoadStarted: guard(telemetry.remoteLoadStarted, 'remoteLoadStarted'),
    remoteLoadSucceeded: guard(telemetry.remoteLoadSucceeded, 'remoteLoadSucceeded'),
    remoteLoadFailed: guard(telemetry.remoteLoadFailed, 'remoteLoadFailed'),
    remoteRenderCrashed: guard(telemetry.remoteRenderCrashed, 'remoteRenderCrashed'),
  };
}

export function TelemetryProvider({ children, telemetry }: TelemetryProviderProps) {
  const value = useMemo(() => shielded(telemetry ?? consoleTelemetry), [telemetry]);
  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

/**
 * Reads the active sink.
 *
 * Unlike useAuth, this does NOT throw outside a provider: a remote rendered
 * standalone — which every remote here must support — has no host to inherit a provider
 * from, and refusing to render it because nothing is watching would make
 * telemetry a hard dependency of running the app at all. Falling back to the
 * console keeps the standalone case working and still shows the events.
 */
export function useTelemetry(): Telemetry {
  return useContext(TelemetryContext) ?? consoleTelemetry;
}

export type { RemoteContext, Telemetry };
