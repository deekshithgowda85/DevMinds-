FROM ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python 3.11
RUN apt-get update && apt-get install -y \
  python3.11 \
  python3-pip \
  python3.11-dev \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x for JavaScript
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Java JDK 17
RUN apt-get update && apt-get install -y \
  openjdk-17-jdk \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install C++ compiler (g++)
RUN apt-get update && apt-get install -y \
  g++ \
  gcc \
  make \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python packages
RUN pip3 install --no-cache-dir \
  numpy \
  pandas \
  matplotlib \
  requests

# Install global npm packages
RUN npm install -g typescript ts-node

# Create workspace directories
RUN mkdir -p /workspace/python /workspace/javascript /workspace/java /workspace/cpp /workspace/output

# Set permissions
RUN chmod -R 777 /workspace

# Environment variables
ENV PYTHONPATH=/workspace
ENV PYTHONUNBUFFERED=1
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

WORKDIR /workspace