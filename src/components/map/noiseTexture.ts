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

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Bilinear-interpolates a random grid up to `targetSize`, wrapping indices at
 * the edges so the result tiles seamlessly (value at x=targetSize matches x=0).
 */
function upscaleWrapped(grid: number[][], gridSize: number, targetSize: number): Float32Array {
  const out = new Float32Array(targetSize * targetSize);

  for (let y = 0; y < targetSize; y++) {
    const gy = (y / targetSize) * gridSize;
    const gy0 = Math.floor(gy) % gridSize;
    const gy1 = (gy0 + 1) % gridSize;
    const sy = smoothstep(gy - Math.floor(gy));

    for (let x = 0; x < targetSize; x++) {
      const gx = (x / targetSize) * gridSize;
      const gx0 = Math.floor(gx) % gridSize;
      const gx1 = (gx0 + 1) % gridSize;
      const sx = smoothstep(gx - Math.floor(gx));

      const v00 = grid[gy0][gx0];
      const v10 = grid[gy0][gx1];
      const v01 = grid[gy1][gx0];
      const v11 = grid[gy1][gx1];

      const top = v00 + (v10 - v00) * sx;
      const bottom = v01 + (v11 - v01) * sx;
      out[y * targetSize + x] = top + (bottom - top) * sy;
    }
  }

  return out;
}

/** Seamlessly tileable multi-octave fractal noise, blended between two colors. */
export function createFractalNoiseCanvas(
  size: number,
  colorA: string,
  colorB: string,
): HTMLCanvasElement {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);

  const octaves = [
    { grid: 2, weight: 0.34 },
    { grid: 4, weight: 0.28 },
    { grid: 8, weight: 0.2 },
    { grid: 16, weight: 0.12 },
    { grid: 32, weight: 0.06 },
  ].map(({ grid, weight }) => ({
    data: upscaleWrapped(randomGrid(grid), grid, size),
    weight,
  }));

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d")!;
  const outData = octx.createImageData(size, size);

  const contrast = 1.5;

  for (let i = 0; i < size * size; i++) {
    let v = 0;
    for (const octave of octaves) {
      v += octave.data[i] * octave.weight;
    }
    v = 0.5 + (v - 0.5) * contrast;
    v = Math.min(1, Math.max(0, v));

    const idx = i * 4;
    outData.data[idx] = r1 + (r2 - r1) * v;
    outData.data[idx + 1] = g1 + (g2 - g1) * v;
    outData.data[idx + 2] = b1 + (b2 - b1) * v;
    outData.data[idx + 3] = 255;
  }

  octx.putImageData(outData, 0, 0);
  return out;
}
