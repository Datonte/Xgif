'use client';

import { useEffect, useState } from 'react';
import GIFCard from './GIFCard';

export default function GIFGallery() {
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGIFs() {
      try {
        const response = await fetch('/api/gifs');
        const data = await response.json();
        setGifs(data.gifs || []);
      } catch (error) {
        console.error('Error fetching GIFs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGIFs();
    
    // Refresh every 5 seconds to get new GIFs
    const interval = setInterval(fetchGIFs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (gifs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No GIFs yet. Be the first to upload one!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {gifs.map((gif) => (
        <GIFCard key={gif.id} gif={gif} />
      ))}
    </div>
  );
}

