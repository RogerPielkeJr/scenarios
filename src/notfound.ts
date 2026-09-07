/**
 * The 404 page.
 *
 * GitHub Pages serves /404.html for any address it cannot match, so this page
 * has to stand on its own markup: it carries no scenario, builds nothing in
 * the browser, and reads correctly with scripting off. The script adds only
 * the two things every other page shares.
 */
import './styles.css';
import { installThemeToggle } from './ui/theme.js';
import { linkFeedback } from './ui/toolbar.js';

const button = document.getElementById('theme-toggle');
const label = document.getElementById('theme-label');
if (button !== null && label !== null) installThemeToggle(button, label);

linkFeedback(document);
