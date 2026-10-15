declare module "heic-decode" {
  interface Decoded {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  interface Lazy {
    /** Read from the header: known before any pixel is decoded. */
    width: number;
    height: number;
    decode(): Promise<Decoded>;
  }
  export function all(options: { buffer: Buffer | Uint8Array }): Promise<Lazy[] & { dispose(): void }>;
  export default function decode(options: { buffer: Buffer | Uint8Array }): Promise<Decoded>;
}
