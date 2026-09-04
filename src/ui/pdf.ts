/**
 * A one-page PDF wrapping a single JPEG, written by hand.
 *
 * A PDF is a text container with binary streams, and a JPEG can be dropped
 * into one as-is under /DCTDecode, so a page holding one image needs no
 * library. That keeps the promise that this site ships no runtime
 * dependency beyond the fonts.
 */

/** A4 portrait, in points. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 28;

function encode(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/** Scales the image to fit inside the margins, keeping its proportions. */
function place(imageWidth: number, imageHeight: number) {
  const maxWidth = PAGE.width - MARGIN * 2;
  const maxHeight = PAGE.height - MARGIN * 2;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  // Centred on both axes. A sheet wider than it is tall leaves a lot of page
  // below it, and pinned to the top that reads as a mistake rather than a
  // margin.
  return {
    width,
    height,
    x: (PAGE.width - width) / 2,
    y: (PAGE.height - height) / 2,
  };
}

export function jpegToPdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  const box = place(imageWidth, imageHeight);
  const content = `q ${box.width.toFixed(2)} 0 0 ${box.height.toFixed(2)} `
    + `${box.x.toFixed(2)} ${box.y.toFixed(2)} cm /Im0 Do Q\n`;

  const objects: Array<string | Uint8Array> = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] `
      + '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
    null as unknown as string,   // the image, assembled below
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array) => { parts.push(chunk); length += chunk.length; };

  push(encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(length);
    push(encode(`${i + 1} 0 obj\n`));
    if (i === 3) {
      push(encode('<< /Type /XObject /Subtype /Image '
        + `/Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB `
        + `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`));
      push(jpeg);
      push(encode('\nendstream'));
    } else {
      push(encode(objects[i] as string));
    }
    push(encode('\nendobj\n'));
  }

  const xrefAt = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
    + `startxref\n${xrefAt}\n%%EOF\n`;
  push(encode(xref));

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const chunk of parts) { pdf.set(chunk, at); at += chunk.length; }
  return new Blob([pdf], { type: 'application/pdf' });
}
