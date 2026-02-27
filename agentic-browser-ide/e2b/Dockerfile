# E2B Custom Template - Browser Automation Sandbox
# This creates a sandbox with Chromium, Playwright, and all dependencies

FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    wget \
    gnupg \
    git \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Upgrade pip and install Playwright
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir playwright==1.45.0

# Install Chromium browser with dependencies (system-wide)
# Remove custom PLAYWRIGHT_BROWSERS_PATH to use default location
RUN playwright install chromium --with-deps

# Create workspace directory
WORKDIR /home/user

# Set environment variables
ENV DISPLAY=:99

# Default command (will be overridden by E2B)
CMD ["/bin/bash"]
