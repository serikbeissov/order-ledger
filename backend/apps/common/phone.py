"""Нормализация казахстанских телефонов (CLAUDE.md §8)."""
import re


def normalize_kz_phone(raw: str) -> str:
    """
    Привести телефон к формату +7XXXXXXXXXX.

    - убираем всё кроме цифр;
    - ведущая 8 → 7;
    - 10 цифр (без кода страны) → добавляем 7.
    Возвращает исходную строку, если не удалось распознать KZ-номер.
    """
    if not raw:
        return raw
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return raw
    if digits[0] == "8":
        digits = "7" + digits[1:]
    if len(digits) == 10:
        digits = "7" + digits
    if len(digits) == 11 and digits[0] == "7":
        return "+" + digits
    # не похоже на KZ-номер — возвращаем как есть (валидация решит)
    return raw
