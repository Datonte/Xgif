import UploadForm from '../components/UploadForm';

export default function UploadPage() {
  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Upload & Convert to GIF
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Connect your Solana wallet and upload an image to convert it to a GIF
        </p>
      </div>
      <UploadForm />
    </div>
  );
}

