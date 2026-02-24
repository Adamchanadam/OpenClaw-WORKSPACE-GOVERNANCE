declare module "node:url" {
  export const fileURLToPath: any;
}

declare const process: any;

declare function fetch(url: string, init?: { signal?: AbortSignal }): Promise<{ ok: boolean; json(): Promise<any> }>;
declare function setTimeout(callback: (...args: any[]) => void, ms: number): any;
declare function clearTimeout(id: any): void;
declare class AbortController {
  signal: AbortSignal;
  abort(): void;
}
declare interface AbortSignal {}

interface ImportMeta {
  url: string;
}
