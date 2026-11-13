// Registrace service workeru (PWA, 13. 11. 2026). Bez něj Chrome na Androidu nenabídne instalaci tak ochotně.
// Lokální vývoj ho neregistruje, aby nepřekážel Vite.
const zaklad = import.meta.env.BASE_URL.replace(/\/?$/, '/');

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${zaklad}sw.js`, { scope: zaklad }).catch(() => {});
  });
}
