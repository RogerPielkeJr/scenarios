import type { InputId } from '../model/types.js';
import type { PlotSpec, StripSpec } from '../ui/plot.js';
import type { Scenario } from '../state.js';

/** One entry in the source list at the foot of a page. */
export interface Source {
  /** The work itself. */
  title: string;
  /** Who published it. */
  publisher: string;
  /** Which edition, revision or release. */
  vintage: string;
  url: string;
  /** What the page took from it. */
  used: string;
}

/** The box at the top of every page: the quantity in four lines. */
export interface Definition {
  quantity: string;
  units: string;
  /** Where it sits in the identity, in words. */
  place: string;
  /** The value today, with its year. */
  today: string;
  paragraphs: string[];
}

export interface ProseBlock {
  heading: string;
  /** A short line under the heading, in the left column. */
  note?: string;
  paragraphs: string[];
}

export interface ChartBlock {
  heading: string;
  note?: string;
  paragraphs: string[];
  caption: string;
  /** Legend entries under the figure. */
  key: KeyEntry[];
  /**
   * Built for each render, because the reader's own curve sits in it. Takes
   * the builder's current outcome, which carries the value the slider would
   * receive, so a chart never reproduces the builder's arithmetic.
   */
  spec(outcome: BuilderOutcome, scenario: Scenario): PlotSpec;
  /** A second figure under the first, where one chart cannot carry the story. */
  extra?: ExtraFigure;
}

/** One control in a builder. */
export interface BuilderPart {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  decimals: number;
  /** Printed after the value in the readout. */
  unitSuffix: string;
  /** A line under the label, for context the reader needs while sliding. */
  note?: string;
  marks: Array<{ value: number; label: string; kind: 'low' | 'medium' | 'high' | 'observed' }>;
}

/** What a builder makes of its parts. */
/** The second figure: a distribution, or another time series. */
export type ExtraFigure =
  | { kind: 'strip'; caption: string; key?: KeyEntry[]; spec(outcome: BuilderOutcome): StripSpec }
  | { kind: 'plot'; caption: string; key?: KeyEntry[]; spec(outcome: BuilderOutcome): PlotSpec };

export interface KeyEntry {
  label: string;
  color: string;
  dash?: boolean;
  dot?: boolean;
}

export interface BuilderOutcome {
  /** In the slider's own units, before rounding or clamping. */
  value: number;
  /** The headline the reader reads before committing. */
  headline: string;
  /** Intermediate numbers worth showing, one line each. */
  detail: string[];
  /**
   * The part values behind it, attached by the builder rather than by the
   * page, so a chart can draw the reader's own inputs without the page
   * threading them through by hand.
   */
  values?: Readonly<Record<string, number>>;
}

/**
 * One way of assembling the value.
 *
 * Most pages offer a single mode. Where a quantity can be approached from
 * either end - set a rate and read the level, or set the level and read the
 * rate - each way becomes a mode and the reader picks between them.
 */
export interface BuilderMode {
  id: string;
  /** The label on the mode switch. */
  label: string;
  /** A line under the switch saying what this mode asks for. */
  note?: string;
  parts: BuilderPart[];
  /** Turns this mode's part values into a slider value. */
  combine(values: Readonly<Record<string, number>>): BuilderOutcome;
}

export interface BuilderBlock {
  heading: string;
  note?: string;
  paragraphs: string[];
  /** One or more ways to assemble the value. A single mode hides the switch. */
  modes: BuilderMode[];
  /** The label on the button, e.g. "Use this population in my scenario". */
  action: string;
}

export interface LearnPageSpec {
  slug: string;
  /** The slider this page feeds. */
  input: InputId;
  title: string;
  standfirst: string;
  definition: Definition;
  chart: ChartBlock;
  drivers: ProseBlock;
  markers: ProseBlock;
  builder: BuilderBlock;
  sources: Source[];
}
