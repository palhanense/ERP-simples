FROM python:3.11-slim

# Install OS-level dependencies required by Pillow and general tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Ensure scripts have Unix-style line endings and entrypoint is executable
RUN apt-get update && apt-get install -y --no-install-recommends dos2unix \
    && find /app -type f -name "*.sh" -print0 | xargs -0 dos2unix || true

# Note: this project is an application (not an installable package),
# dependencies are installed from requirements.txt above. Installing
# in editable mode requires setup.py/pyproject.toml which we don't have
# and breaks the build. Skip pip install -e .

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

# Run entrypoint with bash explicitly to avoid shebang/CRLF issues
CMD ["/bin/bash", "/app/docker-entrypoint.sh"]
