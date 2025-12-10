declare module 'gifencoder' {
  import { Readable } from 'stream';

  export default class GIFEncoder {
    constructor(width: number, height: number);
    start(): void;
    setRepeat(repeat: number): void;
    setDelay(delay: number): void;
    setQuality(quality: number): void;
    addFrame(frameData: Buffer): void;
    finish(): void;
    createReadStream(): Readable;
  }
}

