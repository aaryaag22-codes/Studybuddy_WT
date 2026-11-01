// Runs BEFORE the page is drawn (loaded in <head>) so there is no flash of the wrong theme.
// Preferences (theme, text size, motion) are saved in localStorage by layout.js.
(function () {
  var prefs = { theme: 'system', text: 'normal', motion: 'system' };
  try {
    var saved = JSON.parse(localStorage.getItem('sb-prefs') || '{}');
    for (var k in saved) { if (k in prefs) prefs[k] = saved[k]; }
  } catch (e) { /* storage blocked: use defaults */ }

  var root = document.documentElement;
  var theme = prefs.theme;
  if (theme === 'system') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-text', prefs.text);
  root.setAttribute('data-motion', prefs.motion === 'reduce' ? 'reduce' : 'normal');
})();
