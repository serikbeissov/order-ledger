import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Нативная WebView-обёртка вокруг развёрнутого сайта (CLAUDE.md §6).
 *
 * Внутренний инструмент работает в локальной сети, аутентификация — по сессии
 * Django + CSRF (cookie). Поэтому обёртка работает в ОНЛАЙН-режиме: WebView
 * открывает живой сайт по `server.url` — тогда запросы к /api идут на тот же
 * origin и сессия/CSRF работают как в браузере.
 *
 * Поменяйте `server.url` на адрес вашего сервера (IP или домен). Для HTTPS
 * поставьте cleartext: false.
 *
 * Сборка платформ (нужны Android SDK / Xcode):
 *   npm run build && npx cap add android && npx cap add ios && npx cap sync
 */
const SERVER_URL = process.env.APP_SERVER_URL || "http://10.10.2.5:8080";

const config: CapacitorConfig = {
  appId: "kz.maison.orderledger",
  appName: "Maison · order-ledger",
  webDir: "dist",
  server: {
    url: SERVER_URL,
    cleartext: SERVER_URL.startsWith("http://"),
  },
};

export default config;
