# Production Deployment Guide

This guide covers everything required to deploy the **School Examination System** in production environments.

---

## 1. Fast Track: 1-Click Docker Deployment (Recommended)

### Requirements
- [Docker Engine](https://docs.docker.com/engine/install/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### Instructions
1. Clone the repository and navigate to the project root:
   ```bash
   git clone <repo-url>
   cd school-examination-system
   ```

2. (Optional) Review environment settings in `docker-compose.yml` or copy `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Launch all containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

4. Seed the database with demo accounts (first-time only):
   ```bash
   docker compose exec server npm run seed
   ```

5. Access the application:
   - **Frontend UI:** `http://localhost:3000`
   - **Backend API:** `http://localhost:5000/api`
   - **Health Check:** `http://localhost:5000/api/health`

---

## 2. Bare-Metal / Ubuntu VPS Deployment (PM2 + Nginx)

### Requirements
- Ubuntu 22.04 / Debian 12
- Node.js 20 LTS & npm
- MySQL Server 8.0+
- Nginx & PM2 (`npm install -g pm2`)

### Step 1: Database Setup
```sql
CREATE DATABASE school_exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'exam_user'@'localhost' IDENTIFIED BY 'ExamSystem@123';
GRANT ALL PRIVILEGES ON school_exam_system.* TO 'exam_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 2: Backend Setup
```bash
cd /var/www/school-examination-system/server
cp .env.example .env
# Edit .env with your production database credentials and strong JWT_SECRET
nano .env

npm ci --only=production
npm run seed  # Run initial seed

# Start server cluster with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 3: Frontend Build & Nginx Configuration
```bash
cd /var/www/school-examination-system/client
npm ci
npm run build
```

Configure Nginx `/etc/nginx/sites-available/exam-system`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/school-examination-system/client/dist;
    index index.html;

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA Client Routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Enable Free SSL via Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 3. Cloud Platform Deployment (Railway / Render)

### Backend (Server Service)
1. Deploy from the `/server` subdirectory.
2. Set Build Command: `npm install`
3. Set Start Command: `npm start`
4. Set Environment Variables:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (from managed MySQL addon)
   - `JWT_SECRET`: generate a strong 64-char key
   - `CORS_ORIGIN`: your client domain URL

### Frontend (Client Service)
1. Deploy from the `/client` subdirectory as a Static Site.
2. Set Build Command: `npm install && npm run build`
3. Set Publish Directory: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: `https://your-backend-api.railway.app/api`

---

## 4. Default Seed Accounts

| Role | Username | Default Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Teacher** | `sjohnson` | `teacher123` |
| **Student** | `athompson` | `student123` |

> [!CAUTION]
> Remember to change the default passwords immediately upon deploying into a live production environment!
