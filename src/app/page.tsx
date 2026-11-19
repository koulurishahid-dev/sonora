'use client';

import dynamic from 'next/dynamic';

// Fast Loader with luxury purple glow & high-speed progress pulse
function FastAppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050309] text-white select-none px-6">
      {/* Background radial violet atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18)_0%,rgba(16,5,28,0.7)_55%,#050309_100%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Pulsing Backlight & Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#A855F7]/30 blur-3xl rounded-full scale-125 animate-pulse" style={{ animationDuration: '2s' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="NAA PAATALU"
            className="w-64 max-w-[80vw] h-auto object-contain relative z-10 drop-shadow-[0_0_30px_rgba(168,85,247,0.65)]"
          />
        </div>

        {/* High-speed gradient loading track */}
        <div className="w-48 sm:w-56 h-1.5 bg-[#171126] rounded-full overflow-hidden border border-[#302744] shadow-inner mb-3">
          <div className="h-full bg-gradient-to-r from-[#7026B9] via-[#A855F7] to-[#8BE9FF] rounded-full animate-loader-fast shadow-[0_0_12px_#A855F7]" />
        </div>

        <p className="text-xs text-[#D8B4FE] font-medium tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8BE9FF] animate-ping" />
          <span>Entering Music Sanctuary</span>
        </p>
        <span className="text-[10px] text-[#A99DBE] mt-1 font-mono">320kbps Hi-Res Audio • Dexie Engine</span>
      </div>
    </div>
  );
}

// Load AppLayout dynamically with ssr disabled to guarantee clean client-side IndexedDB & Web Audio execution
const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then(mod => mod.AppLayout),
  {
    ssr: false,
    loading: FastAppLoader,
  }
);

export default function Home() {
  return <AppLayout />;
}
