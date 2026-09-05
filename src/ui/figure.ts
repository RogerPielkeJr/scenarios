/**
 * The two download buttons under every figure on the site.
 *
 * PNG redraws the SVG onto a canvas, which needs every CSS custom property
 * resolved first, because canvas cannot read them. XLS writes the numbers
 * behind the figure as a SpreadsheetML workbook, a single XML file Excel and
 * LibreOffice both open, so the file needs no library to produce.
 */

/** One column of a downloaded table. */
export interface Column {
  header: string;
  values: Array<number | string | null>;
}

export interface FigureData {
  /** The sheet name, and the first line of the file. */
  title: string;
  /** Where the numbers come from, printed on the image and in the workbook. */
  source: string;
  columns: Column[];
  /** Rows appended under the table, for values that sit outside its shape. */
  extraRows?: Array<Array<number | string | null>>;
}

const CREDIT = 'Analysis by Roger Pielke Jr., The Honest Broker';
const LOGO_SRC = '/thb-logo.png';
const SCALE = 2;
/** Room under the drawing for the logo and the two credit lines. */
const CREDIT_BAND = 52;
const LOGO_SIZE = 30;

function resolveVariables(markup: string, styles: CSSStyleDeclaration): string {
  return markup.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value === '' ? whole : value;
  });
}

function viewBoxOf(svg: SVGSVGElement): { width: number; height: number } {
  const parts = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  const width = parts[2];
  const height = parts[3];
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('figure has no usable viewBox');
  }
  return { width: width as number, height: height as number };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('could not rasterise the figure'));
    image.src = source;
  });
}

function save(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

/**
 * The figure as a PNG, on the page's own background, over a band carrying the
 * mark, the source of the numbers and the analysis credit. A figure that
 * leaves the site has to say where it came from without the page around it.
 */
export async function figureToPng(
  svg: SVGSVGElement, filename: string, source: string,
): Promise<void> {
  const styles = window.getComputedStyle(document.documentElement);
  const paper = styles.getPropertyValue('--panel').trim() || '#ffffff';
  const dim = styles.getPropertyValue('--dim').trim() || '#5a6c82';
  const rule = styles.getPropertyValue('--rule').trim() || '#c9d4e0';
  const view = viewBoxOf(svg);

  const canvas = document.createElement('canvas');
  canvas.width = view.width * SCALE;
  canvas.height = (view.height + CREDIT_BAND) * SCALE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d canvas context');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, view.width, view.height + CREDIT_BAND);

  const markup = resolveVariables(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" `
    + `viewBox="0 0 ${view.width} ${view.height}">${svg.innerHTML}</svg>`,
    styles,
  );
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    ctx.drawImage(await loadImage(url), 0, 0, view.width, view.height);
  } finally {
    URL.revokeObjectURL(url);
  }

  const bandTop = view.height + 6;
  ctx.strokeStyle = rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, bandTop);
  ctx.lineTo(view.width - 8, bandTop);
  ctx.stroke();

  let textLeft = 8;
  try {
    const logo = await loadImage(LOGO_SRC);
    ctx.drawImage(logo, 8, bandTop + 8, LOGO_SIZE, LOGO_SIZE);
    textLeft = 8 + LOGO_SIZE + 10;
  } catch {
    // A missing logo should not cost the reader the image.
  }

  ctx.fillStyle = dim;
  ctx.font = "12px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.fillText(`Data: ${source}`, textLeft, bandTop + 20, view.width - textLeft - 8);
  ctx.fillText(CREDIT, textLeft, bandTop + 36, view.width - textLeft - 8);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((made) => (made === null
      ? reject(new Error('could not encode the PNG')) : resolve(made)), 'image/png');
  });
  save(blob, filename);
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(value: number | string | null): string {
  if (value === null) return '<Cell/>';
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
      : '<Cell/>';
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

/**
 * SpreadsheetML, the XML workbook format Excel has read since 2003. One file,
 * no compression, no dependency, and the numbers arrive as numbers rather
 * than as text a reader has to convert.
 */
export function toSpreadsheet(data: FigureData): string {
  const rows = Math.max(...data.columns.map((column) => column.values.length), 0);
  const body: string[] = [
    `<Row>${data.columns.map((column) => cell(column.header)).join('')}</Row>`,
  ];
  for (let index = 0; index < rows; index += 1) {
    body.push(`<Row>${data.columns.map((column) =>
      cell(column.values[index] ?? null)).join('')}</Row>`);
  }
  if (data.extraRows !== undefined && data.extraRows.length > 0) {
    body.push('<Row/>');
    for (const row of data.extraRows) {
      body.push(`<Row>${row.map(cell).join('')}</Row>`);
    }
  }
  body.push('<Row/>');
  body.push(`<Row>${cell(`Data: ${data.source}`)}</Row>`);
  body.push(`<Row>${cell(CREDIT)}</Row>`);

  // Excel truncates a sheet name at 31 characters and rejects several
  // punctuation marks outright.
  const sheet = escapeXml(data.title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  return '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '
    + 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n'
    + `<Worksheet ss:Name="${sheet}"><Table>\n${body.join('\n')}\n</Table></Worksheet>\n`
    + '</Workbook>\n';
}

export function figureToXls(data: FigureData, filename: string): void {
  save(new Blob([toSpreadsheet(data)], { type: 'application/vnd.ms-excel' }), filename);
}

/** A filename stem from a title, or a fallback when it reduces to nothing. */
export function fileStem(title: string, fallback: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug === '' ? fallback : slug.slice(0, 60);
}

export interface FigureButtons {
  element: HTMLElement;
  /** Called after a render, so a download always carries the current numbers. */
  update(data: FigureData): void;
}

/**
 * Two buttons under a figure. They report failure in place rather than
 * silently doing nothing, because a download that does not arrive looks
 * identical to a click that missed.
 */
export function attachFigureButtons(
  root: Document,
  svg: SVGSVGElement,
  initial: FigureData,
  fallbackStem: string,
): FigureButtons {
  let data = initial;
  const bar = root.createElement('div');
  bar.className = 'figure-actions';

  const message = root.createElement('span');
  message.className = 'action-message';
  message.setAttribute('role', 'status');

  const png = root.createElement('button');
  png.type = 'button';
  png.className = 'ghost figure-download';
  png.textContent = 'PNG';
  png.setAttribute('aria-label', 'Download this figure as a PNG image');
  png.addEventListener('click', () => {
    message.textContent = 'Building…';
    figureToPng(svg, `${fileStem(data.title, fallbackStem)}.png`, data.source).then(
      () => { message.textContent = 'Downloaded'; hide(); },
      (error: unknown) => {
        message.textContent = 'Could not build the image';
        console.error('[kaya] figure PNG failed:', error);
      },
    );
  });

  const xls = root.createElement('button');
  xls.type = 'button';
  xls.className = 'ghost figure-download';
  xls.textContent = 'XLS';
  xls.setAttribute('aria-label', 'Download the numbers behind this figure as a spreadsheet');
  xls.addEventListener('click', () => {
    try {
      figureToXls(data, `${fileStem(data.title, fallbackStem)}.xls`);
      message.textContent = 'Downloaded';
      hide();
    } catch (error) {
      message.textContent = 'Could not build the spreadsheet';
      console.error('[kaya] figure XLS failed:', error);
    }
  });

  function hide(): void {
    root.defaultView?.setTimeout(() => { message.textContent = ''; }, 2600);
  }

  bar.append(png, xls, message);
  return {
    element: bar,
    update(next) { data = next; },
  };
}
