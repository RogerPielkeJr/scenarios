import type { InputId } from '../model/types.js';
import type { PlotSpec } from '../ui/plot.js';
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
  key: Array<{ label: string; color: string; dash?: boolean; dot?: boolean }>;
  /** Built for each render, because the reader's own curve sits in it. */
  spec(inputs: Readonly<Record<string, number>>, scenario: Scenario): PlotSpec;
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
export interface BuilderOutcome {
  /** In the slider's own units, before rounding or clamping. */
  value: number;
  /** The headline the reader reads before committing. */
  headline: string;
  /** Intermediate numbers worth showing, one line each. */
  detail: string[];
}

export interface BuilderBlock {
  heading: string;
  note?: string;
  paragraphs: string[];
  parts: BuilderPart[];
  /** Turns the part values into a slider value. */
  combine(values: Readonly<Record<string, number>>): BuilderOutcome;
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
