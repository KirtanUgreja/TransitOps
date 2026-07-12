# TransitOps backend — FastAPI on uv, for Render (or any container host).
# Build context is the `backend/` dir:  docker build -t transitops-api backend/
FROM python:3.12-slim

# uv: fast, reproducible installs from uv.lock (copied from the official image).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# Install deps first (cached layer) from the lockfile — no dev group in the image.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App code.
COPY app ./app

EXPOSE 8000
# Render injects $PORT; default to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
