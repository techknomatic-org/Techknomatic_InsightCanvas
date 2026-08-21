# InsightCanvas — Production Deployment & Operations Guide

**InsightCanvas** by *Techknomatic Services Pvt. Ltd.* is designed for high-availability, low-latency deployment across cloud container platforms, private Kubernetes clusters, Docker hosts, and bare-metal servers.

---

## 1. System Requirements & Architecture Overview

### 1.1 Minimum Hardware Requirements
| Environment | CPU | RAM | Disk Storage | Target Workload |
| :--- | :--- | :--- | :--- | :--- |
| **Development / Test** | 2 vCPU | 4 GB | 10 GB SSD | 1-5 concurrent users, datasets < 50MB |
| **Production (Standard)** | 4 vCPU | 8 GB | 50 GB NVMe | 10-50 concurrent users, datasets < 500MB |
| **Production (High-Load)** | 8+ vCPU | 16-32 GB | 200+ GB NVMe | 100+ concurrent enterprise users |

### 1.2 Runtime Stack
- **Frontend**: Single-Page Application (React 18 + TypeScript) compiled to static production chunks.
- **Backend**: Python 3.11+ (Flask API with SSE streaming, caching, and background workers).
- **Static Assets Delivery**: Flask serves `py-src/data_formulator/dist` natively over port `5567`.
- **Database / Cache**: FileSystemCache / SQLite / Parquet workspace storage on persistent disk volumes.

---

## 2. Containerized Deployment (Recommended)

### 2.1 Deployment via Docker Compose

1. **Clone the repository**:
   ```bash
   git clone <repository-url> insight-canvas
   cd insight-canvas
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.template .env
   ```
   Edit `.env` to configure your API keys and server secret:
   ```env
   FLASK_SECRET_KEY=generate-a-strong-random-32-byte-hex-string
   OPENAI_API_KEY=sk-proj-...
   SANDBOX=local
   DISABLE_DISPLAY_KEYS=true
   DATA_FORMULATOR_HOME=/home/appuser/.data_formulator
   ```

3. **Launch the Application**:
   ```bash
   docker compose up --build -d
   ```

4. **Verify Health & Logs**:
   ```bash
   docker compose ps
   docker compose logs -f data-formulator
   ```
   Access the dashboard at `http://<server-ip>:5567`.

---

### 2.2 Direct Docker Build & Run

```bash
# Build the production image
docker build -t insight-canvas:latest .

# Run with persistent storage mount and environment file
docker run -d \
  --name insight-canvas \
  --restart unless-stopped \
  --env-file .env \
  -p 5567:5567 \
  -v insight_canvas_data:/home/appuser/.data_formulator \
  insight-canvas:latest
```

---

## 3. Cloud Deployments

### 3.1 Render Deployment
InsightCanvas includes a native [`render.yaml`](file:///c:/Users/krishna.shelar/Desktop/Data%20Formulator/render.yaml) blueprint:
1. Connect your Git repository to [Render.com](https://render.com).
2. Create a new **Blueprint** service pointing to `render.yaml`.
3. Set your secret environment variables (`OPENAI_API_KEY`, `FLASK_SECRET_KEY`) under the Render Environment Dashboard.
4. Deploy will build the Docker container and attach health checks on `/`.

### 3.2 AWS (ECS / Fargate or EC2)
- Push the Docker image to **AWS ECR** (Elastic Container Registry).
- Create an **ECS Task Definition** using `insight-canvas:latest`.
- Map port `5567` to the Application Load Balancer (ALB).
- Attach an **EFS Volume** mounted to `/home/appuser/.data_formulator` for persistent user workspace state.

### 3.3 Microsoft Azure (Azure App Service / Azure Container Apps)
- Build and push the image to **Azure Container Registry (ACR)**.
- Deploy an **Azure Container App** or **Web App for Containers** with:
  - Container Port: `5567`
  - Ingress: External HTTP/HTTPS
  - Storage Mount: Azure Files Share mounted to `/home/appuser/.data_formulator`

### 3.4 Google Cloud Platform (GCP Cloud Run)
```bash
gcloud builds submit --tag gcr.io/[PROJECT-ID]/insight-canvas:latest
gcloud run deploy insight-canvas \
  --image gcr.io/[PROJECT-ID]/insight-canvas:latest \
  --platform managed \
  --port 5567 \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars "DISABLE_DISPLAY_KEYS=true,SANDBOX=local"
```

---

## 4. Bare-Metal & Linux Systemd Deployment

### 4.1 Prerequisites
```bash
sudo apt-get update && sudo apt-get install -y python3.11 python3.11-venv nodejs yarn curl
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 4.2 Build Frontend & Install Backend
```bash
# 1. Install dependencies & build frontend bundle
yarn install --frozen-lockfile
yarn build

# 2. Sync Python environment
uv sync --frozen
```

### 4.3 Create a Systemd Service
Create `/etc/systemd/system/insightcanvas.service`:
```ini
[Unit]
Description=InsightCanvas Analytics Service (Techknomatic)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/insight-canvas
EnvironmentFile=/var/www/insight-canvas/.env
ExecStart=/root/.cargo/bin/uv run data_formulator --host 0.0.0.0 --port 5567
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable insightcanvas
sudo systemctl start insightcanvas
sudo systemctl status insightcanvas
```

---

## 5. Reverse Proxy Configuration (Nginx + SSL)

To serve InsightCanvas securely over HTTPS on standard ports (`80` / `443`):

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

        # Disable buffering for Server-Sent Events (SSE) AI streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

## 6. Production Security Checklist

| Check | Action | Description |
| :--- | :--- | :--- |
| **FLASK_SECRET_KEY** | Set in `.env` | Prevents session invalidation on restart and secures auth cookies |
| **DISABLE_DISPLAY_KEYS** | Set to `true` | Hides provider API keys from being viewed in the client UI |
| **SANDBOX** | Set to `local` or `docker` | Isolates AI Python code execution |
| **HTTPS / TLS** | Enabled via Nginx/Caddy | Encrypts in-transit data and OAuth tokens |
| **Volume Persistence** | `/home/appuser/.data_formulator` | Ensures user workspaces, tables, and sessions persist across container redeployments |

---

*Copyright © Techknomatic Services Pvt. Ltd. All rights reserved.*
