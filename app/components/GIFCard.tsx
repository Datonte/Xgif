'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

interface GIFCardProps {
  gif: {
    id: string;
    gifStoragePath: string;
    walletAddress: string;
    createdAt: number;
    downloadCount: number;
    originalFileName: string;
  };
}

export default function GIFCard({ gif }: GIFCardProps) {
  const { connected, publicKey } = useWallet();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!connected) {
      alert('Please connect your wallet to download');
      return;
    }

    setDownloading(true);
    try {
      if (!publicKey) throw new Error('Wallet not connected');
      
      // Try API download first
      const response = await fetch(`/api/download/${gif.id}`, {
        headers: {
          'x-wallet-address': publicKey.toString(),
        },
      });
      
      // If API fails, try direct download from public URL
      if (!response.ok) {
        // Fallback: download directly from the public URL
        const publicUrl = gif.gifStoragePath.startsWith('/') 
          ? gif.gifStoragePath 
          : '/' + gif.gifStoragePath;
        
        const a = document.createElement('a');
        a.href = publicUrl;
        a.download = `${gif.originalFileName.replace(/\.[^/.]+$/, '')}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Still try to increment download count
        try {
          await fetch(`/api/download/${gif.id}`, {
            method: 'HEAD',
            headers: {
              'x-wallet-address': publicKey.toString(),
            },
          });
        } catch (e) {
          // Ignore errors for count update
        }
        
        setDownloading(false);
        return;
      }
      
      // Check if response is a redirect
      if (response.redirected || response.status === 307 || response.status === 308) {
        const a = document.createElement('a');
        a.href = response.url;
        a.download = `${gif.originalFileName.replace(/\.[^/.]+$/, '')}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gif.originalFileName.replace(/\.[^/.]+$/, '')}.gif`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message || 'Failed to download GIF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        <img
          src={gif.gifStoragePath}
          alt={gif.originalFileName}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {truncateAddress(gif.walletAddress)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {formatDate(gif.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {gif.downloadCount} downloads
          </span>
          <button
            onClick={handleDownload}
            disabled={!connected || downloading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

