/**
 * The links that lead off a page.
 *
 * Each one carries the reader's scenario, so a reader who steps out to the
 * library, the bibliography or the Learn More pages and comes back finds the
 * numbers and the name they left with. A bare href resets all of them.
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

/**
 * Where feedback on the tool goes.
 *
 * The announcement post, which went up after the site did so that it could
 * link a live tool. Until then this pointed at the Substack front page, so the
 * words in the footer led somewhere from the first day rather than sitting
 * dead. `linkFeedback` moves every page at once.
 */
export const FEEDBACK_URL: string | null =
  'https://rogerpielkejr.substack.com/p/introducing-the-thb-build-your-own';

/** Makes the footer's "Provide feedback" a link, once there is one to make. */
export function linkFeedback(root: Document): void {
  if (FEEDBACK_URL === null) return;
  for (const span of root.querySelectorAll('[data-feedback]')) {
    const link = root.createElement('a');
    link.className = 'feedback';
    link.href = FEEDBACK_URL;
    link.textContent = span.textContent;
    span.replaceWith(link);
  }
}

/** Points every toolbar link a page carries at the scenario in hand. */
export function linkToolbar(root: Document, scenario: Scenario): void {
  for (const [id, href] of LINKS) {
    const link = root.getElementById(id);
    if (link instanceof HTMLAnchorElement) link.href = href(scenario);
  }
  linkFeedback(root);
}
