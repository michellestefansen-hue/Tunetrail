export function Header() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-auto flex w-full items-center gap-2 border-b border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="font-heading text-lg text-[#FEE3CA]">Tunetrail</span>
      </div>
    </div>
  );
}
