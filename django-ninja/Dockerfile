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

# App Runner sends traffic to 8000
#
# Each thread holds a Postgres connection for CONN_MAX_AGE seconds, so this
# is 32 connections per instance. Keep instances x 32 under the server's
# max_connections (roughly 97 usable on a db.t4g.micro).
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 4 --threads 8 --timeout 60 --access-logfile - --error-logfile -"]
