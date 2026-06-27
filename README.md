# order-ledger

Внутренняя back-office платформа учёта заказов и движения денег для розничной
торговли. Первый инстанс — **Maison**. Язык интерфейса и данных — русский,
валюта учёта — тенге (KZT). Полное ТЗ — в `CLAUDE.md` родительского репозитория.

## Стек

- **Backend:** Django 5 + DRF, PostgreSQL, роли через Django Groups/Permissions.
- **Frontend:** React + TypeScript (Vite), Tailwind CSS, TanStack Query, Recharts.
- **WebView:** Capacitor — тонкая нативная обёртка вокруг того же веб-билда.
- **Инфраструктура:** Docker Compose (db, web, frontend, nginx).

## Быстрый старт (Docker)

```bash
cp .env.example .env        # отредактируйте секреты и пароль админа
docker compose up --build   # сайт: http://localhost:8080
```

При первом запуске автоматически применяются миграции и сиды (группы прав,
категории расходов, суперпользователь-админ из `DJANGO_ADMIN_*`).

- Сайт: `http://localhost:8080`
- Django Admin: `http://localhost:8080/admin/`
- API: `http://localhost:8080/api/`

## Разработка без Docker

Backend:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed          # admin / admin
python manage.py runserver     # http://localhost:8000
python manage.py test          # юнит-тесты денежных формул (§4)
```

Frontend (проксирует /api на :8000):

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
npm run build && npm run lint
```

## Мобильная WebView-обёртка (Capacitor)

```bash
cd frontend
npm run build
npx cap add android            # нужен Android SDK
npx cap add ios                # нужен Xcode (macOS)
npm run cap:sync
```

Для «живого» режима (показывать развёрнутый сайт) раскомментируйте `server.url`
в `capacitor.config.ts`.

## Бизнес-логика

Все денежные расчёты (прибыль заказа, баланс клиента, замороженный капитал,
P&L, «Деньги на счету») живут в `backend/apps/*/services.py` и покрыты
юнит-тестами с числовыми примерами. Подробности и формулы — в `CLAUDE.md` §4.
