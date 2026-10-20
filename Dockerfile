# ComplaintIQ Production Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node.js for building frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# Copy backend and data
COPY backend ./backend
COPY data ./data

# Expose port
EXPOSE 8000

ENV PORT=8000
ENV DATABASE_URL=sqlite:///./complaintiq.db

# Start backend
CMD ["sh", "-c", "cd backend && python seed_data.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
