declare module "node:url" {
  export const fileURLToPath: any;
}

declare const process: any;

interface ImportMeta {
  url: string;
}
