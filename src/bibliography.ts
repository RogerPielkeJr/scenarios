import './styles.css';
import { installThemeToggle } from './ui/theme.js';

const button = document.getElementById('theme-toggle');
const label = document.getElementById('theme-label');
if (button !== null && label !== null) installThemeToggle(button, label);
