# WordMaster AWS Deployment Guide

**Step-by-step guide for deploying to AWS**

---

## ✅ Prerequisites (You Have These)

- [x] AWS Account
- [x] IAM User created
- [x] AWS CLI installed

---

## 📋 Deployment Overview

We'll deploy:
1. **RDS PostgreSQL** - Database (managed, auto-backup)
2. **EC2 Instance** - Backend Node.js server
3. **Security Groups** - Firewall rules
4. **Elastic IP** - Static IP address (optional but recommended)

**Estimated Time**: 30-45 minutes  
**Estimated Cost**: ~$30-35/month

---

## Step 1: Configure AWS CLI ⚙️

### 1.1 Get IAM User Credentials

**IMPORTANT: Use the classic IAM service, not IAM Identity Center.** IAM Identity Center (formerly AWS SSO) is a separate service that requires SSO infrastructure and issues temporary session-based credentials. The steps below require a classic IAM user with static access keys. When searching in the AWS Console, select the service labeled just **IAM**, not "IAM Identity Center."

1. Go to AWS Console: https://console.aws.amazon.com
2. Navigate to **IAM** → **Users** (create a user here if you don't have one)
3. Click on your IAM user
4. Go to **Security credentials** tab
5. Click **Create access key**
6. Choose **Command Line Interface (CLI)**
7. **Save both**:
   - Access Key ID
   - Secret Access Key

**SECURITY WARNING: Never share your Access Key ID or Secret Access Key in chat messages, commits, pull requests, documentation, or any location other than the `aws configure` prompt in your own terminal.** If a key is ever exposed, immediately deactivate and delete it in the IAM console, then generate a new one.

### 1.2 Configure AWS CLI

```bash
aws configure
```

**Enter when prompted**:
```
AWS Access Key ID: YOUR_ACCESS_KEY_ID
AWS Secret Access Key: YOUR_SECRET_ACCESS_KEY
Default region name: us-east-1  # or your preferred region
Default output format: json
```

### 1.3 Test Configuration

```bash
# Test if it works
aws sts get-caller-identity
```

**Expected output**:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

✅ **Checkpoint**: AWS CLI configured successfully

---

## Step 2: Create Security Groups 🔒

Security groups act as firewalls. We need two:
- One for RDS (database)
- One for EC2 (server)

### 2.1 Create RDS Security Group

```bash
# Create security group for database
aws ec2 create-security-group \
  --group-name wordmaster-rds-sg \
  --description "Security group for WordMaster RDS PostgreSQL"
```

**Save the GroupId** from output (e.g., `sg-0123456789abcdef0`)

```bash
# Store it in variable for easy use
RDS_SG_ID="sg-0123456789abcdef0"  # Replace with your actual ID
```

### 2.2 Create EC2 Security Group

```bash
# Create security group for backend server
aws ec2 create-security-group \
  --group-name wordmaster-ec2-sg \
  --description "Security group for WordMaster EC2 backend"
```

**Save the GroupId** (e.g., `sg-9876543210fedcba0`)

```bash
EC2_SG_ID="sg-9876543210fedcba0"  # Replace with your actual ID
```

### 2.3 Configure Security Group Rules

```bash
# Allow EC2 to connect to RDS (PostgreSQL port 5432)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID

# Allow HTTP traffic to EC2 (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS traffic to EC2 (port 443)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow SSH to EC2 (port 22) - YOUR IP ONLY
# Get your current IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32

# Temporarily allow port 3000 for testing (we'll use nginx later)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0
```

✅ **Checkpoint**: Security groups created and configured

---

## Step 3: Create RDS PostgreSQL Database 🗄️

### 3.1 Create DB Subnet Group (Required for RDS)

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Get subnet IDs from default VPC
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text)

# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name wordmaster-db-subnet \
  --db-subnet-group-description "Subnet group for WordMaster RDS" \
  --subnet-ids $SUBNET_IDS
```

### 3.2 Create RDS PostgreSQL Instance

**This takes 5-10 minutes to create**

```bash
aws rds create-db-instance \
  --db-instance-identifier wordmaster-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username postgres \
  --master-user-password "ChangeThisPassword123!" \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name wordmaster-db-subnet \
  --publicly-accessible false \
  --backup-retention-period 7 \
  --no-multi-az \
  --storage-type gp2 \
  --db-name wordmaster
```

**⚠️ IMPORTANT**: Change the password! Use a strong password.

**Recommended password**:
```bash
# Generate strong password
openssl rand -base64 24
# Use this output as your password
```

### 3.3 Wait for Database to be Ready

```bash
# Check status (repeat until "available")
aws rds describe-db-instances \
  --db-instance-identifier wordmaster-db \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text
```

**Wait until output shows**: `available`

### 3.4 Get Database Endpoint

```bash
# Get the database endpoint (you'll need this)
aws rds describe-db-instances \
  --db-instance-identifier wordmaster-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text
```

**Save this endpoint** (e.g., `wordmaster-db.abc123xyz.us-east-1.rds.amazonaws.com`)

```bash
DB_ENDPOINT="wordmaster-db.abc123xyz.us-east-1.rds.amazonaws.com"
```

✅ **Checkpoint**: RDS PostgreSQL database created and running

---

## Step 4: Create EC2 Instance (Backend Server) 🖥️

### 4.1 Create SSH Key Pair

```bash
# Create key pair for SSH access
aws ec2 create-key-pair \
  --key-name wordmaster-key \
  --query 'KeyMaterial' \
  --output text > wordmaster-key.pem

# Set proper permissions
chmod 400 wordmaster-key.pem
```

**⚠️ IMPORTANT**: Keep `wordmaster-key.pem` safe! You need it to access the server.

### 4.2 Create EC2 Instance

```bash
# Get latest Ubuntu AMI ID for your region
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

# Create EC2 instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name wordmaster-key \
  --security-group-ids $EC2_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wordmaster-backend}]' \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}' \
  --query "Instances[0].InstanceId" \
  --output text
```

**Save the Instance ID** (e.g., `i-0123456789abcdef0`)

```bash
INSTANCE_ID="i-0123456789abcdef0"  # Replace with your actual ID
```

### 4.3 Wait for Instance to be Running

```bash
# Check status
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].State.Name" \
  --output text
```

**Wait until**: `running`

### 4.4 Get Instance Public IP

```bash
# Get public IP address
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
```

**Save this IP** (e.g., `54.123.45.67`)

```bash
SERVER_IP="54.123.45.67"  # Replace with your actual IP
```

✅ **Checkpoint**: EC2 instance created and running

---

## Step 5: Deploy Backend to EC2 🚀

### 5.1 SSH into EC2 Instance

```bash
ssh -i wordmaster-key.pem ubuntu@$SERVER_IP
```

**If connection refused**: Wait 30 seconds and try again (instance still starting up)

### 5.2 Install Node.js and Dependencies

**Run these commands ON THE EC2 SERVER**:

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install PM2 (process manager)
sudo npm install -g pm2

# Install PostgreSQL client (for database operations)
sudo apt install -y postgresql-client

# Install Git
sudo apt install -y git
```

### 5.3 Clone Your Repository

```bash
# Clone WordMaster repository
git clone https://github.com/BrokkoliX/Wordmaster.git
cd Wordmaster/backend

# Install dependencies
npm install
```

### 5.4 Configure Environment Variables

```bash
# Create production .env file
nano .env
```

**Paste this content** (update with your values):

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=wordmaster-db.abc123xyz.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=wordmaster
DB_USER=postgres
DB_PASSWORD=ChangeThisPassword123!

# JWT Configuration (GENERATE NEW SECRETS!)
JWT_SECRET=REPLACE_WITH_RANDOM_STRING_64_CHARS
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_RANDOM_STRING_64_CHARS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=*
```

**Generate JWT secrets**:
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET (run again for different value)
openssl rand -hex 32
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

### 5.5 Initialize Database Schema

```bash
# Connect to RDS and create schema
psql -h $DB_ENDPOINT -U postgres -d wordmaster -f src/config/schema.sql
```

**Enter the database password** when prompted.

**Expected**: Tables created successfully

### 5.6 Start Backend with PM2

```bash
# Start the backend
pm2 start src/server.js --name wordmaster-api

# View logs
pm2 logs wordmaster-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy the command it outputs and run it
```

### 5.7 Test Backend

```bash
# Test health endpoint
curl http://localhost:3000/health
```

**Expected response**:
```json
{
  "status": "OK",
  "timestamp": "2024-02-13T...",
  "uptime": 1.234
}
```

✅ **Checkpoint**: Backend running on EC2

---

## Step 6: Test from Outside 🌐

### 6.1 Test API from Your Computer

**Open a new terminal on your LOCAL computer**:

```bash
# Test health endpoint
curl http://YOUR_SERVER_IP:3000/health

# Test registration
curl -X POST http://YOUR_SERVER_IP:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "username": "testuser"
  }'
```

**Expected**: Should return user data and tokens

✅ **Checkpoint**: API accessible from internet

---

## Step 7: Setup Nginx (Reverse Proxy) 🔄

**Back on the EC2 server**:

### 7.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 7.2 Configure Nginx

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/wordmaster
```

**Paste this**:

```nginx
server {
    listen 80;
    server_name _;

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

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### 7.3 Enable and Start Nginx

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable WordMaster site
sudo ln -s /etc/nginx/sites-available/wordmaster /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

### 7.4 Test Nginx

```bash
# Test from server
curl http://localhost/health
```

**From your computer**:
```bash
# Test without port 3000 (nginx proxies to it)
curl http://YOUR_SERVER_IP/health
```

✅ **Checkpoint**: Nginx configured and working

---

## Step 8: Update Mobile App 📱

### 8.1 Update API URL in Mobile App

**On your LOCAL computer**:

```bash
cd WordMasterApp/src/services
nano api.js
```

**Update the API_BASE_URL**:

```javascript
// Change this line
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'http://YOUR_SERVER_IP/api';  // Update with your EC2 IP
```

**Or use your domain** if you have one:
```javascript
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.yourdomain.com/api';
```

### 8.2 Test Mobile App

```bash
# Restart Expo
cd WordMasterApp
npx expo start

# Test on your phone:
# 1. Open app
# 2. Try to register/login
# 3. Should connect to AWS backend
```

✅ **Checkpoint**: Mobile app connected to AWS

---

## Step 9: Optional - Domain & SSL 🔒

### If You Have a Domain:

1. **Point domain to EC2 IP**:
   - Add A record: `api.yourdomain.com` → Your EC2 IP
   - Wait for DNS propagation (5-30 minutes)

2. **Install SSL Certificate** (Free with Let's Encrypt):

```bash
# On EC2 server
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renew setup (certbot handles this)
```

3. **Update mobile app** to use `https://api.yourdomain.com/api`

---

## Step 10: Monitoring & Maintenance 📊

### 10.1 View Backend Logs

```bash
# SSH to server
ssh -i wordmaster-key.pem ubuntu@$SERVER_IP

# View PM2 logs
pm2 logs wordmaster-api

# View last 100 lines
pm2 logs wordmaster-api --lines 100

# View error logs only
pm2 logs wordmaster-api --err
```

### 10.2 Restart Backend

```bash
# Restart app
pm2 restart wordmaster-api

# Reload without downtime
pm2 reload wordmaster-api
```

### 10.3 Update Backend Code

```bash
# SSH to server
cd ~/Wordmaster/backend

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Restart
pm2 restart wordmaster-api
```

### 10.4 Database Backup

```bash
# Backup database (on EC2 server)
pg_dump -h $DB_ENDPOINT -U postgres wordmaster > backup_$(date +%Y%m%d).sql

# Restore (if needed)
psql -h $DB_ENDPOINT -U postgres wordmaster < backup_20240213.sql
```

---

## 💰 Cost Breakdown

### Monthly Costs:

| Service | Instance Type | Cost |
|---------|--------------|------|
| EC2 | t3.small | ~$15/month |
| RDS PostgreSQL | db.t3.micro | ~$15/month |
| Data Transfer | 10GB/month | ~$1/month |
| Elastic IP | If not used | $3.60/month |
| **Total** | | **~$31-35/month** |

### Cost Savings Tips:

1. **Use Reserved Instances** (1-year): Save 30-40%
2. **Stop instances** during development (non-production)
3. **Use RDS snapshots** instead of continuous backup
4. **Monitor with CloudWatch** (free tier)

---

## 🔧 Troubleshooting

### Issue: Can't connect to EC2

```bash
# Check security group allows your IP
aws ec2 describe-security-groups --group-ids $EC2_SG_ID

# Update your IP if changed
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32
```

### Issue: Backend can't connect to database

```bash
# Test database connection from EC2
psql -h $DB_ENDPOINT -U postgres -d wordmaster -c "SELECT 1;"

# Check RDS security group
aws ec2 describe-security-groups --group-ids $RDS_SG_ID
```

### Issue: Port 3000 not accessible

```bash
# Check if PM2 is running
pm2 list

# Check logs
pm2 logs wordmaster-api

# Check if port is listening
sudo netstat -tlnp | grep 3000
```

### Issue: Nginx not working

```bash
# Check nginx status
sudo systemctl status nginx

# Check config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## 📝 Quick Reference

### Important Endpoints:

- **Health**: `http://YOUR_IP/health`
- **Register**: `POST http://YOUR_IP/api/auth/register`
- **Login**: `POST http://YOUR_IP/api/auth/login`

### Important Files:

- **SSH Key**: `wordmaster-key.pem`
- **Nginx Config**: `/etc/nginx/sites-available/wordmaster`
- **PM2 Config**: `~/.pm2/`
- **App Location**: `~/Wordmaster/backend/`
- **Environment**: `~/Wordmaster/backend/.env`

### Important Commands:

```bash
# SSH to server
ssh -i wordmaster-key.pem ubuntu@$SERVER_IP

# View logs
pm2 logs wordmaster-api

# Restart app
pm2 restart wordmaster-api

# Update code
cd ~/Wordmaster/backend && git pull && pm2 restart wordmaster-api
```

---

## ✅ Deployment Checklist

- [ ] AWS CLI configured
- [ ] Security groups created
- [ ] RDS PostgreSQL created and available
- [ ] EC2 instance created and running
- [ ] SSH key created and saved
- [ ] Node.js installed on EC2
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] Backend running with PM2
- [ ] API tested from internet
- [ ] Nginx installed and configured
- [ ] Mobile app updated with production URL
- [ ] Mobile app tested with AWS backend
- [ ] (Optional) Domain configured
- [ ] (Optional) SSL certificate installed

---

## 🎉 Success!

Your WordMaster backend is now:
- ✅ Running on AWS
- ✅ Using managed PostgreSQL database
- ✅ Auto-restarting on crashes
- ✅ Accessible from internet
- ✅ Ready for production use

**Next Steps**:
1. Test all API endpoints
2. Test mobile app registration/login
3. Monitor logs for any issues
4. Consider setting up domain + SSL
5. Setup monitoring (CloudWatch)

---

**Need help?** Refer to troubleshooting section or AWS documentation.
