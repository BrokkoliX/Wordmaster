# Domain Setup: word-master.org with AWS Route 53

This guide configures the custom domain `word-master.org` to point to the EC2 backend at `3.211.219.221` using AWS Route 53 for DNS and Let's Encrypt for SSL.

**Estimated time**: 20-30 minutes (plus up to 48 hours for name server propagation).
**Monthly cost**: $0.50 for the Route 53 hosted zone.

---

## Step 1: Create a Route 53 Hosted Zone

```bash
aws route53 create-hosted-zone \
  --name word-master.org \
  --caller-reference "wordmaster-$(date +%s)"
```

The output contains a `HostedZone.Id` and a `DelegationSet.NameServers` array. Save both values.

```bash
# Example output (yours will differ):
# "Id": "/hostedzone/Z1234567890ABC"
# "NameServers": [
#   "ns-512.awsdns-00.net",
#   "ns-1024.awsdns-00.org",
#   "ns-1536.awsdns-00.co.uk",
#   "ns-0.awsdns-00.com"
# ]
```

Store the hosted zone ID for use in later commands. The ID is the part after `/hostedzone/`.

```bash
ZONE_ID="Z1234567890ABC"   # replace with your actual ID
```

## Step 2: Update Name Servers at SiteGround

Log into SiteGround and navigate to the domain management for `word-master.org`. Replace the current name servers with the four AWS name servers from Step 1.

Remove:
```
ns1.siteground.net
ns2.siteground.net
```

Add the four values from the Route 53 output, for example:
```
ns-512.awsdns-00.net
ns-1024.awsdns-00.org
ns-1536.awsdns-00.co.uk
ns-0.awsdns-00.com
```

Name server changes can take up to 48 hours to propagate globally, but often complete within a few hours. You can check progress with `dig word-master.org NS`.

## Step 3: Add DNS Records in Route 53

Create A records that point the domain to your EC2 IP address.

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "word-master.org",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "3.211.219.221"}]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "www.word-master.org",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "3.211.219.221"}]
        }
      }
    ]
  }'
```

## Step 4: Verify DNS Resolution

Wait for the name server change to propagate, then confirm the records resolve.

```bash
# Check name servers (should show AWS NS records)
dig word-master.org NS +short

# Check A record (should return 3.211.219.221)
dig word-master.org A +short

# Test HTTP connectivity
curl -v http://word-master.org/health
```

If `dig` still returns the old name servers, wait and retry. Do not proceed to Step 5 until the A record resolves to `3.211.219.221`.

## Step 5: Update Nginx with the Domain Name

SSH into the EC2 instance and update the nginx configuration.

```bash
ssh -i wordmaster-key.pem ubuntu@3.211.219.221
```

Edit the nginx site config:

```bash
sudo nano /etc/nginx/sites-available/wordmaster
```

Replace the entire file with:

```nginx
server {
    listen 80;
    server_name word-master.org www.word-master.org;

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

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Verify with `curl http://word-master.org/health`.

## Step 6: Install SSL Certificate

Still on the EC2 instance, install certbot and request certificates.

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Request certificates (certbot updates the nginx config automatically)
sudo certbot --nginx -d word-master.org -d www.word-master.org
```

Certbot will prompt for an email address and ask you to agree to the terms of service. It will automatically modify the nginx config to handle HTTPS and redirect HTTP to HTTPS.

Verify SSL is working:

```bash
curl https://word-master.org/health
```

Certbot sets up automatic renewal via a systemd timer. Confirm it is active:

```bash
sudo systemctl status certbot.timer
```

## Step 7: Update the Codebase

Back on your local machine, update the hardcoded IP references to use the new domain.

### 7.1 Mobile App

**`mobile/app.json`** -- update the API base URL:
```json
"extra": {
  "apiBaseUrl": "https://word-master.org/api"
}
```

**`mobile/src/services/api.js`** -- update the fallback URL:
```javascript
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://word-master.org/api';
```

### 7.2 Admin Panel

**`admin/vite.config.js`** -- update the dev proxy target:
```javascript
proxy: {
  '/api': {
    target: 'https://word-master.org',
    changeOrigin: true,
  },
},
```

The admin production env files (`admin/.env.production`) already use relative paths, so no change is needed there.

### 7.3 Deploy Script

**`backend/src/scripts/deployCleanup.sh`** -- update the EC2_IP variable:
```bash
EC2_IP="3.211.219.221"
# No change needed here -- this is the SSH target, not a URL.
# But update the test curl at the bottom:
# curl https://word-master.org/api/words/count?source_lang=en&target_lang=de&cefr_level=A1
```

### 7.4 Documentation

Update references in these files:
- `docs/ADMIN_DEPLOYMENT.md`
- `docs/AWS_DEPLOYMENT_GUIDE.md`
- `QUICK_START.md`
- `CURRENT_STATUS.md`

Replace `https://3.211.219.221` with `https://word-master.org` in all URL contexts. Keep the raw IP in SSH commands (`ssh -i wordmaster-key.pem ubuntu@3.211.219.221`) since SSH uses the IP directly.

## Step 8: Deploy and Test

```bash
# Push code changes
git add -A
git commit -m "Switch API URLs from raw IP to word-master.org domain"
git push origin main

# Update EC2
ssh -i wordmaster-key.pem ubuntu@3.211.219.221
cd ~/Wordmaster && git pull origin main
cd backend && pm2 restart wordmaster-api

# Rebuild admin panel (if served from EC2)
cd ~/Wordmaster/admin && npm run build
```

Test everything:

```bash
# Health check
curl https://word-master.org/health

# API endpoint
curl https://word-master.org/api/words/count?source_lang=en&target_lang=de&cefr_level=A1

# Admin panel
# Open https://word-master.org/admin in a browser
```

Restart the mobile app with Expo and verify it connects to the new domain.

---

## Troubleshooting

**DNS not resolving**: Run `dig word-master.org NS +short` to confirm the AWS name servers are active. If it still shows SiteGround NS records, wait longer for propagation.

**Certbot fails**: Certbot validates domain ownership over HTTP on port 80. Ensure the EC2 security group allows inbound traffic on port 80 from `0.0.0.0/0` and that `server_name` in nginx matches the domain exactly.

**Mixed content warnings**: After switching to HTTPS, ensure no code references `http://3.211.219.221`. Search the codebase for the old IP and update any remaining occurrences.

**Certificate renewal fails**: Run `sudo certbot renew --dry-run` to test. If it fails, check that port 80 is still open and nginx is running.

---

## Summary

| Component | Value |
|-----------|-------|
| Domain | word-master.org |
| DNS provider | AWS Route 53 |
| Hosted zone cost | $0.50/month |
| EC2 IP | 3.211.219.221 |
| SSL provider | Let's Encrypt (free) |
| API URL | https://word-master.org/api |
| Admin URL | https://word-master.org/admin |
| Health check | https://word-master.org/health |
