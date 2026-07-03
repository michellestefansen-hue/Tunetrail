"use client";

export function FilterPanel({
  radiusKm,
  onRadiusChange,
  hasUserLocation,
}: {
  radiusKm: number | null;
  onRadiusChange: (value: number | null) => void;
  hasUserLocation: boolean;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-[calc(env(safe-area-inset-top)+80px)] z-20 flex justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between text-sm text-white/80">
          <span>Radius fra din posisjon</span>
          <span className="font-medium text-[#FF2D78]">
            {radiusKm ? `${radiusKm} km` : "Alle"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={800}
          step={50}
          value={radiusKm ?? 800}
          onChange={(e) => {
            const value = Number(e.target.value);
            onRadiusChange(value >= 800 ? null : value);
          }}
          disabled={!hasUserLocation}
          className="mt-3 w-full accent-[#FF2D78]"
        />
        {!hasUserLocation && (
          <p className="mt-2 text-xs text-white/50">
            Gi tilgang til posisjonen din i nettleseren for å filtrere på avstand.
          </p>
        )}
      </div>
    </div>
  );
}
