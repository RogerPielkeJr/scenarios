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
/** Room above the drawing for the figure's title. */
const TITLE_BAND = 44;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = 'Spectral, Georgia, serif';
/**
 * How many rows of the table the image carries.
 *
 * A figure drawn from an annual series has 76 rows behind it, and a picture
 * of 76 rows is a picture nobody reads. The image takes an evenly spaced
 * sample that always keeps the first year and the last, says which years it
 * kept, and points at the spreadsheet for the rest.
 */
const MAX_TABLE_ROWS = 16;
const TABLE_ROW_HEIGHT = 15;

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

/** A cell as it prints: numbers to a sensible precision, blanks for gaps. */
function printed(value: number | string | null): string {
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return Math.abs(value) >= 100 ? value.toFixed(0)
    : (Math.abs(value) >= 1 ? value.toFixed(2) : value.toFixed(3));
}

/** The row indices the image prints, evenly spaced, ends always kept. */
export function sampledRows(total: number, limit = MAX_TABLE_ROWS): number[] {
  if (total <= limit) return Array.from({ length: total }, (_unused, i) => i);
  const step = (total - 1) / (limit - 1);
  const kept = new Set<number>();
  for (let i = 0; i < limit; i += 1) kept.add(Math.round(i * step));
  kept.add(total - 1);
  return [...kept].sort((a, b) => a - b);
}

/**
 * The figure as a PNG: its title, the drawing, the numbers behind it, and a
 * band carrying the mark, the source and the analysis credit.
 *
 * A figure that leaves the site has to say what it is, what it is made of and
 * where it came from without the page around it. The table is a sample of the
 * rows when there are more than the image can hold; the spreadsheet button
 * beside this one hands over every one of them.
 */
export async function figureToPng(
  svg: SVGSVGElement, filename: string, data: FigureData,
): Promise<void> {
  const styles = window.getComputedStyle(document.documentElement);
  const paper = styles.getPropertyValue('--panel').trim() || '#ffffff';
  const ink = styles.getPropertyValue('--ink').trim() || '#16243a';
  const dim = styles.getPropertyValue('--dim').trim() || '#5a6c82';
  const rule = styles.getPropertyValue('--rule').trim() || '#c9d4e0';
  const navy = styles.getPropertyValue('--navy').trim() || '#1f3a5f';
  const view = viewBoxOf(svg);

  const totalRows = Math.max(...data.columns.map((column) => column.values.length), 0);
  const rows = sampledRows(totalRows);
  const extras = data.extraRows ?? [];
  const thinned = rows.length < totalRows;
  const tableBand = data.columns.length === 0 ? 0
    : 26 + (rows.length + 1 + extras.length) * TABLE_ROW_HEIGHT + (thinned ? 18 : 8);
  const height = TITLE_BAND + view.height + tableBand + CREDIT_BAND;

  const canvas = document.createElement('canvas');
  canvas.width = view.width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d canvas context');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, view.width, height);
  ctx.textBaseline = 'alphabetic';

  // The title, which on the front page's chart is the reader's own scenario.
  ctx.fillStyle = ink;
  ctx.font = `600 19px ${SERIF}`;
  ctx.fillText(data.title, 8, 26, view.width - 16);
  ctx.strokeStyle = navy;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, TITLE_BAND - 10);
  ctx.lineTo(view.width - 8, TITLE_BAND - 10);
  ctx.stroke();

  const markup = resolveVariables(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" `
    + `viewBox="0 0 ${view.width} ${view.height}">${svg.innerHTML}</svg>`,
    styles,
  );
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    ctx.drawImage(await loadImage(url), 0, TITLE_BAND, view.width, view.height);
  } finally {
    URL.revokeObjectURL(url);
  }

  if (data.columns.length > 0) {
    drawTable(ctx, {
      top: TITLE_BAND + view.height + 20, width: view.width,
      data, rows, extras, thinned, totalRows,
    }, { ink, dim, rule, navy });
  }

  const bandTop = TITLE_BAND + view.height + tableBand + 6;
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
  ctx.font = `12px ${SANS}`;
  ctx.fillText(`Data: ${data.source}`, textLeft, bandTop + 20, view.width - textLeft - 8);
  ctx.fillText(CREDIT, textLeft, bandTop + 36, view.width - textLeft - 8);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((made) => (made === null
      ? reject(new Error('could not encode the PNG')) : resolve(made)), 'image/png');
  });
  save(blob, filename);
}

interface TableLayout {
  top: number;
  width: number;
  data: FigureData;
  rows: readonly number[];
  extras: ReadonlyArray<Array<number | string | null>>;
  thinned: boolean;
  totalRows: number;
}

interface Palette { ink: string; dim: string; rule: string; navy: string }

/**
 * The numbers under the drawing.
 *
 * The type shrinks until the widest cell in every column fits its share of
 * the width, because a figure of seven fuel shares and one of two series
 * cannot use the same size and both stay readable.
 */
function drawTable(
  ctx: CanvasRenderingContext2D, layout: TableLayout, palette: Palette,
): void {
  const { top, width, data, rows, extras, thinned, totalRows } = layout;
  const margin = 8;
  const available = width - margin * 2;
  const columnWidth = available / data.columns.length;

  let size = 11;
  while (size > 6) {
    ctx.font = `${size}px ${MONO}`;
    const widest = Math.max(...data.columns.map((column) => Math.max(
      ctx.measureText(column.header).width,
      ...rows.map((row) => ctx.measureText(printed(column.values[row] ?? null)).width),
    )));
    if (widest <= columnWidth - 8) break;
    size -= 0.5;
  }

  ctx.fillStyle = palette.dim;
  ctx.font = `600 10.5px ${SANS}`;
  ctx.fillText('THE NUMBERS BEHIND THIS FIGURE', margin, top - 8);

  let y = top + TABLE_ROW_HEIGHT;
  ctx.font = `600 ${size}px ${SANS}`;
  data.columns.forEach((column, index) => {
    ctx.fillText(column.header, margin + index * columnWidth,
      y, columnWidth - 8);
  });
  ctx.strokeStyle = palette.navy;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y + 4);
  ctx.lineTo(width - margin, y + 4);
  ctx.stroke();

  ctx.font = `${size}px ${MONO}`;
  for (const row of rows) {
    y += TABLE_ROW_HEIGHT;
    ctx.fillStyle = palette.ink;
    data.columns.forEach((column, index) => {
      ctx.fillText(printed(column.values[row] ?? null),
        margin + index * columnWidth, y, columnWidth - 8);
    });
    ctx.strokeStyle = palette.rule;
    ctx.beginPath();
    ctx.moveTo(margin, y + 4);
    ctx.lineTo(width - margin, y + 4);
    ctx.stroke();
  }

  // Extra rows carry values that sit outside the table's shape -- a marker at
  // one year, a named rate on a distribution -- and can be wider than the
  // table is. They get a grid of their own rather than the columns above,
  // which on a one-column figure pushed every value off the right edge.
  const extraColumns = Math.max(1, ...extras.map((extra) => extra.length));
  const extraWidth = available / extraColumns;
  for (const extra of extras) {
    y += TABLE_ROW_HEIGHT;
    ctx.fillStyle = palette.ink;
    extra.forEach((value, index) => {
      ctx.fillText(printed(value), margin + index * extraWidth, y, extraWidth - 8);
    });
  }

  if (thinned) {
    y += TABLE_ROW_HEIGHT;
    ctx.fillStyle = palette.dim;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(`${rows.length} of ${totalRows} rows, evenly spaced. `
      + 'The spreadsheet beside the image has all of them.',
    margin, y, available);
  }
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
// Subscript digits become their plain form before slugging. The site writes
// CO₂ with the subscript glyph, and the character class below drops anything
// outside a-z0-9, so a figure called "Land use CO₂" downloaded as
// "land-use-co-..." with the 2 silently gone.
const PLAIN_DIGITS: ReadonlyArray<[RegExp, string]> = [[/\u2082/g, '2'], [/\u2081/g, '1'],
  [/\u2083/g, '3'], [/\u2084/g, '4']];

function plainDigits(text: string): string {
  return PLAIN_DIGITS.reduce((out, [from, to]) => out.replace(from, to), text);
}


/** A filename stem from a title, or a fallback when it reduces to nothing. */
export function fileStem(title: string, fallback: string): string {
  const slug = plainDigits(title).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
    figureToPng(svg, `${fileStem(data.title, fallbackStem)}.png`, data).then(
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
