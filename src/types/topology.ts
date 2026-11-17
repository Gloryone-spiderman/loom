export type ActionType = "node.create" | "node.move" | "node.rename" | "node.delete" | "view.zoom" | "view.pan";

export interface ActionLog {
  actionId: string;
  type: ActionType;
  timestamp: number;
  targetId?: string;
  before?: unknown;
  after?: unknown;
}
export interface CanvasNode {
  id: string;
  label: string;
  isLabelCustomized: boolean;
  x: number;
  y: number;
}

export interface DragState {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

export interface PanState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCameraX: number;
  startCameraY: number;
}
