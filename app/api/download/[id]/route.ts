import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getGIFById, updateGIF } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const gifId = params.id;

    // Get GIF from database
    let gif = await getGIFById(gifId);

    // If not found in in-memory store, try fetching all GIFs and finding by ID
    if (!gif) {
      const { getGIFs } = await import('@/lib/db');
      const allGIFs = await getGIFs();
      gif = allGIFs.gifs?.find((g: any) => g.id === gifId);
    }

    if (!gif) {
      console.error('GIF not found in database. ID:', gifId);
      return NextResponse.json(
        { error: 'GIF not found', id: gifId },
        { status: 404 }
      );
    }

    // Increment download count
    await updateGIF(gifId, {
      downloadCount: (gif.downloadCount || 0) + 1,
    });

    // Read and return the GIF file
    // gifStoragePath should be like "/gifs/filename.gif" or "gifs/filename.gif"
    let gifPath = gif.gifStoragePath;
    if (!gifPath.startsWith('/')) {
      gifPath = '/' + gifPath;
    }
    
    // Remove leading slash for file system path
    const fileSystemPath = gifPath.startsWith('/') ? gifPath.slice(1) : gifPath;
    const fullPath = join(process.cwd(), 'public', fileSystemPath);
    
    try {
      const fileBuffer = await readFile(fullPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/gif',
          'Content-Disposition': `attachment; filename="${gif.originalFileName.replace(/\.[^/.]+$/, '')}.gif"`,
        },
      });
    } catch (fileError: any) {
      console.error('File read error:', fileError);
      console.error('Attempted path:', fullPath);
      console.error('GIF storage path:', gif.gifStoragePath);
      console.error('GIF data:', JSON.stringify(gif, null, 2));
      
      // If file doesn't exist at expected path, try alternative paths
      const alternativePaths = [
        join(process.cwd(), 'public', 'gifs', gifPath.split('/').pop() || ''),
        join(process.cwd(), 'public', gifPath),
      ];
      
      for (const altPath of alternativePaths) {
        try {
          const fileBuffer = await readFile(altPath);
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'image/gif',
              'Content-Disposition': `attachment; filename="${gif.originalFileName.replace(/\.[^/.]+$/, '')}.gif"`,
            },
          });
        } catch (e) {
          // Try next path
        }
      }
      
      // Last resort: redirect to public URL (browser will handle download)
      if (gif.gifStoragePath) {
        const publicUrl = gif.gifStoragePath.startsWith('/') 
          ? gif.gifStoragePath 
          : '/' + gif.gifStoragePath;
        
        // Create a response that triggers download
        return NextResponse.redirect(new URL(publicUrl, request.url));
      }
      
      return NextResponse.json(
        { error: 'GIF file not found', path: fullPath, storagePath: gif.gifStoragePath },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download GIF' },
      { status: 500 }
    );
  }
}

