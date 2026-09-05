import emulatorJson from '../data/emulator.json';

const { a, b, c } = emulatorJson.coefficients;
const { k, refMt } = emulatorJson.methane;

export const ANCHORS = emulatorJson.anchors;
/** The methane coefficient and the level it is measured against. */
export const METHANE = emulatorJson.methane;
export const MARKER_WARMING = emulatorJson.markerWarmingC;
export const EMULATOR_FORM = emulatorJson.form;

/**
 * Warming in 2100 above 1850-1900, in degrees C.
 *
 * A curve fitted to FaIR v2.2 runs of the seven CMIP7 markers, not a model
 * result. Treat it as indicative: it reads cumulative CO2 and methane and
 * nothing else, so two paths with the same total behave identically
 * however differently they got there. See METHODS.md.
 */
export function warming(cumulativeGt: number, methaneMt: number): number {
  return a + b * Math.log(1 + Math.max(0, cumulativeGt) / c) + k * (methaneMt - refMt);
}

/** Warming added on top of the 2015-2024 average. */
export function addedWarming(cumulativeGt: number, methaneMt: number): number {
  return warming(cumulativeGt, methaneMt) - ANCHORS.recentMeanC;
}
