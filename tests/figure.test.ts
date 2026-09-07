import { describe, expect, it } from 'vitest';
import { fileStem, sampledRows, toSpreadsheet, type FigureData } from '../src/ui/figure.js';
import { plotTable, stripTable } from '../src/ui/plot.js';

const DATA: FigureData = {
  title: 'World population',
  source: 'UN World Population Prospects 2024',
  columns: [
    { header: 'Year', values: [2025, 2050, 2100] },
    { header: 'UN medium', values: [8.23, 9.66, 10.18] },
    { header: 'Sparse', values: [1, null, 3] },
  ],
  extraRows: [['CMIP7 HIGH (2100)', 12.98]],
};

describe('the spreadsheet a figure downloads', () => {
  const xml = toSpreadsheet(DATA);

  it('opens as a workbook', () => {
    expect(xml.startsWith('<?xml version="1.0"?>')).toBe(true);
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('urn:schemas-microsoft-com:office:spreadsheet');
    expect(xml.trimEnd().endsWith('</Workbook>')).toBe(true);
  });

  it('writes numbers as numbers and headers as text', () => {
    expect(xml).toContain('<Data ss:Type="String">UN medium</Data>');
    expect(xml).toContain('<Data ss:Type="Number">10.18</Data>');
  });

  it('leaves a gap where a series has no value', () => {
    // Header, three data rows, a blank, the extra row, a blank, source, credit.
    expect(xml.match(/<Row>/g)?.length).toBe(7);
    expect(xml).toContain('<Cell/>');
  });

  it('carries the source, the credit and anything outside the table', () => {
    expect(xml).toContain('Data: UN World Population Prospects 2024');
    expect(xml).toContain('Roger Pielke Jr.');
    expect(xml).toContain('CMIP7 HIGH (2100)');
    expect(xml).toContain('<Data ss:Type="Number">12.98</Data>');
  });

  it('escapes what would otherwise break the XML', () => {
    const escaped = toSpreadsheet({
      title: 'A/B: <test>',
      source: 'Coal & oil data',
      columns: [{ header: 'Coal & oil', values: ['<x>'] }],
    });
    expect(escaped).toContain('Coal &amp; oil');
    expect(escaped).toContain('&lt;x&gt;');
    // Excel rejects / and : in a sheet name, and the angle brackets need escaping.
    expect(escaped).toContain('ss:Name="A B  &lt;test&gt;"');
  });
});

describe('turning a chart spec into a table', () => {
  it('lines every series up on one column of years', () => {
    const table = plotTable({
      xMin: 2000,
      xMax: 2020,
      xTicks: [2000, 2020],
      yLabel: 'units',
      areas: [{
        id: 'coal', label: 'Coal', years: [2000, 2010, 2020], values: [40, 30, 25],
        color: 'red',
      }],
      bands: [{
        id: 'range', label: 'Range', years: [2000, 2020], lo: [1, 2], hi: [3, 4],
        color: 'grey',
      }],
      series: [
        { id: 'record', label: 'Record', color: 'black', points: [
          { year: 2000, value: 10 }, { year: 2020, value: 20 }] },
        { id: 'empty', label: 'Nothing', color: 'black', points: [] },
      ],
      points: [{ id: 'H', label: 'HIGH', year: 2020, value: 55, color: 'red' }],
    }, 'A chart', 'A source');

    expect(table.columns.map((column) => column.header)).toEqual([
      'Year', 'Coal', 'Range, low', 'Range, high', 'Record',
    ]);
    expect(table.columns[0]?.values).toEqual([2000, 2010, 2020]);
    // The record has no 2010 observation, so that cell stays empty.
    expect(table.columns[4]?.values).toEqual([10, null, 20]);
    expect(table.extraRows).toEqual([['HIGH (2020)', 55]]);
  });

  it('turns a distribution into one column and its marks', () => {
    const table = stripTable({
      values: [-1.5, -1.2, -0.9],
      highlights: [{ id: 'observed', label: 'observed', value: -1.43, color: 'navy' }],
      min: -2,
      max: 0,
      ticks: [-2, -1, 0],
      axisLabel: '%/yr',
    }, 'Windows', 'A source');
    expect(table.columns[0]?.header).toBe('%/yr');
    expect(table.columns[0]?.values).toHaveLength(3);
    expect(table.extraRows).toEqual([['observed', -1.43]]);
  });
});

describe('filenames', () => {
  it('slugs a title and falls back when nothing survives', () => {
    expect(fileStem('Population — What the world has done', 'x'))
      .toBe('population-what-the-world-has-done');
    expect(fileStem('———', 'emissions-scenario')).toBe('emissions-scenario');
  });
});

// The downloaded image carries the numbers under the drawing, and an annual
// series has far more rows than an image can hold.
describe('the rows the image prints', () => {
  it('keeps every row when there are few enough', () => {
    expect(sampledRows(5)).toEqual([0, 1, 2, 3, 4]);
    expect(sampledRows(16)).toEqual([...Array(16).keys()]);
  });

  // Losing the last year would cut 2100 off a chart whose whole point is 2100.
  it('always keeps the first row and the last', () => {
    for (const total of [17, 35, 68, 76, 136, 1000]) {
      const rows = sampledRows(total);
      expect(rows[0], `${total}`).toBe(0);
      expect(rows[rows.length - 1], `${total}`).toBe(total - 1);
      expect(rows.length, `${total}`).toBeLessThanOrEqual(17);
      expect(new Set(rows).size, `${total}`).toBe(rows.length);
      expect([...rows].sort((a, b) => a - b), `${total}`).toEqual(rows);
    }
  });

  // Evenly spaced, so a 76-year annual series lands on the five-yearly marker
  // years the CMIP7 columns actually carry rather than between them.
  it('spaces the rows evenly', () => {
    const rows = sampledRows(76);
    const gaps = new Set(rows.slice(1).map((row, i) => row - (rows[i] ?? 0)));
    expect([...gaps].every((gap) => Math.abs(gap - 5) <= 1)).toBe(true);
  });

  it('handles an empty figure', () => {
    expect(sampledRows(0)).toEqual([]);
  });
});
