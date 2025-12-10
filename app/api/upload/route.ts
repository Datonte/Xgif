import { NextRequest, NextResponse } from 'next/server';
import { convertImageToGIF } from '@/lib/gif-converter';
import { createGIF } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const walletAddress = formData.get('walletAddress') as string;
    const animationSettingsStr = formData.get('animationSettings') as string;
    const textOverlaysStr = formData.get('textOverlays') as string;
    
    let animationSettings = null;
    let textOverlays = [];
    
    try {
      if (animationSettingsStr) {
        animationSettings = JSON.parse(animationSettingsStr);
      }
      if (textOverlaysStr) {
        textOverlays = JSON.parse(textOverlaysStr);
      }
    } catch (e) {
      console.error('Error parsing animation settings:', e);
    }

    if (!file || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing file or wallet address' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate and filter text overlays
    const validTextOverlays = (textOverlays || []).filter((overlay: any) => {
      return overlay && 
             overlay.text && 
             typeof overlay.text === 'string' && 
             overlay.text.trim() !== '' &&
             typeof overlay.x === 'number' &&
             typeof overlay.y === 'number' &&
             overlay.x >= 0 && overlay.x <= 100 &&
             overlay.y >= 0 && overlay.y <= 100;
    });
    
    // Log text overlays for debugging
    console.log('Text overlays received:', JSON.stringify(validTextOverlays, null, 2));
    
    // Convert to animated GIF with settings
    const { gifPath, originalPath, metadata } = await convertImageToGIF(
      buffer,
      file.name,
      animationSettings || undefined,
      validTextOverlays
    );

    // Save to Instant DB
    const gifData = {
      walletAddress,
      originalFileName: file.name,
      gifStoragePath: gifPath,
      originalStoragePath: originalPath,
      createdAt: Date.now(),
      downloadCount: 0,
      metadata,
    };

    // Create GIF in database using server-side API
    const { createGIF } = await import('@/lib/db');
    const result = await createGIF(gifData);

    console.log('GIF created in database:', result);

    // Verify the GIF was created
    if (!result || !result.id) {
      throw new Error('Failed to save GIF to database');
    }

    return NextResponse.json({
      success: true,
      gif: {
        ...gifData,
        id: result.id,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload and convert image' },
      { status: 500 }
    );
  }
}

