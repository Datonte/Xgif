# XGIF - Memecoin GIF Platform

A fullstack Next.js application that allows users to upload images/memes, convert them to GIFs, and share them with the community. Built with Solana wallet authentication.

## Features

- 🔐 Solana wallet authentication (Phantom wallet)
- 📤 Image upload and GIF conversion
- 🖼️ Public gallery of all GIFs
- ⬇️ Download functionality (wallet required)
- 🌓 Light/Dark mode toggle
- 📱 Fully responsive design
- 🎨 Dynamic theme generation

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Phantom wallet integration)
- **Database**: Instant DB
- **Image Processing**: Sharp
- **Storage**: Local filesystem (public/uploads, public/gifs)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Phantom wallet browser extension

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd XGIF
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Connect Wallet**: Click the "Select Wallet" button and connect your Phantom wallet
2. **Upload Image**: Navigate to the Upload page and select an image file
3. **Convert to GIF**: The image will be automatically converted to GIF format
4. **View Gallery**: Browse all uploaded GIFs on the home page
5. **Download**: Connect your wallet to download any GIF

## Project Structure

```
XGIF/
├── app/
│   ├── api/          # API routes
│   ├── components/   # React components
│   ├── upload/       # Upload page
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── lib/
│   ├── db.ts         # Instant DB setup
│   ├── wallet.ts     # Wallet adapter config
│   ├── gif-converter.ts  # GIF conversion logic
│   └── auth.ts       # Wallet authentication
└── public/
    ├── uploads/      # Original images
    └── gifs/         # Converted GIFs
```

## Environment Variables

No environment variables required for basic setup. Instant DB app ID is configured in `lib/db.ts`.

## License

MIT

