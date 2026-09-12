FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg[binary] ships its own libpq, so no build toolchain is needed here.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Baked into the image so the admin has CSS without an S3 round trip.
# Needs a key present at build time; the real one is injected at runtime.
RUN DJANGO_SECRET_KEY=build-only DJANGO_DEBUG=False \
    DJANGO_ALLOWED_HOSTS=localhost DB_NAME=x DB_USER=x DB_PASSWORD=x \
    python manage.py collectstatic --noinput

EXPOSE 8000

# App Runner sends traffic to 8000. Two workers x four threads keeps the
# Postgres connection count low (see CONN_MAX_AGE in settings).
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile -"]
