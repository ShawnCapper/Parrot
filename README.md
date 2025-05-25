# Parrot

Parrot is a front-end speech-to-text and text-to-speech (coming soon) interface with OpenAI models.

## Features

- **Speech-to-Text**: Upload audio files (MP3, MP4, WAV, M4A, WEBM, etc.) and transcribe speech using AI models:
  - Whisper 2
  - GPT-4o mini Transcribe
  - GPT-4o Transcribe
- **Text-to-Speech (Coming Soon)**: Convert text into natural-sounding audio.
- **Batch Transcription (Coming Soon)**: Transcribe multiple files at once.
- **Mode Toggle**: Switch between Speech-to-Text and Text-to-Speech modes.V
- **Result Actions**: Copy transcription to clipboard or download as a `.txt` file.
- **PWA Support**: Install Parrot as a standalone app on desktop or mobile.

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **UI**: React, Tailwind CSS
- **Icons**: Lucide React
- **API**: Next.js API Route (`/api/transcribe`) for server-side transcription
- **PWA**: Custom install prompt via `InstallPWA` component and service worker

## Prerequisites

- Node.js (v16 or later)
- npm or yarn

## Getting Started

1. Clone the repository:
   ```powershell
   git clone https://github.com/yourusername/parrot.git
   cd parrot
   ```
2. Install dependencies:
   ```powershell
   npm install
   # or
   yarn install
   ```
3. Create a `.env.local` file in the root and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Run the development server:
   ```powershell
   npm run dev
   # or
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Speech-to-Text

1. Upload an audio file by clicking or dragging it into the upload area.
2. Select your preferred AI model under "Transcription Settings".
3. Click **Transcribe Audio** and wait for the result.
4. Copy or download the transcription using the buttons in the results panel.

## PWA Installation

Click the install button in the header (visible on supported browsers) to install Parrot as a Progressive Web App.

## Project Structure

```
parrot/
├── public/           # Static assets & PWA manifest
├── src/
│   ├── app/          # Next.js App Router pages & API routes
│   │   ├── page.tsx  # Main UI
│   │   └── api/transcribe/route.ts
│   ├── components/   # Reusable React components
│   └── lib/          # Hooks & utility functions
├── README.md         # This file
├── package.json      # Project metadata & scripts
├── tailwind.config.ts# Tailwind CSS config
└── next.config.ts    # Next.js config
```
