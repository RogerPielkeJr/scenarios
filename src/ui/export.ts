/**
 * Downloads the chart as a PNG at 2x, with the THB logo and a credit line.
 *
 * The chart is drawn with CSS custom properties so it follows the theme, and
 * canvas cannot resolve those, so every var() is replaced with the value the
 * live page computes before the SVG is serialised. The logo and the credit
 * are painted onto the canvas rather than embedded in the SVG, which keeps
 * the canvas clean of any cross-origin taint.
 */

const SCALE = 2;
const CREDIT_BAND = 34;
const CREDIT = 'Source: analysis by Roger Pielke Jr., The Honest Broker';
const LOGO_SRC = '/thb-logo.png';
const LOGO_SIZE = 30;

function resolveVariables(markup: string, styles: CSSStyleDeclaration): string {
  return markup.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value === '' ? whole : value;
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${source}`));
    image.src = source;
  });
}

function viewBoxOf(svg: SVGSVGElement): { width: number; height: number } {
  const parts = (svg.getAttribute('viewBox') ?? '0 0 660 420').split(/\s+/).map(Number);
  return { width: parts[2] ?? 660, height: parts[3] ?? 420 };
}

export async function downloadChart(svg: SVGSVGElement, filename: string): Promise<void> {
  const styles = window.getComputedStyle(document.documentElement);
  const { width, height } = viewBoxOf(svg);
  const paper = styles.getPropertyValue('--panel').trim() || '#ffffff';
  const ink = styles.getPropertyValue('--dim').trim() || '#5a6c82';

  const markup = resolveVariables(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `
    + `viewBox="0 0 ${width} ${height}">${svg.innerHTML}</svg>`,
    styles,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = (height + CREDIT_BAND) * SCALE;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d canvas context');
  context.scale(SCALE, SCALE);
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height + CREDIT_BAND);

  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    context.drawImage(await loadImage(url), 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }

  try {
    const logo = await loadImage(LOGO_SRC);
    context.drawImage(logo, width - LOGO_SIZE - 10, 6, LOGO_SIZE, LOGO_SIZE);
  } catch {
    // A missing logo should not cost the reader the chart.
  }

  context.fillStyle = ink;
  context.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
  context.textBaseline = 'middle';
  context.fillText(CREDIT, 10, height + CREDIT_BAND / 2);

  await new Promise<void>((resolve) => {
    canvas.toBlob((png) => {
      if (png === null) { resolve(); return; }
      const href = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      resolve();
    }, 'image/png');
  });
}
