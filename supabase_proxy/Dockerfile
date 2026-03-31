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

# Copy application code
COPY server.py .

# Copy facilitator avatar images and any other storage assets into the image
# This ensures avatars are available in production without needing a volume mount
COPY storage/ /app/storage/

# Security: set ownership and switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3333

# Health check so Railway/Docker can verify the service is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3333/health')" || exit 1

# Run the application with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:3333", "--workers", "2", "--timeout", "120", "server:app"]
