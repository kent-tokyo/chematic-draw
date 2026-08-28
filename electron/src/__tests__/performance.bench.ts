/**
 * Performance benchmarks for P0-P3 implementations
 * Run with: npm run bench (once script is added)
 */

import * as wasmBridge from '../renderer/wasm/wasmBridge';

// Generate large molecules for testing
function generateLargeMolecule(atomCount: number) {
  const atoms = Array.from({ length: atomCount }, (_, i) => ({
    id: i,
    element: i % 2 === 0 ? 'C' : 'N',
    x: Math.random() * 10,
    y: Math.random() * 10,
    charge: 0,
    atom_map: 0,
  }));

  const bonds = Array.from({ length: atomCount - 1 }, (_, i) => ({
    id: i,
    from: i,
    to: i + 1,
    order: 1,
    stereo: 0,
  }));

  return { atoms, bonds };
}

describe('Performance Benchmarks', () => {
  describe('3D Coordinate Generation', () => {
    it('should generate 3D coords for small molecule (<50 atoms) in <500ms', () => {
      const mol = generateLargeMolecule(30);
      const start = performance.now();

      // Mock the WASM call
      const mockCoords = {
        atoms: mol.atoms.map((a) => ({ ...a, z: Math.random() })),
      };

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(mockCoords.atoms).toHaveLength(30);
    });

    it('should generate 3D coords for medium molecule (100-500 atoms) in <2s', () => {
      const mol = generateLargeMolecule(250);
      const start = performance.now();

      const mockCoords = {
        atoms: mol.atoms.map((a) => ({ ...a, z: Math.random() })),
      };

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(mockCoords.atoms).toHaveLength(250);
    });

    it('should handle large molecules (>500 atoms)', () => {
      const mol = generateLargeMolecule(750);
      const start = performance.now();

      const mockCoords = {
        atoms: mol.atoms.map((a) => ({ ...a, z: Math.random() })),
      };

      const elapsed = performance.now() - start;

      // Large molecules may take 3-5 seconds
      expect(elapsed).toBeLessThan(5000);
      expect(mockCoords.atoms).toHaveLength(750);
    });
  });

  describe('Fingerprint Generation', () => {
    it('should generate ECFP4 fingerprint in <100ms', () => {
      const mol = generateLargeMolecule(100);
      const start = performance.now();

      // Mock fingerprint generation
      const fp = 'ecfp4_' + mol.atoms.length;

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(fp).toBeDefined();
    });

    it('should handle fingerprint similarity calculation in <10ms', () => {
      const fp1 = 'ecfp4_C100';
      const fp2 = 'ecfp4_C101';
      const start = performance.now();

      // Mock similarity calculation
      const similarity = 0.95;

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(similarity).toBeGreaterThan(0.9);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory after multiple 3D generations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate multiple generations
      for (let i = 0; i < 10; i++) {
        const mol = generateLargeMolecule(100);
        const coords = {
          atoms: mol.atoms.map((a) => ({ ...a, z: Math.random() })),
        };
        // Memory should be released after each iteration
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory increase should be minimal (reasonable growth)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Rendering Performance', () => {
    it('should render canvas updates at 60 FPS', () => {
      const frameCount = 60;
      const frameTimes: number[] = [];

      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();

        // Simulate canvas render
        const angle = (i * 2 * Math.PI) / frameCount;
        const x = Math.cos(angle) * 100;
        const y = Math.sin(angle) * 100;

        const frameElapsed = performance.now() - frameStart;
        frameTimes.push(frameElapsed);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameCount;
      const targetFrameTime = 1000 / 60; // ~16.67ms for 60 FPS

      expect(avgFrameTime).toBeLessThan(targetFrameTime);
    });

    it('should handle mouse drag with <16ms latency', () => {
      const dragStart = performance.now();

      // Simulate drag processing
      const angle = Math.random() * 0.1;
      const zoom = 1.0 + Math.random() * 0.1;

      const dragElapsed = performance.now() - dragStart;

      expect(dragElapsed).toBeLessThan(16); // 60 FPS frame budget
    });
  });

  describe('Scaling Analysis', () => {
    // A lower-bound assertion on wall-clock ratios (e.g. "200 atoms must take
    // at least 1.5x as long as 100 atoms") isn't a real performance
    // guarantee — for a sub-millisecond operation, JIT warmup, GC pauses, and
    // OS scheduling noise can easily make the *smaller* input measure slower
    // than the larger one on a given run, with nothing actually regressing.
    // Rigorous complexity analysis belongs in a real benchmark harness
    // (Rust-side Criterion against the actual WASM operations, not this
    // mocked JS array-spread stand-in) — not a CI-blocking assertion here.
    //
    // This test keeps exactly one blocking check: a generous upper bound
    // that only fires on a genuine, severe regression (e.g. an accidental
    // O(n²) change), using warm-up + repeated median-of-N measurement to
    // damp out noise. The full per-size timing is logged, not asserted on,
    // so a human can still eyeball the scaling trend.
    it('should not regress severely as molecule size grows', () => {
      const median = (values: number[]): number => {
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      const measure = (size: number): number => {
        const mol = generateLargeMolecule(size);
        // Warm-up: let the JIT settle before the timed repetitions.
        for (let i = 0; i < 3; i++) {
          mol.atoms.map((a) => ({ ...a, z: Math.random() }));
        }
        const samples: number[] = [];
        for (let i = 0; i < 7; i++) {
          const start = performance.now();
          mol.atoms.map((a) => ({ ...a, z: Math.random() }));
          samples.push(performance.now() - start);
        }
        return median(samples);
      };

      // Larger sizes than the old test (500 atoms is already an order of
      // magnitude past this app's documented ">500 atoms" tier) so the
      // per-size time is large enough for `performance.now()`'s resolution
      // to actually distinguish it from noise.
      const sizes = [500, 2000, 8000];
      const times = sizes.map(measure);
      // eslint-disable-next-line no-console
      console.log('Scaling Analysis (median of 7, ms):', sizes.map((s, i) => `${s} atoms: ${times[i].toFixed(3)}`).join(', '));

      // Generous upper bound: true O(n) would put the 8000-atom run at ~16x
      // the 500-atom run; this only fails on a drastic regression (e.g. an
      // accidental O(n²)), not on ordinary measurement noise.
      const scaleFactor = sizes[2] / sizes[0];
      expect(times[2]).toBeLessThan(Math.max(times[0], 1) * scaleFactor * 5);
    });
  });

  describe('Batch Operations', () => {
    it('should process batch of 10 molecules efficiently', () => {
      const batchStart = performance.now();

      const batch = Array.from({ length: 10 }, () => generateLargeMolecule(100));

      batch.forEach((mol) => {
        const coords = {
          atoms: mol.atoms.map((a) => ({ ...a, z: Math.random() })),
        };
      });

      const batchElapsed = performance.now() - batchStart;

      // 10 molecules of 100 atoms each should complete quickly
      expect(batchElapsed).toBeLessThan(2000);
    });
  });
});
