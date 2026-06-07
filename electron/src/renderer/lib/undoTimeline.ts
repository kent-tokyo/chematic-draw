import { MoleculeDto } from '../store/types';

export interface UndoState {
  molecule: MoleculeDto;
  description: string;
  timestamp: number;
  branchId?: string; // for redo branching
}

export interface UndoTimeline {
  states: UndoState[];
  currentIndex: number;
  branchPoints: Map<number, UndoState[]>; // states created after undo
}

export function createTimeline(): UndoTimeline {
  return {
    states: [],
    currentIndex: -1,
    branchPoints: new Map(),
  };
}

export function pushState(timeline: UndoTimeline, molecule: MoleculeDto, description: string): void {
  // If not at the end, we're branching
  if (timeline.currentIndex < timeline.states.length - 1) {
    const branchPoint = timeline.currentIndex;
    timeline.branchPoints.set(branchPoint, timeline.states.slice(branchPoint + 1));
    // Discard redo states
    timeline.states = timeline.states.slice(0, timeline.currentIndex + 1);
  }

  timeline.states.push({
    molecule: JSON.parse(JSON.stringify(molecule)), // deep copy
    description,
    timestamp: Date.now(),
  });
  timeline.currentIndex = timeline.states.length - 1;
}

export function undo(timeline: UndoTimeline): MoleculeDto | null {
  if (timeline.currentIndex > 0) {
    timeline.currentIndex--;
    return timeline.states[timeline.currentIndex].molecule;
  }
  return null;
}

export function redo(timeline: UndoTimeline): MoleculeDto | null {
  if (timeline.currentIndex < timeline.states.length - 1) {
    timeline.currentIndex++;
    return timeline.states[timeline.currentIndex].molecule;
  }
  return null;
}

export function getStateDescription(timeline: UndoTimeline, index: number): string {
  if (index >= 0 && index < timeline.states.length) {
    return timeline.states[index].description;
  }
  return 'Unknown';
}

export function jumpToState(timeline: UndoTimeline, index: number): MoleculeDto | null {
  if (index >= 0 && index < timeline.states.length) {
    timeline.currentIndex = index;
    return timeline.states[index].molecule;
  }
  return null;
}
