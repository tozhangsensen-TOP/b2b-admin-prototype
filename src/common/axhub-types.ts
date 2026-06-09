// Axure API type definitions for warehouse-3d component
export interface KeyDesc {
  name: string;
  desc: string;
}

export interface DataDesc {
  name: string;
  desc: string;
  type?: string;
}

export interface ConfigItem {
  type: 'input' | 'select' | 'switch';
  attributeId: string;
  displayName: string;
  info?: string;
  initialValue?: unknown;
  options?: { label: string; value: unknown }[];
}

export interface Action {
  name: string;
  desc: string;
}

export interface EventItem {
  name: string;
  desc: string;
}

export interface AxhubProps {
  speed?: number;
  rackHeight?: number;
  jobType?: string;
  onStatusChange?: (text: string, step: string) => void;
  onAnimationEnd?: () => void;
  onProgress?: (pct: number) => void;
}

export interface AxhubHandle {
  start: () => void;
  reset: () => void;
  pause: () => void;
}
