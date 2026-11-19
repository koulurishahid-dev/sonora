'use client';

import dynamic from 'next/dynamic';

// Load AppLayout dynamically with ssr disabled to guarantee clean client-side IndexedDB & Web Audio execution
const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then(mod => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050309] text-white">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-600/30 blur-2xl rounded-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="NAA PAATALU"
            className="w-72 max-w-[85vw] h-auto object-contain relative z-10 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)] animate-pulse"
          />
        </div>
        <p className="text-xs text-[#A99DBE] mt-1 tracking-wide font-medium">Initializing audio sanctuary & library...</p>
      </div>
    ),
  }
);

export default function Home() {
  return <AppLayout />;
}
