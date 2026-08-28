/**
 * WASM initialization state machine contract (Round 2, item 7).
 *
 * wasmBridge's status/initPromise/initError are module-level state, so a
 * test that needs a fresh 'idle' start must jest.resetModules() and
 * re-require both wasmBridge and its mocked pkg dependency per test —
 * reusing the shared module singleton across tests would leak `status`
 * from one test into the next. jest.doMock (not jest.mock) is used for the
 * pkg factory so each test can control the `default` init function's
 * timing/outcome; doMock isn't hoisted, so it can safely close over local
 * per-test state the way a hoisted jest.mock factory cannot.
 */

describe('WASM init state machine', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  function freshBridge(defaultImpl: () => Promise<void>) {
    // __esModule: true matters here: the real pkg module is loaded via
    // Node's native require(esm) interop, which synthesizes that marker —
    // TypeScript's esModuleInterop `__importStar` checks it and, when
    // present, preserves `mod.default` as-is; without it, `__importStar`
    // instead wraps the *whole* mock object as `.default` (since it treats
    // the object like a legacy CJS module with no real default export),
    // which silently breaks `wasmModule.default` in wasmBridge.ts.
    jest.doMock('../renderer/wasm/pkg', () => ({
      __esModule: true,
      default: jest.fn(defaultImpl),
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../renderer/wasm/wasmBridge') as typeof import('../renderer/wasm/wasmBridge');
  }

  function deferred<T = void>() {
    let resolve!: (v: T) => void;
    let reject!: (err: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('is idle before initWasm() is called', () => {
    const bridge = freshBridge(() => Promise.resolve());
    expect(bridge.getWasmStatus()).toBe('idle');
  });

  it('is loading while init is in flight, ready once it resolves', async () => {
    const gate = deferred<void>();
    const bridge = freshBridge(() => gate.promise);

    const initDone = bridge.initWasm();
    expect(bridge.getWasmStatus()).toBe('loading');

    gate.resolve();
    await initDone;
    expect(bridge.getWasmStatus()).toBe('ready');
  });

  it('concurrent initWasm() calls share one in-flight promise and only initialize once', async () => {
    const gate = deferred<void>();
    const initFn = jest.fn(() => gate.promise);
    const bridge = freshBridge(initFn);

    const first = bridge.initWasm();
    const second = bridge.initWasm();
    const third = bridge.initWasm();
    expect(first).toBe(second);
    expect(second).toBe(third);

    gate.resolve();
    await Promise.all([first, second, third]);

    expect(initFn).toHaveBeenCalledTimes(1);
    expect(bridge.getWasmStatus()).toBe('ready');
  });

  it('moves to failed, retains the failure reason, and never reaches ready after a failed init', async () => {
    const bridge = freshBridge(() => Promise.reject(new Error('wasm binary fetch failed')));

    await expect(bridge.initWasm()).rejects.toThrow('wasm binary fetch failed');

    expect(bridge.getWasmStatus()).toBe('failed');
    expect(bridge.getWasmInitializationError()?.message).toBe('wasm binary fetch failed');
  });

  it('a non-Error rejection is still captured as a real Error with the failure reason retained', async () => {
    const bridge = freshBridge(() => Promise.reject('plain string failure'));

    await expect(bridge.initWasm()).rejects.toThrow('plain string failure');
    expect(bridge.getWasmInitializationError()?.message).toBe('plain string failure');
  });

  it('re-triggering initWasm() after ready does not call the underlying init function again', async () => {
    const initFn = jest.fn(() => Promise.resolve());
    const bridge = freshBridge(initFn);

    await bridge.initWasm();
    await bridge.initWasm();
    await bridge.ensureWasmReady();

    expect(initFn).toHaveBeenCalledTimes(1);
    expect(bridge.getWasmStatus()).toBe('ready');
  });

  it('calling initWasm() again after a failure retries initialization', async () => {
    const initFn = jest.fn().mockRejectedValueOnce(new Error('first attempt fails')).mockResolvedValueOnce(undefined);
    const bridge = freshBridge(initFn);

    await expect(bridge.initWasm()).rejects.toThrow('first attempt fails');
    expect(bridge.getWasmStatus()).toBe('failed');

    await bridge.initWasm();
    expect(bridge.getWasmStatus()).toBe('ready');
    expect(bridge.getWasmInitializationError()).toBeNull();
    expect(initFn).toHaveBeenCalledTimes(2);
  });
});
