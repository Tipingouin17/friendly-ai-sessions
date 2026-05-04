FROM python:3.11-slim

# Security: create a non-root user to run the application
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/sh --create-home appuser

WORKDIR /app

# Install system dependencies (build-time only; remove after pip install)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies explicitly
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly ensure PyJWT is installed (handles import as 'jwt')
RUN pip install --no-cache-dir PyJWT==2.8.0

# Copy application code (FastAPI server replaces Flask server)
COPY server_fastapi.py ./server.py
COPY email_service.py ./email_service.py

# Copy facilitator avatar images and any other storage assets into the image
# This ensures avatars are available in production without needing a volume mount
COPY storage/ /app/storage/

# Security: set ownership and switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Railway injects PORT env var; default to 3333 for local development
ENV PORT=3333
EXPOSE ${PORT}

# Health check — uses $PORT so it works regardless of Railway's assigned port
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\",3333)}/health')" || exit 1

# Run FastAPI with uvicorn — use shell form so $PORT is expanded at runtime
# Single worker — WebSocket connection state is in-process
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers 1 --loop asyncio
