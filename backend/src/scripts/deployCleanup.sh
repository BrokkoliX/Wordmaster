#!/bin/bash
# ─────────────────────────────────────────────────────────
# Deploy vocabulary cleanup to AWS
#
# Run this script from your LOCAL machine. It will:
#   1. Push latest code to GitHub
#   2. SSH to EC2 and pull the latest code
#   3. Run the cleanup on the AWS RDS database
#   4. Re-seed with the cleaned JSON data
#   5. Restart the backend service
#
# Prerequisites:
#   - Git remote configured with GitHub
#   - SSH key (wordmaster-key.pem) in project root
#   - EC2 instance running at the IP below
#
# Usage:
#   cd Wordmaster
#   bash backend/src/scripts/deployCleanup.sh
# ─────────────────────────────────────────────────────────

set -e

EC2_IP="3.211.219.221"
SSH_KEY="wordmaster-key.pem"
SSH_USER="ubuntu"
REMOTE_DIR="Wordmaster"

echo ""
echo "============================================="
echo "  WordMaster Vocabulary Cleanup Deployment"
echo "============================================="
echo ""

# Step 1: Commit and push
echo "Step 1: Pushing latest code to GitHub..."
git add -A
git commit -m "Clean vocabulary data: remove grammatical entries from JSON files and add defense-in-depth filtering" || echo "  (nothing new to commit)"
git push origin main
echo "  Done."
echo ""

# Step 2: SSH to EC2 and deploy
echo "Step 2: Deploying to EC2 ($EC2_IP)..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$EC2_IP" << 'REMOTE_COMMANDS'
set -e

cd ~/Wordmaster

echo "  Pulling latest code..."
git pull origin main

cd backend

echo "  Installing dependencies..."
npm install --production

echo ""
echo "  Step 3: Cleaning AWS database (dry-run first)..."
node src/scripts/cleanGrammaticalEntries.js

echo ""
echo "  Step 4: Applying cleanup..."
node src/scripts/cleanGrammaticalEntries.js --apply

echo ""
echo "  Step 5: Re-seeding with clean data..."
node src/scripts/seedWords.js

echo ""
echo "  Step 6: Restarting backend..."
pm2 restart wordmaster-api || pm2 start src/server.js --name wordmaster-api

echo ""
echo "  Verifying..."
pm2 list

echo ""
echo "============================================="
echo "  Deployment complete!"
echo "============================================="
REMOTE_COMMANDS

echo ""
echo "Deployment finished. Test the API:"
echo "  curl https://$EC2_IP/api/words/count?source_lang=en&target_lang=de&cefr_level=A1"
echo ""
