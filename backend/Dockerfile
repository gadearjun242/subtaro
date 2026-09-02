# ============================================================
# Subtaro Backend - Production Dockerfile
# ============================================================

FROM node:22-bookworm-slim

# ------------------------------------------------------------
# System dependencies
# FFmpeg + fonts for subtitle rendering
# ------------------------------------------------------------

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        fontconfig \
        fonts-noto \
        ca-certificates && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Verify FFmpeg subtitles filter / libass
# ------------------------------------------------------------

RUN ffmpeg -filters 2>/dev/null | grep -q "subtitles" || \
    (echo "FFmpeg build is missing the subtitles filter (libass)" && exit 1)

# ------------------------------------------------------------
# Verify ffprobe
# ------------------------------------------------------------

RUN command -v ffprobe >/dev/null 2>&1 || \
    (echo "ffprobe is missing - required for media processing" && exit 1)

# ------------------------------------------------------------
# Application directory
# ------------------------------------------------------------

WORKDIR /app

# ------------------------------------------------------------
# Install Node dependencies
# Copy package files first for Docker layer caching
# ------------------------------------------------------------

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev

# ------------------------------------------------------------
# Copy application source
# ------------------------------------------------------------

COPY . .

# ------------------------------------------------------------
# Temporary files
# ------------------------------------------------------------

RUN mkdir -p /tmp/subtitle

# ------------------------------------------------------------
# Environment
# ------------------------------------------------------------

ENV NODE_ENV=production
ENV PORT=5000

# Redis URL comes from Render environment variables.
#
# DO NOT hard-code it here.
#
# Render:
# REDIS_URL=redis://red-xxxxxxxx:6379
#
# Local Docker Compose:
# REDIS_URL=redis://redis:6379

# ------------------------------------------------------------
# Port
# ------------------------------------------------------------

EXPOSE 5000

# ------------------------------------------------------------
# Health check
# ------------------------------------------------------------

HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=30s \
    --retries=3 \
    CMD node -e "\
        require('http').get(\
            'http://127.0.0.1:' + (process.env.PORT || 5000) + '/health',\
            r => process.exit(r.statusCode === 200 ? 0 : 1)\
        ).on('error', () => process.exit(1))"

# ------------------------------------------------------------
# Start API + in-process BullMQ worker
# ------------------------------------------------------------

CMD ["node", "server.js"]

# to  build
# docker build -t subtaro-backend .



# to run
# docker run --env-file .env -p 5000:5000 subtaro-backend


# to stop
# docker stop subtaro-backend

# to remove

# docker rm subtaro-backend