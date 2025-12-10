import { NextResponse } from 'next/server';
import { getGIFs } from '@/lib/db';

export async function GET() {
  try {
    const gifsData = await getGIFs();

    // Sort by creation date (newest first)
    const sortedGifs = (gifsData.gifs || []).sort(
      (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
    );

    // Ensure all GIFs have an id
    const gifsWithIds = sortedGifs.map((gif: any) => ({
      ...gif,
      id: gif.id || gif.gifStoragePath?.split('/').pop()?.replace('.gif', '') || Date.now().toString(),
    }));

    return NextResponse.json({ gifs: gifsWithIds });
  } catch (error: any) {
    console.error('Error fetching GIFs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GIFs' },
      { status: 500 }
    );
  }
}

