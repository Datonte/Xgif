import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs';
import { promisify } from 'util';
const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);
import { join } from 'path';
import GIFEncoder from 'gifencoder';
import { PNG } from 'pngjs';
import { createWriteStream } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const GIF_DIR = join(process.cwd(), 'public', 'gifs');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await mkdirAsync(UPLOAD_DIR, { recursive: true } as any);
    await mkdirAsync(GIF_DIR, { recursive: true } as any);
  } catch (error) {
    // Directories might already exist
  }
}

interface AnimationSettings {
  type: 'none' | 'zoom' | 'pan' | 'fade' | 'bounce' | 'rotate' | 'pulse' | 'shake';
  duration: number;
  loopCount: number;
  frameRate: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  textAnimation?: 'none' | 'fade' | 'slide' | 'bounce';
  rotation?: number; // degrees
  width?: number; // percentage (0-100)
  height?: number; // percentage (0-100)
}

// Helper to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

// Create text overlay SVG
function createTextSVG(text: TextOverlay, width: number, height: number, progress: number = 0): string {
  const rgb = hexToRgb(text.color);
  // Convert percentage to pixels
  let x = (text.x / 100) * width;
  let y = (text.y / 100) * height;
  let opacity = 1;
  const rotation = text.rotation || 0;
  const fontSize = Math.max(12, Math.min(200, text.fontSize || 24));

  // Apply text animation
  if (text.textAnimation === 'fade') {
    opacity = 0.5 + Math.sin(progress * Math.PI * 2) * 0.5;
  } else if (text.textAnimation === 'slide') {
    x += Math.sin(progress * Math.PI * 2) * (width * 0.1);
  } else if (text.textAnimation === 'bounce') {
    y -= Math.abs(Math.sin(progress * Math.PI * 4)) * (height * 0.05);
  }

  const textAnchor = text.textAlign === 'center' ? 'middle' : text.textAlign === 'right' ? 'end' : 'start';
  
  // Ensure text is properly escaped for SVG
  const escapedText = text.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Calculate stroke color (black or white for contrast)
  const brightness = (rgb.r + rgb.g + rgb.b) / 3;
  const strokeColor = brightness > 128 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
  const strokeWidth = Math.max(2, Math.round(fontSize / 12));
  
  // Ensure text is within bounds - but allow it to be visible
  x = Math.max(fontSize * 0.5, Math.min(x, width - fontSize * 0.5));
  y = Math.max(fontSize, Math.min(y, height - fontSize * 0.5));
  
  // Create SVG with proper viewBox and ensure text is visible
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
      <feOffset dx="1" dy="1" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g transform="translate(${x}, ${y}) rotate(${rotation})">
    <text
      x="0"
      y="0"
      font-family="${text.fontFamily}, Arial, sans-serif"
      font-size="${fontSize}"
      font-weight="bold"
      fill="rgb(${rgb.r}, ${rgb.g}, ${rgb.b})"
      stroke="${strokeColor}"
      stroke-width="${strokeWidth}"
      stroke-linejoin="round"
      stroke-linecap="round"
      text-anchor="${textAnchor}"
      opacity="${opacity}"
      dominant-baseline="middle"
      paint-order="stroke fill"
      filter="url(#text-shadow)"
    >${escapedText}</text>
  </g>
</svg>`;
}

export async function convertImageToGIF(
  imageBuffer: Buffer,
  originalFileName: string,
  animationSettings?: AnimationSettings,
  textOverlays: TextOverlay[] = []
): Promise<{ gifPath: string; originalPath: string; metadata: any }> {
  try {
    await ensureDirectories();

    const fileId = uuidv4();
    const originalExt = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
    const originalPath = join(UPLOAD_DIR, `${fileId}.${originalExt}`);
    const gifPath = join(GIF_DIR, `${fileId}.gif`);

    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer');
    }

    // Save original file
    await writeFileAsync(originalPath, imageBuffer);

    // Get image metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }
    
    const width = metadata.width;
    const height = metadata.height;
    
    // Validate dimensions
    if (width <= 0 || height <= 0 || width > 10000 || height > 10000) {
      throw new Error(`Invalid image dimensions: ${width}x${height}`);
    }

    // If no animation settings, create a simple static GIF with text
    if (!animationSettings || animationSettings.type === 'none') {
    // Resize image to exact dimensions (maintaining aspect ratio, then padding if needed)
    let finalImage = image.resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });

    // Add text overlays
    if (textOverlays.length > 0) {
      const composites = [];
      
      for (const text of textOverlays) {
        if (!text.text || text.text.trim() === '') continue; // Skip empty text
        
        const textSVG = createTextSVG(text, width, height, 0);
        try {
          // Convert SVG to PNG buffer with exact dimensions
          const textBuffer = await sharp(Buffer.from(textSVG), {
            density: 300, // Higher density for better text rendering
          })
            .resize(width, height, { fit: 'fill' })
            .png()
            .toBuffer();
          
          composites.push({
            input: textBuffer,
            blend: 'over' as const,
          });
        } catch (error) {
          console.error('Error creating text overlay:', error, text);
        }
      }
      
      if (composites.length > 0) {
        finalImage = finalImage.composite(composites);
      }
    }

      await finalImage.gif().toFile(gifPath);
      return {
        gifPath: `/gifs/${fileId}.gif`,
        originalPath: `/uploads/${fileId}.${originalExt}`,
        metadata: {
          width,
          height,
          size: imageBuffer.length,
        },
      };
    }

    // Create animated GIF with multiple frames using gifencoder
    const totalFrames = Math.max(2, Math.min(animationSettings.duration * animationSettings.frameRate, 60));
    const frameDelay = Math.round(1000 / animationSettings.frameRate);

    // Create GIF encoder
    const encoder = new GIFEncoder(width, height);
    encoder.start();
    encoder.setRepeat(animationSettings.loopCount === 0 ? 0 : animationSettings.loopCount);
    encoder.setDelay(frameDelay);
    encoder.setQuality(10);

    const stream = encoder.createReadStream();
    const writeStream = createWriteStream(gifPath);
    stream.pipe(writeStream);

    // Generate and add frames
    for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / (totalFrames - 1);
    let frameImage = sharp(imageBuffer);

    // Apply animation transformation
    switch (animationSettings.type) {
      case 'zoom':
        // Use double resize instead of extract - more reliable and avoids extract_area errors
        const zoomScale = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
        const zoomedWidth = Math.max(width, Math.round(width * zoomScale));
        const zoomedHeight = Math.max(height, Math.round(height * zoomScale));
        
        frameImage = frameImage
          .resize(zoomedWidth, zoomedHeight, { fit: 'cover', position: 'center' })
          .resize(width, height, { fit: 'cover' });
        break;

      case 'pan':
        const panX = Math.sin(progress * Math.PI * 2) * 0.15;
        const panY = Math.cos(progress * Math.PI * 2) * 0.15;
        
        // Calculate crop area with proper bounds checking
        const panOffsetX = Math.round(panX * width);
        const panOffsetY = Math.round(panY * height);
        const cropRatio = 0.85; // Crop to 85% of image
        const cropWidth = Math.floor(Math.max(width * 0.5, width * cropRatio));
        const cropHeight = Math.floor(Math.max(height * 0.5, height * cropRatio));
        
        // Calculate center position with pan offset, ensuring we stay within bounds
        const centerX = Math.floor((width - cropWidth) / 2);
        const centerY = Math.floor((height - cropHeight) / 2);
        const panLeft = Math.floor(Math.max(0, Math.min(width - cropWidth, centerX + panOffsetX)));
        const panTop = Math.floor(Math.max(0, Math.min(height - cropHeight, centerY + panOffsetY)));
        
        // Final validation - ensure all values are integers and within bounds
        const finalPanLeft = Math.max(0, Math.min(panLeft, width - 1));
        const finalPanTop = Math.max(0, Math.min(panTop, height - 1));
        const finalPanWidth = Math.max(1, Math.min(cropWidth, width - finalPanLeft));
        const finalPanHeight = Math.max(1, Math.min(cropHeight, height - finalPanTop));
        
        if (finalPanLeft >= 0 && finalPanTop >= 0 && 
            finalPanWidth > 0 && finalPanHeight > 0 &&
            finalPanLeft + finalPanWidth <= width &&
            finalPanTop + finalPanHeight <= height) {
          frameImage = frameImage.extract({
            left: finalPanLeft,
            top: finalPanTop,
            width: finalPanWidth,
            height: finalPanHeight,
          }).resize(width, height);
        } else {
          // Fallback: just resize if extract would fail
          frameImage = frameImage.resize(width, height, { fit: 'cover' });
        }
        break;

      case 'fade':
        const alpha = 0.3 + Math.sin(progress * Math.PI * 2) * 0.7;
        frameImage = frameImage.modulate({
          brightness: alpha,
        });
        break;

      case 'rotate':
        const angle = progress * 360;
        frameImage = frameImage.rotate(angle, {
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        });
        break;

      case 'pulse':
        // Use double resize instead of extract - more reliable and avoids extract_area errors
        const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.15;
        const pulsedWidth = Math.max(width, Math.round(width * pulseScale));
        const pulsedHeight = Math.max(height, Math.round(height * pulseScale));
        
        frameImage = frameImage
          .resize(pulsedWidth, pulsedHeight, { fit: 'cover', position: 'center' })
          .resize(width, height, { fit: 'cover' });
        break;

      case 'bounce':
        const bounceY = Math.abs(Math.sin(progress * Math.PI * 4)) * height * 0.15;
        // Use floor to ensure integer values
        const bounceTop = Math.floor(Math.max(0, Math.min(height - 1, bounceY)));
        const bounceHeight = Math.floor(Math.max(1, Math.min(height, height - bounceY)));
        
        // Final validation with integer values
        const finalBounceTop = Math.max(0, Math.min(bounceTop, height - 1));
        const finalBounceHeight = Math.max(1, Math.min(bounceHeight, height - finalBounceTop));
        
        // Validate extract area
        if (finalBounceTop >= 0 && finalBounceHeight > 0 && 
            finalBounceTop + finalBounceHeight <= height) {
          frameImage = frameImage.extract({
            left: 0,
            top: finalBounceTop,
            width: width,
            height: finalBounceHeight,
          }).resize(width, height);
        } else {
          // Fallback: just resize if extract would fail
          frameImage = frameImage.resize(width, height, { fit: 'cover' });
        }
        break;

      case 'shake':
        // Use smaller shake amount and ensure integer values
        const shakeX = (Math.random() - 0.5) * width * 0.03;
        const shakeY = (Math.random() - 0.5) * height * 0.03;
        
        // Calculate shake offset with padding to stay within bounds
        const padding = Math.floor(Math.min(width, height) * 0.02);
        const shakeOffsetX = Math.floor(Math.abs(shakeX));
        const shakeOffsetY = Math.floor(Math.abs(shakeY));
        
        const shakeLeft = Math.floor(Math.max(padding, Math.min(width - padding, shakeOffsetX + padding)));
        const shakeTop = Math.floor(Math.max(padding, Math.min(height - padding, shakeOffsetY + padding)));
        const shakeWidth = Math.floor(Math.max(1, Math.min(width - shakeLeft * 2, width - padding * 2)));
        const shakeHeight = Math.floor(Math.max(1, Math.min(height - shakeTop * 2, height - padding * 2)));
        
        // Final validation with integer values
        const finalShakeLeft = Math.max(0, Math.min(shakeLeft, width - 1));
        const finalShakeTop = Math.max(0, Math.min(shakeTop, height - 1));
        const finalShakeWidth = Math.max(1, Math.min(shakeWidth, width - finalShakeLeft));
        const finalShakeHeight = Math.max(1, Math.min(shakeHeight, height - finalShakeTop));
        
        // Validate extract area
        if (finalShakeLeft >= 0 && finalShakeTop >= 0 && 
            finalShakeWidth > 0 && finalShakeHeight > 0 &&
            finalShakeLeft + finalShakeWidth <= width &&
            finalShakeTop + finalShakeHeight <= height) {
          frameImage = frameImage.extract({
            left: finalShakeLeft,
            top: finalShakeTop,
            width: finalShakeWidth,
            height: finalShakeHeight,
          }).resize(width, height);
        } else {
          // Fallback: just resize if extract would fail
          frameImage = frameImage.resize(width, height, { fit: 'cover' });
        }
        break;
    }

      // Ensure frame is exactly the right size before adding text
      frameImage = frameImage.resize(width, height, { fit: 'cover' });

      // Add text overlays to frame
      if (textOverlays.length > 0) {
        const composites = [];
        
        for (const text of textOverlays) {
          if (!text.text || text.text.trim() === '') continue; // Skip empty text
          
          const textSVG = createTextSVG(text, width, height, progress);
          try {
            // Convert SVG to PNG buffer with exact dimensions
            const textBuffer = await sharp(Buffer.from(textSVG), {
              density: 300, // Higher density for better text rendering
            })
              .resize(width, height, { fit: 'fill' })
              .png()
              .toBuffer();
            
            composites.push({
              input: textBuffer,
              blend: 'over' as const,
            });
          } catch (error) {
            console.error('Error creating text overlay:', error, text);
          }
        }
        
        if (composites.length > 0) {
          frameImage = frameImage.composite(composites);
        }
      }

      // Convert frame to PNG buffer for gifencoder
      const framePngBuffer = await frameImage.png().toBuffer();
      const png = PNG.sync.read(framePngBuffer);
      
      // Add frame to encoder
      encoder.addFrame(png.data);
    }

    // Finish encoding
    encoder.finish();

    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    const finalMetadata = await sharp(gifPath).metadata().catch(() => ({ size: 0 }));

    return {
      gifPath: `/gifs/${fileId}.gif`,
      originalPath: `/uploads/${fileId}.${originalExt}`,
      metadata: {
        width,
        height,
        size: finalMetadata.size || imageBuffer.length,
        frames: totalFrames,
        animationType: animationSettings.type,
      },
    };
  } catch (error: any) {
    console.error('Error in convertImageToGIF:', error);
    // Provide more specific error messages
    if (error.message && error.message.includes('extract_area')) {
      throw new Error('Image processing error: Invalid crop area. Please try a different image or animation type.');
    }
    if (error.message && error.message.includes('Input buffer')) {
      throw new Error('Image processing error: Invalid image format. Please ensure the image is valid.');
    }
    throw new Error(error.message || 'Failed to convert image to GIF');
  }
}
