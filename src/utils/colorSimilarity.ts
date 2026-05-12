type RgbColor = {
  r: number;
  g: number;
  b: number;
};

const maxRgbDistance = Math.sqrt(255 ** 2 * 3);

export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace('#', '').trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function getColorSimilarity(firstHex: string, secondHex: string): number {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  const distance = Math.sqrt((first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2);

  return Math.max(0, Math.min(100, Math.round((1 - distance / maxRgbDistance) * 100)));
}
