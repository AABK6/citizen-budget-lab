# syntax=docker/dockerfile:1

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Minimal build tooling
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cacheable layer)
COPY services/api/requirements.txt /app/services/api/requirements.txt
RUN pip install -r /app/services/api/requirements.txt

# Copy application source (assumes build context is repo root)
COPY services/api /app/services/api
COPY data /app/data
COPY schemas /app/schemas

EXPOSE 8000

CMD ["sh", "-c", "uvicorn services.api.app:app --host 0.0.0.0 --port ${PORT:-8000}"]

