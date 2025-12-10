import { init } from '@instantdb/react';

const APP_ID = '9d1c6596-a1f9-4353-9ab6-07d5ee378692';

// Instant DB schema definition
const schema = {
  users: {
    walletAddress: { type: 'string' as const },
    createdAt: { type: 'number' as const },
  },
  gifs: {
    walletAddress: { type: 'string' as const },
    originalFileName: { type: 'string' as const },
    gifStoragePath: { type: 'string' as const },
    originalStoragePath: { type: 'string' as const, optional: true },
    createdAt: { type: 'number' as const },
    downloadCount: { type: 'number' as const },
    metadata: { type: 'json' as const, optional: true },
  },
};

// Client-side Instant DB - using simplified schema format
export const db = init({ appId: APP_ID });

// For server-side operations, we'll use a simple in-memory store
// In production with Instant DB, you'd use their admin API or client-side mutations
// Using a global variable to ensure persistence across requests in the same server instance
declare global {
  var gifsStore: any[] | undefined;
}

if (!global.gifsStore) {
  global.gifsStore = [];
}

const gifsStore = global.gifsStore;

export async function createGIF(gifData: {
  walletAddress: string;
  originalFileName: string;
  gifStoragePath: string;
  originalStoragePath?: string;
  createdAt: number;
  downloadCount: number;
  metadata?: any;
}) {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const gif = { ...gifData, id };
  gifsStore.push(gif);
  console.log('GIF added to store. Total GIFs:', gifsStore.length);
  console.log('GIF data:', JSON.stringify(gif, null, 2));
  return gif;
}

export async function getGIFs() {
  const sorted = gifsStore.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  console.log('Fetching GIFs. Total in store:', gifsStore.length);
  return { gifs: sorted };
}

export async function getGIFById(id: string) {
  return gifsStore.find(g => g.id === id);
}

export async function updateGIF(gifId: string, updates: Partial<{
  downloadCount: number;
}>) {
  const gif = gifsStore.find(g => g.id === gifId);
  if (gif) {
    Object.assign(gif, updates);
    return gif;
  }
  throw new Error('GIF not found');
}

export type User = typeof schema.users;
export type GIF = typeof schema.gifs;
