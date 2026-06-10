/**
 * WASM Memory & Performance Profiler
 * Tracks allocation, execution time, and GC pressure
 */

interface OperationMetrics {
  name: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  atomCount?: number;
}

interface ProfileResult {
  operations: OperationMetrics[];
  totalDuration: number;
  totalMemoryDelta: number;
  avgTimePerAtom: number;
  recommendations: string[];
}

export class WasmProfiler {
  private metrics: OperationMetrics[] = [];
  private startTime = 0;

  /**
   * Start profiling a WASM operation
   */
  static measureOperation(
    name: string,
    fn: () => void,
    atomCount?: number
  ): OperationMetrics {
    const memBefore = this.getMemoryUsage();
    const timeBefore = performance.now();

    fn();

    const timeAfter = performance.now();
    const memAfter = this.getMemoryUsage();

    return {
      name,
      duration: timeAfter - timeBefore,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      atomCount,
    };
  }

  /**
   * Get current memory usage in bytes
   */
  static getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Profile a series of operations
   */
  static profileOperations(
    operations: Array<{ name: string; fn: () => void; atomCount?: number }>
  ): ProfileResult {
    const metrics: OperationMetrics[] = [];
    const startTime = performance.now();

    for (const op of operations) {
      const metric = this.measureOperation(op.name, op.fn, op.atomCount);
      metrics.push(metric);
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const totalMemoryDelta = metrics.reduce((sum, m) => sum + m.memoryDelta, 0);

    const totalAtoms = metrics.reduce((sum, m) => sum + (m.atomCount || 0), 0);
    const avgTimePerAtom = totalAtoms > 0 ? totalDuration / totalAtoms : 0;

    const recommendations = this.generateRecommendations(
      metrics,
      totalMemoryDelta,
      avgTimePerAtom
    );

    return {
      operations: metrics,
      totalDuration,
      totalMemoryDelta,
      avgTimePerAtom,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations based on metrics
   */
  private static generateRecommendations(
    metrics: OperationMetrics[],
    totalMemoryDelta: number,
    avgTimePerAtom: number
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (totalMemoryDelta > 50 * 1024 * 1024) {
      recommendations.push('⚠️ High memory usage: consider object pooling');
    }

    if (totalMemoryDelta > 100 * 1024 * 1024) {
      recommendations.push('🔴 Critical memory usage: implement streaming for large molecules');
    }

    // Time recommendations
    if (avgTimePerAtom > 1) {
      recommendations.push('⚠️ Slow per-atom processing: consider SIMD or WebAssembly optimization');
    }

    // Individual operation recommendations
    const slowOps = metrics.filter((m) => m.duration > 1000);
    if (slowOps.length > 0) {
      recommendations.push(
        `⚠️ Slow operations detected: ${slowOps.map((o) => o.name).join(', ')}`
      );
    }

    const memoryLeaks = metrics.filter((m) => m.memoryDelta > 10 * 1024 * 1024);
    if (memoryLeaks.length > 0) {
      recommendations.push(
        `⚠️ Potential memory leaks: ${memoryLeaks.map((o) => o.name).join(', ')}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance metrics within acceptable range');
    }

    return recommendations;
  }

  /**
   * Format metrics for console output
   */
  static formatReport(result: ProfileResult): string {
    let report = '\n📊 WASM Performance Report\n';
    report += '═'.repeat(50) + '\n\n';

    report += 'Operation Metrics:\n';
    report += '─'.repeat(50) + '\n';

    for (const op of result.operations) {
      report += `${op.name}:\n`;
      report += `  Duration: ${op.duration.toFixed(2)}ms\n`;
      report += `  Memory: +${(op.memoryDelta / 1024 / 1024).toFixed(2)}MB\n`;
      if (op.atomCount) {
        report += `  Atoms: ${op.atomCount} (${(op.duration / op.atomCount).toFixed(2)}ms per atom)\n`;
      }
      report += '\n';
    }

    report += '─'.repeat(50) + '\n';
    report += `Total Duration: ${result.totalDuration.toFixed(2)}ms\n`;
    report += `Total Memory Delta: ${(result.totalMemoryDelta / 1024 / 1024).toFixed(2)}MB\n`;
    report += `Average Time per Atom: ${result.avgTimePerAtom.toFixed(3)}ms\n\n`;

    report += 'Recommendations:\n';
    report += '─'.repeat(50) + '\n';
    for (const rec of result.recommendations) {
      report += `${rec}\n`;
    }

    report += '\n' + '═'.repeat(50) + '\n';

    return report;
  }

  /**
   * Benchmark WASM function with various molecule sizes
   */
  static benchmarkBySize(
    fn: (atomCount: number) => void,
    sizes: number[] = [50, 100, 250, 500]
  ): void {
    console.log('\n📈 Scaling Analysis\n');
    console.log('Atom Count | Duration (ms) | Memory Delta (MB) | Time per Atom (ms)');
    console.log('─'.repeat(75));

    const measurements = sizes.map((size) => {
      const metric = this.measureOperation(`Molecule(${size} atoms)`, () => fn(size), size);
      const timePerAtom = metric.duration / size;
      const memPerAtom = metric.memoryDelta / size / 1024;

      console.log(
        `${size.toString().padEnd(10)} | ${metric.duration.toFixed(2).padEnd(13)} | ${(
          metric.memoryDelta /
          1024 /
          1024
        )
          .toFixed(2)
          .padEnd(17)} | ${timePerAtom.toFixed(3)}`
      );

      return metric;
    });

    // Analyze scaling
    if (measurements.length > 1) {
      const ratio = measurements[1].duration / measurements[0].duration;
      const sizeRatio = measurements[1].atomCount! / measurements[0].atomCount!;

      console.log('\n📊 Scaling Analysis:');
      if (Math.abs(ratio - sizeRatio) < sizeRatio * 0.5) {
        console.log('✅ Linear scaling (O(n)) detected');
      } else if (ratio > sizeRatio * sizeRatio) {
        console.log('⚠️ Quadratic or worse scaling (O(n²)+) detected');
      } else {
        console.log('⚠️ Superlinear scaling (O(n log n)) detected');
      }
    }
  }
}
