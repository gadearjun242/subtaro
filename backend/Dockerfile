FROM node:20-bookworm

# Install system dependencies and fonts
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-deva \
    fonts-noto \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-indic \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Refresh font cache
RUN fc-cache -f -v

# Create app directory
WORKDIR /app

# Install dependencies first (better Docker caching)
COPY package*.json ./
RUN npm install

# Copy backend source
COPY . .

# Backend port
EXPOSE 5000

# Start backend
CMD ["node", "server.js"]


# Build and run
# From your backend folder:

# docker build -t subtaro .

# Then:

# docker run -p 5000:5000 subtaro

# to stop
# docker stop subtaro

# to remove

# docker rm subtaro