FROM mcr.microsoft.com/devcontainers/typescript-node:1-24-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg postgresql-client ca-certificates curl gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key \
    | gpg --dearmor -o /usr/share/keyrings/kubernetes-apt-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" \
    > /etc/apt/sources.list.d/kubernetes.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends kubectl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://baltocdn.com/helm/signing.asc \
    | gpg --dearmor -o /usr/share/keyrings/helm.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" \
    > /etc/apt/sources.list.d/helm-stable-debian.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends helm \
    && rm -rf /var/lib/apt/lists/*
