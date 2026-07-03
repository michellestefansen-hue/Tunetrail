"use client";

export function FilterPanel({
  radiusKm,
  onRadiusChange,
  hasCenter,
  positionMode,
  onUseGpsPosition,
  onStartPickingLocation,
  pickingLocation,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  radiusKm: number | null;
  onRadiusChange: (value: number | null) => void;
  hasCenter: boolean;
  positionMode: "gps" | "manual" | null;
  onUseGpsPosition: () => void;
  onStartPickingLocation: () => void;
  pickingLocation: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-[calc(env(safe-area-inset-top)+80px)] z-20 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-black/50 p-4 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Radius fra posisjon</span>
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
            disabled={!hasCenter}
            className="mt-3 w-full accent-[#FF2D78]"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onUseGpsPosition}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                positionMode === "gps"
                  ? "bg-[#FF2D78] text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Min posisjon
            </button>
            <button
              type="button"
              onClick={onStartPickingLocation}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                positionMode === "manual"
                  ? "bg-[#FF2D78] text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Velg på kartet
            </button>
          </div>

          {pickingLocation && (
            <p className="mt-2 text-xs text-[#FEE3CA]">
              Trykk et sted på kartet for å sette posisjon.
            </p>
          )}
          {!hasCenter && !pickingLocation && (
            <p className="mt-2 text-xs text-white/50">
              Velg posisjonen din for å filtrere på avstand.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <span className="text-sm text-white/80">Datoperiode</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onDateFromChange(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none"
            />
            <span className="text-white/40">–</span>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onDateToChange(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                onDateFromChange(null);
                onDateToChange(null);
              }}
              className="mt-2 text-xs text-white/50 underline"
            >
              Nullstill datoer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
