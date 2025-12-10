declare module '@solana/wallet-adapter-react' {
  export function useWallet(): {
    connected: boolean;
    publicKey: any;
    disconnect: () => Promise<void>;
    connect: () => Promise<void>;
    wallet: any;
    wallets: any[];
    select: (walletName: string) => void;
  };
  export function WalletProvider(props: any): JSX.Element;
  export function ConnectionProvider(props: any): JSX.Element;
}

declare module '@solana/wallet-adapter-react-ui' {
  export function WalletMultiButton(props: any): JSX.Element;
  export function WalletModalProvider(props: any): JSX.Element;
}

declare module '@solana/web3.js' {
  export function clusterApiUrl(network?: string): string;
  export class PublicKey {
    constructor(publicKey: string | Uint8Array);
    toBytes(): Uint8Array;
    toString(): string;
  }
}

