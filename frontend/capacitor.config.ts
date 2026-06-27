import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Тонкая нативная WebView-обёртка вокруг того же веб-билда (CLAUDE.md §6).
 *
 * Два режима:
 *  - офлайн-бандл: упаковывается содержимое `dist` (webDir);
 *  - онлайн-режим: раскомментируйте `server.url` и укажите адрес развёрнутого
 *    сайта — обёртка будет показывать живой сайт (внутренний инструмент в сети).
 *
 * Добавление платформ (нужны Android SDK / Xcode):
 *   npm run build && npx cap add android && npx cap add ios && npx cap sync
 */
const config: CapacitorConfig = {
  appId: "kz.maison.orderledger",
  appName: "Maison · order-ledger",
  webDir: "dist",
  // server: {
  //   url: "https://order-ledger.example.kz",
  //   cleartext: false,
  // },
};

export default config;
