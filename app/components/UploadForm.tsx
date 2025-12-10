'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GIFEditor, { AnimationSettings, TextOverlay } from './GIFEditor';

export default function UploadForm() {
  const { connected, publicKey } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'zoom',
    duration: 3,
    loopCount: 0,
    frameRate: 15,
  });
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!connected || !publicKey || !file) {
      setError('Please connect your wallet and select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('walletAddress', publicKey.toString());
      formData.append('animationSettings', JSON.stringify(animationSettings));
      formData.append('textOverlays', JSON.stringify(textOverlays));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Upload failed - no success response');
      }

      // Log success for debugging
      console.log('Upload successful:', result);

      // Show success message
      setSuccess(true);
      setError(null);

      // Wait a moment to ensure data is saved and user sees success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to home page
      router.push('/');
      // Force a hard refresh to ensure new GIFs are loaded
      window.location.href = '/';
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
          Please connect your wallet to upload images
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {file?.name}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              PNG, JPG, WEBP up to 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
          GIF created successfully! Redirecting...
        </div>
      )}

      {file && preview && (
        <>
          <GIFEditor
            imagePreview={preview}
            onSettingsChange={({ animation, textOverlays }) => {
              setAnimationSettings(animation);
              setTextOverlays(textOverlays);
            }}
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {uploading ? 'Creating Animated GIF...' : 'Create Animated GIF & Upload'}
          </button>
        </>
      )}
    </div>
  );
}

