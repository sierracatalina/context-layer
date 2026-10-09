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
const copyStatusResetDelay = 2400;

function copyWithFallback(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  document.body.append(textarea);

  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }

  if (!copied) throw new Error('Copy command was unavailable.');
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose the Clipboard API but deny it in this context.
    }
  }

  copyWithFallback(text);
}

function enhanceCodeCanvas(pre, index) {
  if (pre.closest('.code-canvas')) return;

  const canvas = document.createElement('div');
  canvas.className = 'code-canvas';
  canvas.dataset.copyState = 'idle';

  const toolbar = document.createElement('div');
  toolbar.className = 'code-canvas__toolbar';

  const status = document.createElement('span');
  status.className = 'code-canvas__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const button = document.createElement('button');
  button.className = 'code-canvas__copy';
  button.type = 'button';
  button.textContent = 'copy';
  button.setAttribute('aria-label', `copy code snippet ${index + 1} to clipboard`);

  let resetTimer;
  let isCopying = false;
  button.addEventListener('click', async () => {
    if (isCopying) return;
    isCopying = true;
    window.clearTimeout(resetTimer);
    canvas.dataset.copyState = 'copying';
    status.textContent = 'copying';

    try {
      await copyText(pre.textContent || '');
      canvas.dataset.copyState = 'copied';
      status.textContent = 'copied';
    } catch {
      canvas.dataset.copyState = 'error';
      status.textContent = 'copy failed';
    } finally {
      isCopying = false;
      button.focus({ preventScroll: true });
      resetTimer = window.setTimeout(() => {
        canvas.dataset.copyState = 'idle';
        status.textContent = '';
      }, copyStatusResetDelay);
    }
  });

  toolbar.append(status, button);
  pre.before(canvas);
  canvas.append(toolbar, pre);
}

document.querySelectorAll('pre').forEach(enhanceCodeCanvas);

const siteHeader = document.querySelector('.context-header');
const menuToggle = document.querySelector('.context-menu-toggle');
const siteNavigation = document.querySelector('#context-navigation');

if (siteHeader && menuToggle && siteNavigation) {
  const mobileNavigation = window.matchMedia('(max-width: 820px)');
  function closeNavigation({ returnFocus = false } = {}) {
    siteHeader.removeAttribute('data-menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.querySelector('span').textContent = '+';
    if (returnFocus) menuToggle.focus();
  }
  menuToggle.hidden = false;
  siteHeader.dataset.navReady = '';
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeNavigation();
    else {
      siteHeader.dataset.menuOpen = '';
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.querySelector('span').textContent = '−';
    }
  });
  siteNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNavigation();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteHeader.hasAttribute('data-menu-open')) {
      closeNavigation({ returnFocus: true });
    }
  });
  document.addEventListener('click', (event) => {
    if (!siteHeader.contains(event.target)) closeNavigation();
  });
  mobileNavigation.addEventListener('change', () => closeNavigation());
  window.addEventListener('pageshow', () => closeNavigation());
  siteNavigation.querySelectorAll('a').forEach((link) => {
    if (new URL(link.href).pathname === window.location.pathname) {
      link.setAttribute('aria-current', 'page');
    }
  });
}
