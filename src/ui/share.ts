import { pathWithScenario, shareUrl, type Scenario } from '../state.js';

export function installShare(
  button: HTMLElement,
  message: HTMLElement,
  current: () => Scenario,
): void {
  button.addEventListener('click', () => {
    const scenario = current();
    const url = shareUrl(scenario);
    window.history.replaceState(null, '', pathWithScenario(scenario));

    const done = () => {
      message.textContent = 'Link copied';
      window.setTimeout(() => { message.textContent = ''; }, 2600);
    };
    // Clipboard access fails on insecure origins and when permission is
    // refused, so the fallback shows the link for the reader to copy.
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard.writeText(url).then(done, () => { message.textContent = url; });
    } else {
      message.textContent = url;
    }
  });
}

/** Keeps the address bar in step without adding a history entry per drag. */
export function syncHash(scenario: Scenario): void {
  window.history.replaceState(null, '', pathWithScenario(scenario));
}
