const storageKey = 'sierra-site-theme';
const root = document.documentElement;
const toggle = document.querySelector('[data-context-theme]');

function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  root.dataset.sierraTheme = nextTheme;
  if (toggle) {
    toggle.textContent = nextTheme === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `switch to ${toggle.textContent} theme`);
  }
}

let savedTheme = 'dark';
try {
  savedTheme = localStorage.getItem(storageKey) || 'dark';
} catch {
  savedTheme = 'dark';
}
applyTheme(savedTheme);

toggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.sierraTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  try {
    localStorage.setItem(storageKey, nextTheme);
  } catch {
    // The theme still changes when storage is unavailable.
  }
});
