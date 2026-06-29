// Минимальный service worker: онлайн-инструмент, без офлайн-кэша.
// Существует ради установимости PWA (Android показывает «Установить приложение»).
// Запросы просто проходят в сеть — это исключает протухание данных учёта.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passthrough: отдаём управление сети */ });
