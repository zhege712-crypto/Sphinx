// Adapted from zhege712-crypto.github.io/theme.js; run before React to avoid a light flash.
(function () {
  var theme;
  try { theme = localStorage.getItem('sphinx:theme') || localStorage.getItem('theme'); } catch (_) {}
  if (!['light', 'dark', 'eye-care'].includes(theme)) {
    var hour = new Date().getHours();
    theme = hour >= 19 || hour < 6 ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
})();
