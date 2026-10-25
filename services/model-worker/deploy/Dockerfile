FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PYTHON_BIN=/opt/venv/bin/python \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MODEL_WORKER_POLL_MS=3000 \
    OPENBLAS_NUM_THREADS=1 \
    OMP_NUM_THREADS=1

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY requirements.txt ./
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY worker.mjs supabase-config.mjs generate.py ai_adapter.py ./
USER node
CMD ["node", "worker.mjs"]
