(function () {
  try {
    var stored = localStorage.getItem('talliofi-theme');
    var theme =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // Fall back to system preference when localStorage is unavailable.
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();
