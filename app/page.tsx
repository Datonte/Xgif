import GIFGallery from './components/GIFGallery';

export default function Home() {
  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Memecoin GIF Gallery
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Discover and download GIFs created by the community
        </p>
      </div>
      <GIFGallery />
    </div>
  );
}

