import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelemetryProvider, useTelemetry } from '../src/context';
import type { RemoteContext, Telemetry } from '../src/types';

const remote: RemoteContext = { name: 'dashboard', version: '1.4.2', routePath: '/dashboard' };

function fakeTelemetry(): Telemetry {
  return {
    remoteLoadStarted: vi.fn(),
    remoteLoadSucceeded: vi.fn(),
    remoteLoadFailed: vi.fn(),
    remoteRenderCrashed: vi.fn(),
  };
}

function Probe({ onReady }: { onReady: (telemetry: Telemetry) => void }) {
  const telemetry = useTelemetry();
  onReady(telemetry);
  return <p>ready</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TelemetryProvider', () => {
  it('hands the installed implementation to everything beneath it', () => {
    const telemetry = fakeTelemetry();
    const captured: { value?: Telemetry } = {};

    render(
      <TelemetryProvider telemetry={telemetry}>
        <Probe
          onReady={(value) => {
            captured.value = value;
          }}
        />
      </TelemetryProvider>,
    );

    captured.value?.remoteLoadSucceeded(remote, 120);
    expect(telemetry.remoteLoadSucceeded).toHaveBeenCalledWith(remote, 120);
  });

  it('falls back to the console sink outside a provider, rather than throwing', () => {
    // A remote rendered standalone has no host to inherit a
    // provider from. Refusing to render because nothing is watching would
    // make telemetry a hard dependency of running the app at all.
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const captured: { value?: Telemetry } = {};

    render(
      <Probe
        onReady={(value) => {
          captured.value = value;
        }}
      />,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
    captured.value?.remoteLoadStarted(remote);
    expect(debug).toHaveBeenCalled();
  });

  it('swallows a throwing implementation instead of breaking the app', () => {
    // A vendor SDK that throws during an outage must not take down the
    // remote it was reporting on.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exploding: Telemetry = {
      ...fakeTelemetry(),
      remoteLoadFailed: () => {
        throw new Error('collector unreachable');
      },
    };
    const captured: { value?: Telemetry } = {};

    render(
      <TelemetryProvider telemetry={exploding}>
        <Probe
          onReady={(value) => {
            captured.value = value;
          }}
        />
      </TelemetryProvider>,
    );

    expect(() => captured.value?.remoteLoadFailed(remote, new Error('boom'), 10)).not.toThrow();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('remoteLoadFailed threw'),
      expect.any(Error),
    );
  });
});

describe('consoleTelemetry', () => {
  it('names the remote and its version so a log line identifies the build', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TelemetryProvider>
        <Probe onReady={(value) => value.remoteRenderCrashed(remote, new Error('boom'))} />
      </TelemetryProvider>,
    );

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('dashboard@1.4.2 (/dashboard)'),
      expect.any(Error),
    );
  });

  it('degrades to the bare name when the registry states no version', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    render(
      <TelemetryProvider>
        <Probe onReady={(value) => value.remoteLoadStarted({ name: 'admin' })} />
      </TelemetryProvider>,
    );

    expect(debug).toHaveBeenCalledWith(expect.stringContaining('admin'));
    expect(debug).not.toHaveBeenCalledWith(expect.stringContaining('@'));
  });
});
