/** Launch Handler / File Handling (Chromium, Edge). Not all browsers expose these. */

export interface LaunchParams {
  readonly targetURL: string;
  readonly files: readonly FileSystemFileHandle[];
}

export interface LaunchQueue {
  setConsumer(callback: (params: LaunchParams) => Promise<void>): void;
}

declare global {
  interface Window {
    launchQueue?: LaunchQueue;
  }
}

export {};
