import { hashFor, shareUrl } from '../state.js';
import type { ScenarioInputs } from '../model/types.js';

export function installShare(
  button: HTMLElement,
  message: HTMLElement,
  currentInputs: () => ScenarioInputs,
): void {
  button.addEventListener('click', () => {
    const inputs = currentInputs();
    const url = shareUrl(inputs);
    window.history.replaceState(null, '', hashFor(inputs));

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
export function syncHash(inputs: ScenarioInputs): void {
  window.history.replaceState(null, '', hashFor(inputs));
}
