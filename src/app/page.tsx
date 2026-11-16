'use client';

import dynamic from 'next/dynamic';

// Load AppLayout dynamically with ssr disabled to guarantee clean client-side IndexedDB & Web Audio execution
const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then(mod => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0B0D] text-white">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-black font-extrabold text-xl shadow-2xl animate-pulse mb-4">
          S
        </div>
        <p className="text-sm font-semibold tracking-wider text-white">SONORA</p>
        <p className="text-xs text-[#71717A] mt-1">Initializing audio engine & library...</p>
      </div>
    ),
  }
);

export default function Home() {
  return <AppLayout />;
}
