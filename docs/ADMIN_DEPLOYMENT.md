# Admin Panel — AWS Deployment

This document covers deploying the admin web UI to the same EC2 instance that already runs the WordMaster backend. The admin panel is a static React build served by nginx, while API requests proxy to the Node.js backend on port 3000.

## Prerequisites

The EC2 instance must already be running with nginx and PM2 as described in `AWS_DEPLOYMENT_GUIDE.md`. The backend is reachable at `https://3.91.69.195`.

## 1. Build the Admin Panel Locally

```bash
cd admin
npm install
npm run build
```

Vite reads `admin/.env.production` during `npm run build`, which sets:

```
VITE_API_URL=https://3.91.69.195/api/admin
VITE_AUTH_URL=https://3.91.69.195/api/auth
```

The output goes into `admin/dist/`.

## 2. Upload the Build to EC2

```bash
scp -i wordmaster-key.pem -r admin/dist/* \
  ubuntu@3.91.69.195:/home/ubuntu/Wordmaster/admin/dist/
```

Alternatively, push to the repo and pull from EC2:

```bash
ssh -i wordmaster-key.pem ubuntu@3.91.69.195
cd ~/Wordmaster
git pull origin main
cd admin && npm install && npm run build
```

## 3. Update the Nginx Configuration

SSH into the EC2 instance and replace the nginx site config.

```bash
sudo nano /etc/nginx/sites-available/wordmaster
```

Replace the contents with:

```nginx
server {
    listen 80;
    server_name _;

    # --- Admin panel (static files) ---
    location /admin {
        alias /home/ubuntu/Wordmaster/admin/dist;
        try_files $uri $uri/ /admin/index.html;
    }

    # --- Backend API ---
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Test and restart nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

The admin panel will be available at `https://3.91.69.195/admin`.

## 4. Set the Vite Base Path

Because nginx serves the admin under `/admin`, the Vite build needs a matching base path. This is already configured in `admin/vite.config.js` via the `base` option for production builds. If the panel loads with broken asset paths, verify that the config contains:

```js
base: process.env.NODE_ENV === 'production' ? '/admin/' : '/',
```

## 5. Run the Database Migration (if not done)

The admin panel requires the `role` column on the `users` table. From the EC2 instance:

```bash
cd ~/Wordmaster/backend
psql -h <RDS_ENDPOINT> -U postgres -d wordmaster \
  -f src/scripts/add_user_roles.sql
```

Then promote yourself:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 6. Verify

Open `https://3.91.69.195/admin` in a browser, log in with your admin credentials, and confirm the dashboard loads with stats from the production database.

## Updating the Admin Panel

After making changes locally:

```bash
cd admin
npm run build
scp -i wordmaster-key.pem -r admin/dist/* \
  ubuntu@3.91.69.195:/home/ubuntu/Wordmaster/admin/dist/
```

No backend restart is needed — nginx serves the new static files immediately.
