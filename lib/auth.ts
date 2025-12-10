import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';

export async function verifyWalletSignature(
  message: string,
  signature: Uint8Array,
  publicKey: string
): Promise<boolean> {
  try {
    const publicKeyObj = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify the signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signature,
      publicKeyObj.toBytes()
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function generateAuthMessage(walletAddress: string): string {
  return `Sign this message to authenticate with XGIF.\n\nWallet: ${walletAddress}\n\nTimestamp: ${Date.now()}`;
}

