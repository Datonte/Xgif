'use client';

export default function ContractAddress() {
  const contractAddress = 'XGIF...ADDRESS';

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
  };

  return (
    <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span>Contract:</span>
      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
        {contractAddress}
      </code>
      <button
        onClick={handleCopy}
        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
      >
        Copy
      </button>
    </div>
  );
}

