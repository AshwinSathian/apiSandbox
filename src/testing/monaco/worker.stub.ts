const WorkerStub = class {
  onmessage: ((this: Worker, ev: MessageEvent) => void) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => void) | null = null;

  postMessage(): void {}
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }
} as unknown as typeof Worker;

export default WorkerStub;
