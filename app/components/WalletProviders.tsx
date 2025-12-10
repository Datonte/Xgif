'use client';

import { WalletContextProvider } from '@/lib/wallet';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletContextProvider>
  );
}

