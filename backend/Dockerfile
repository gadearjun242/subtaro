FROM node:22-bookworm-slim

# ============================================================
# System dependencies
# ============================================================

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        fontconfig \
        fonts-noto \
        ca-certificates \
        redis-server \
        supervisor && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

# ============================================================
# Verify FFmpeg
# ============================================================

RUN ffmpeg -filters 2>/dev/null | grep -q "subtitles" || \
    (echo "FFmpeg subtitles filter missing" && exit 1)

RUN command -v ffprobe >/dev/null 2>&1 || \
    (echo "ffprobe missing" && exit 1)

# ============================================================
# Application
# ============================================================

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /tmp/subtitle

# ============================================================
# Supervisor configuration
# ============================================================

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ============================================================
# Environment
# ============================================================

ENV NODE_ENV=production
ENV PORT=5000
ENV REDIS_URL=redis://127.0.0.1:6379

EXPOSE 5000

# ============================================================
# Container health check
# ============================================================

HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=30s \
            --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 5000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# ============================================================
# Start Redis + Node
# ============================================================

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]


# to  build
# docker build -t subtaro-backend .



# to run
# docker run --env-file .env -p 5000:5000 subtaro-backend


# to stop
# docker stop subtaro-backend

# to remove

# docker rm subtaro-backend