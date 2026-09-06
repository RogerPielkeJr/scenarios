/**
 * The links that lead off a page.
 *
 * Each one carries the reader's scenario, so a reader who steps out to the
 * library, the bibliography or the Learn More pages and comes back finds the
 * six numbers and the name they left with. A bare href resets all of them.
 */
import {
  bibliographyHref, hashFor, learnIndexHref, libraryHref, type Scenario,
} from '../state.js';

const LINKS: Array<[string, (scenario: Scenario) => string]> = [
  ['back-toolbar', (scenario) => `/${hashFor(scenario)}`],
  ['learn-toolbar', learnIndexHref],
  ['library-toolbar', libraryHref],
  ['bibliography-toolbar', bibliographyHref],
];

/** Points every toolbar link a page carries at the scenario in hand. */
export function linkToolbar(root: Document, scenario: Scenario): void {
  for (const [id, href] of LINKS) {
    const link = root.getElementById(id);
    if (link instanceof HTMLAnchorElement) link.href = href(scenario);
  }
}
