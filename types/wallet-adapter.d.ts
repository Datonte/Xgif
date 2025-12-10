declare module '@solana/wallet-adapter-react' {
  export * from '@solana/wallet-adapter-react';
}

declare module '@solana/web3.js' {
  export function clusterApiUrl(network?: string): string;
  export class PublicKey {
    constructor(publicKey: string | Uint8Array);
    toBytes(): Uint8Array;
    toString(): string;
  }
}

