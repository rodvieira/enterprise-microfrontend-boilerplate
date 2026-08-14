# @enterprise-mfe/telemetry

The remote-observability **contract**, backed by a console sink. Not a
vendor integration — see [ADR-0023](../../docs/decisions/0023-telemetry-contract.md).

```tsx
import { TelemetryProvider } from '@enterprise-mfe/telemetry';

<TelemetryProvider telemetry={myVendorAdapter}>
  <App />
</TelemetryProvider>;
```

Omit `telemetry` and events print to the console, so you can watch the
instrumentation work on a fresh clone before wiring anything.

Four events, deliberately distinguishing the two failure surfaces a
micro-frontend host has:

| Event | Meaning |
|---|---|
| `remoteLoadStarted` | a remote's code started downloading |
| `remoteLoadSucceeded` | its module resolved (`durationMs` from start) |
| `remoteLoadFailed` | it never loaded — network, origin refusal, timeout, bad export |
| `remoteRenderCrashed` | it loaded, then threw while rendering |

Every event carries a `RemoteContext` (`name`, optional `version` from the
registry, `routePath`), so a failure identifies **which build** broke.

See [docs/how-to-connect-telemetry.md](../../docs/how-to-connect-telemetry.md)
to plug in Sentry, Datadog, or OpenTelemetry.
