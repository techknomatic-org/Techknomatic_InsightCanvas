# InsightCanvas — Production Deployment & Operations Guide

**InsightCanvas** by *Techknomatic Services Pvt. Ltd.* is designed for high-availability, lightweight, low-latency native deployment across Linux servers, Windows Server, Cloud Virtual Machines (AWS EC2, Azure VM, GCP Compute), and local enterprise infrastructure.

---

## 1. System Requirements & Architecture Overview

### 1.1 Minimum Hardware Requirements
| Environment | CPU | RAM | Disk Storage | Target Workload |
| :--- | :--- | :--- | :--- | :--- |
| **Development / Test** | 2 vCPU | 4 GB | 5 GB SSD | 1-5 concurrent users, datasets < 50MB |
| **Production (Standard)** | 4 vCPU | 8 GB | 20 GB NVMe | 10-50 concurrent users, datasets < 500MB |
| **Production (High-Load)** | 8+ vCPU | 16-32 GB | 100+ GB NVMe | 100+ concurrent enterprise users |

### 1.2 Native Lightweight Runtime Stack
- **Frontend**: Single-Page Application (React 18 + TypeScript) compiled to optimized static production chunks.
- **Backend**: Python 3.11+ (Flask API with SSE streaming, caching, and local subprocess sandboxes).
- **Static Asset Serving**: Flask serves `py-src/data_formulator/dist` natively over port `5567` (No separate web server required).
- **Storage / Cache**: High-performance Parquet storage, SQLite metadata, and `FileSystemCache` on local persistent disk.

---

## 2. Fast Production Deployment (Native / Bare-Metal)

### 2.1 Linux Server Setup (Ubuntu / Debian / RHEL)

1. **Install Prerequisites**:
   ```bash
   sudo apt update && sudo apt install -y python3.11 python3.11-venv nodejs yarn curl git
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Clone and Configure**:
   ```bash
   git clone https://github.com/techknomatic-org/Techknomatic_InsightCanvas.git /var/www/insightcanvas
   cd /var/www/insightcanvas
   cp .env.template .env
   ```

3. **Configure `.env`**:
   ```env
   FLASK_SECRET_KEY=generate-a-random-32-byte-hex-key
   OPENAI_API_KEY=sk-...
   SANDBOX=local
   DISABLE_DISPLAY_KEYS=true
   DATA_FORMULATOR_HOME=/var/lib/insightcanvas
   ```

4. **Build Frontend & Sync Backend Dependencies**:
   ```bash
   # Build optimized React bundle
   yarn install --frozen-lockfile
   yarn build

   # Sync Python environment
   uv sync
   ```

5. **Create a Systemd Service (`/etc/systemd/system/insightcanvas.service`)**:
   ```ini
   [Unit]
   Description=InsightCanvas Analytics Service (Techknomatic)
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/insightcanvas
   EnvironmentFile=/var/www/insightcanvas/.env
   ExecStart=/root/.cargo/bin/uv run data_formulator --host 0.0.0.0 --port 5567
   Restart=always
   RestartSec=5
   LimitNOFILE=65535

   [Install]
   WantedBy=multi-user.target
   ```

6. **Start and Enable Service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable insightcanvas
   sudo systemctl start insightcanvas
   sudo systemctl status insightcanvas
   ```

---

## 3. Windows Server / Windows Deployment

1. **Automated Setup**:
   Double-click `setup.bat` to automatically verify Python, Node.js, and install dependencies.
2. **Production Run**:
   Double-click `run_production.bat` to launch the unified server on `http://localhost:5567`.
3. **Daily Development / Dual Server**:
   Double-click `start.bat` to run backend (`:5567`) and frontend (`:5173`) in development mode with hot-reloading.

---

## 4. Reverse Proxy Configuration (Nginx + SSL)

To serve InsightCanvas securely over HTTPS on standard port `443`:

```nginx
# /etc/nginx/sites-available/insightcanvas.conf

server {
    listen 80;
    server_name analytics.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analytics.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/analytics.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Maximum payload size for large file uploads
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:5567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for real-time Server-Sent Events (SSE) AI streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

## 5. Security Checklist

| Check | Value | Purpose |
| :--- | :--- | :--- |
| **FLASK_SECRET_KEY** | 32-byte random hex | Secures session cookies and validates code execution signatures |
| **DISABLE_DISPLAY_KEYS** | `true` | Hides provider API keys from being displayed in client UI |
| **SANDBOX** | `local` | Runs Python code transformations in confined local subprocesses |
| **HTTPS / SSL** | Enabled via Nginx/Caddy | Encrypts in-transit data and user tokens |
| **DATA_FORMULATOR_HOME** | Dedicated directory | Isolates user workspaces and Parquet files |

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
