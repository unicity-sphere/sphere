// Theme initialization script for Chrome extension (externalized from index.html)
// Prevents FOUC by applying theme before React loads
(function () {
  var stored = localStorage.getItem('sphere-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.add(theme);
})();
