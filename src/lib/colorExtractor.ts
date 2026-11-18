// Lightweight client-side dominant color extractor for artwork
export interface ExtractedColors {
  primary: string;       // Vibrant dominant hex
  secondary: string;     // Complementary or mid-tone hex
  glow: string;          // Semi-transparent rgba for shadows & glow
  ambientRgb: string;    // 'r, g, b' for CSS variables
}

const DEFAULT_COLORS: ExtractedColors = {
  primary: '#1ED760',
  secondary: '#38BDF8',
  glow: 'rgba(30, 215, 96, 0.35)',
  ambientRgb: '30, 215, 96',
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
        let satR = 30, satG = 215, satB = 96;
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

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);

        // Vibrant color preference
        const pR = maxSat > 0.25 ? satR : avgR;
        const pG = maxSat > 0.25 ? satG : avgG;
        const pB = maxSat > 0.25 ? satB : avgB;

        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        const primaryHex = `#${toHex(pR)}${toHex(pG)}${toHex(pB)}`;
        const secHex = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;

        const result: ExtractedColors = {
          primary: primaryHex,
          secondary: secHex,
          glow: `rgba(${pR}, ${pG}, ${pB}, 0.38)`,
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
