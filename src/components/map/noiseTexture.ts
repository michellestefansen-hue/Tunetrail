function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

function randomGrid(gridSize: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < gridSize; y++) {
    grid.push(Array.from({ length: gridSize }, () => Math.random()));
  }
  return grid;
}

function upscaleGrid(grid: number[][], gridSize: number, targetSize: number): Uint8ClampedArray {
  const small = document.createElement("canvas");
  small.width = gridSize;
  small.height = gridSize;
  const sctx = small.getContext("2d")!;
  const imgData = sctx.createImageData(gridSize, gridSize);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const v = Math.floor(grid[y][x] * 255);
      const idx = (y * gridSize + x) * 4;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v;
      imgData.data[idx + 2] = v;
      imgData.data[idx + 3] = 255;
    }
  }
  sctx.putImageData(imgData, 0, 0);

  const big = document.createElement("canvas");
  big.width = targetSize;
  big.height = targetSize;
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, targetSize, targetSize);
  return bctx.getImageData(0, 0, targetSize, targetSize).data;
}

/** Turbulent multi-octave fractal noise, blended between two colors with boosted contrast. */
export function createFractalNoiseCanvas(
  size: number,
  colorA: string,
  colorB: string,
): HTMLCanvasElement {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);

  const octaves = [
    { grid: 3, weight: 0.26 },
    { grid: 6, weight: 0.24 },
    { grid: 12, weight: 0.2 },
    { grid: 24, weight: 0.16 },
    { grid: 48, weight: 0.14 },
  ].map(({ grid, weight }) => ({
    data: upscaleGrid(randomGrid(grid), grid, size),
    weight,
  }));

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d")!;
  const outData = octx.createImageData(size, size);

  const contrast = 2.1;

  for (let i = 0; i < size * size; i++) {
    const idx = i * 4;
    let v = 0;
    for (const octave of octaves) {
      v += (octave.data[idx] / 255) * octave.weight;
    }
    // Punch up contrast around the midpoint, like turbulent cloud noise.
    v = 0.5 + (v - 0.5) * contrast;
    v = Math.min(1, Math.max(0, v));

    outData.data[idx] = r1 + (r2 - r1) * v;
    outData.data[idx + 1] = g1 + (g2 - g1) * v;
    outData.data[idx + 2] = b1 + (b2 - b1) * v;
    outData.data[idx + 3] = 255;
  }

  octx.putImageData(outData, 0, 0);
  return out;
}
