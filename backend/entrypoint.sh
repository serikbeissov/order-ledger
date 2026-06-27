#!/usr/bin/env bash
# Запуск backend в Docker: миграции → сиды → статика → gunicorn (CLAUDE.md §12)
set -e

echo "Ожидание базы данных…"
python - <<'PY'
import os, time, socket
host = os.environ.get("POSTGRES_HOST", "db")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("База данных недоступна")
PY

python manage.py migrate --noinput
python manage.py seed
python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
