FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
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

# Expose port
EXPOSE 3333

# Run the application
CMD ["python", "server.py"]
