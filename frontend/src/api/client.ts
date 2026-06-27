import axios from "axios";

// Сессионная аутентификация Django + CSRF (CLAUDE.md §6).
// axios автоматически подставит csrftoken из cookie в заголовок X-CSRFToken.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

// Гарантируем наличие csrftoken-cookie перед мутациями: дёргаем безопасный GET.
// Django выставит cookie при первом ответе с CsrfViewMiddleware.
export async function ensureCsrf(): Promise<void> {
  if (!document.cookie.includes("csrftoken")) {
    try {
      await api.get("/auth/me/");
    } catch {
      /* не авторизован — cookie всё равно выставится */
    }
  }
}
