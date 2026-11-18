// Lightweight client-side dominant color extractor for artwork with Midnight Purple & Electric Lavender harmonization
export interface ExtractedColors {
  primary: string;       // Vibrant dominant hex (harmonized)
  secondary: string;     // Complementary or mid-tone hex
  glow: string;          // Semi-transparent rgba for shadows & glow
  ambientRgb: string;    // 'r, g, b' for CSS variables
}

const DEFAULT_COLORS: ExtractedColors = {
  primary: '#A78BFA',
  secondary: '#D8B4FE',
  glow: 'rgba(167, 139, 250, 0.25)',
  ambientRgb: '167, 139, 250',
};

const colorCache = new Map<string, ExtractedColors>();

export function extractColorsFromImage(imgUrl?: string): Promise<ExtractedColors> {
  if (!imgUrl) return Promise.resolve(DEFAULT_COLORS);
  if (colorCache.has(imgUrl)) return Promise.resolve(colorCache.get(imgUrl)!);

  return new Promise(resolve => {
    if (typeof window === 'undefined') {
      return resolve(DEFAULT_COLORS);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_COLORS);

        // Sample down to 32x32 for high performance
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);

        const imgData = ctx.getImageData(0, 0, 32, 32).data;
        let rSum = 0, gSum = 0, bSum = 0;
        let maxSat = 0;
        let satR = 167, satG = 139, satB = 250;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip near-transparent or extreme dark/light
          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 510;
          if (l < 0.12 || l > 0.88) continue;

          // Saturation
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;

          rSum += r;
          gSum += g;
          bSum += b;
          count++;

          if (sat > maxSat) {
            maxSat = sat;
            satR = r;
            satG = g;
            satB = b;
          }
        }

        if (count === 0) {
          colorCache.set(imgUrl, DEFAULT_COLORS);
          return resolve(DEFAULT_COLORS);
        }

        const rawR = maxSat > 0.25 ? satR : Math.round(rSum / count);
        const rawG = maxSat > 0.25 ? satG : Math.round(gSum / count);
        const rawB = maxSat > 0.25 ? satB : Math.round(bSum / count);

        // Harmonize 65% extracted artwork hue with 35% Electric Lavender (#A78BFA: 167, 139, 250)
        // This derives secondary ambient atmosphere from artwork without breaking the midnight purple palette
        const pR = Math.round(rawR * 0.65 + 167 * 0.35);
        const pG = Math.round(rawG * 0.65 + 139 * 0.35);
        const pB = Math.round(rawB * 0.65 + 250 * 0.35);

        const secR = Math.round(rawR * 0.4 + 216 * 0.6);
        const secG = Math.round(rawG * 0.4 + 180 * 0.6);
        const secB = Math.round(rawB * 0.4 + 254 * 0.6);

        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        const primaryHex = `#${toHex(pR)}${toHex(pG)}${toHex(pB)}`;
        const secHex = `#${toHex(secR)}${toHex(secG)}${toHex(secB)}`;

        const result: ExtractedColors = {
          primary: primaryHex,
          secondary: secHex,
          glow: `rgba(${pR}, ${pG}, ${pB}, 0.25)`,
          ambientRgb: `${pR}, ${pG}, ${pB}`,
        };

        colorCache.set(imgUrl, result);
        resolve(result);
      } catch (err) {
        console.warn('Color extraction failed:', err);
        resolve(DEFAULT_COLORS);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_COLORS);
    };

    img.src = imgUrl;
  });
}
