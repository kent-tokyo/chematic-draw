/**
 * WebWorker for Canvas rendering optimization
 * Offloads heavy 3D calculations from main thread
 */

interface RenderTask {
  id: string;
  atoms: Array<{ id: number; element: string; x: number; y: number; z: number }>;
  angleX: number;
  angleY: number;
  zoom: number;
  width: number;
  height: number;
}

interface RenderResult {
  id: string;
  projections: Array<{
    x: number;
    y: number;
    z: number;
    element: string;
    radius: number;
  }>;
  bonds: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

// Rotation matrix calculation
function rotate(
  x: number,
  y: number,
  z: number,
  sinX: number,
  cosX: number,
  sinY: number,
  cosY: number
): [number, number, number] {
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  return [x1, y2, z2];
}

// Van der Waals radius lookup
function vdwRadius(elem: string): number {
  const vdwRadii: { [key: string]: number } = {
    H: 1.2, C: 1.7, N: 1.55, O: 1.52, F: 1.47, P: 1.8, S: 1.8,
    Cl: 1.75, Br: 1.85, I: 1.98, B: 1.92, Si: 2.1,
  };
  return vdwRadii[elem] || 1.5;
}

// Main worker handler
self.onmessage = (event: MessageEvent<RenderTask>) => {
  const task = event.data;

  try {
    const sinX = Math.sin(task.angleX);
    const cosX = Math.cos(task.angleX);
    const sinY = Math.sin(task.angleY);
    const cosY = Math.cos(task.angleY);

    const center = {
      x: task.width / 2,
      y: task.height / 2,
    };
    const scale = task.zoom * 60;

    // Project atoms to 2D
    const projections = task.atoms
      .map((atom) => {
        const [x, y, z] = rotate(
          atom.x,
          atom.y,
          atom.z,
          sinX,
          cosX,
          sinY,
          cosY
        );

        const radius = vdwRadius(atom.element) * task.zoom * 16;

        return {
          x: center.x + x * scale,
          y: center.y - y * scale,
          z,
          element: atom.element,
          radius: Math.max(4, Math.min(30, radius)),
        };
      })
      .sort((a, b) => a.z - b.z); // Sort by depth

    // Calculate bonds (simplified distance-based)
    const bonds = [];
    for (let i = 0; i < task.atoms.length; i++) {
      for (let j = i + 1; j < task.atoms.length; j++) {
        const dx = projections[i].x - projections[j].x;
        const dy = projections[i].y - projections[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5 && dist < 150) {
          bonds.push({
            x1: projections[i].x,
            y1: projections[i].y,
            x2: projections[j].x,
            y2: projections[j].y,
          });
        }
      }
    }

    const result: RenderResult = {
      id: task.id,
      projections,
      bonds,
    };

    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      id: task.id,
      error: String(error),
    });
  }
};

export {};
