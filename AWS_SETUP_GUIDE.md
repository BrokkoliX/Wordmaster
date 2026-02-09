# ☁️ AWS Setup Guide for WordMaster Production

## What You Need to Set Up on AWS

### **Option A: S3 + CloudFront** (Recommended - ~$1-5/month)

This is the best AWS solution for serving vocabulary packs globally with fast CDN.

---

## 🚀 Step-by-Step AWS Setup

### **Step 1: Create S3 Bucket** (5 minutes)

1. **Login to AWS Console**: https://console.aws.amazon.com/

2. **Go to S3**: Search for "S3" in the top search bar

3. **Create Bucket**:
   - Click "Create bucket"
   - **Bucket name**: `wordmaster-vocabulary-packs` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `us-east-1` for US/global)
   - **Block Public Access**: ❌ UNCHECK "Block all public access"
     - ✅ Check the acknowledgment box
   - **Bucket Versioning**: ✅ Enable (optional but recommended)
   - **Encryption**: Keep default (AES-256)
   - Click "Create bucket"

4. **Configure Bucket for Public Read**:
   - Click on your bucket name
   - Go to "Permissions" tab
   - Scroll to "Bucket policy"
   - Click "Edit" and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::wordmaster-vocabulary-packs/*"
    }
  ]
}
```
   - Click "Save changes"

5. **Enable CORS** (for mobile app access):
   - Still in "Permissions" tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
   - Click "Save changes"

---

### **Step 2: Create CloudFront Distribution** (10 minutes)

CloudFront is AWS's CDN - it caches your vocabulary packs globally for fast downloads.

1. **Go to CloudFront**: Search for "CloudFront" in AWS Console

2. **Create Distribution**:
   - Click "Create distribution"
   
   **Origin settings**:
   - **Origin domain**: Select your S3 bucket from dropdown
   - **Name**: Keep auto-generated
   - **Origin access**: Choose "Origin access control settings (recommended)"
   - Click "Create new OAC"
     - **Name**: `wordmaster-oac`
     - Click "Create"
   - **Enable Origin Shield**: No (not needed for this use case)
   
   **Default cache behavior**:
   - **Viewer protocol policy**: "Redirect HTTP to HTTPS"
   - **Allowed HTTP methods**: "GET, HEAD"
   - **Cache policy**: "CachingOptimized"
   - **Origin request policy**: None
   
   **Settings**:
   - **Price class**: "Use only North America and Europe" (cheaper)
   - **Alternate domain name (CNAME)**: Leave empty for now (can add custom domain later)
   - **SSL Certificate**: "Default CloudFront Certificate"
   - **Description**: "WordMaster Vocabulary Packs CDN"
   
   - Click "Create distribution"

3. **Update S3 Bucket Policy** (CloudFront will show a banner):
   - After creating, you'll see a blue banner saying "S3 bucket policy needs to be updated"
   - Click "Copy policy"
   - Go back to your S3 bucket → Permissions → Bucket policy
   - **Replace** the previous policy with the new one from CloudFront
   - Click "Save changes"

4. **Note your CloudFront URL**:
   - Back in CloudFront, find your distribution
   - Copy the "Distribution domain name" (looks like: `d1234abcd.cloudfront.net`)
   - **This is your CDN URL!** ✅

---

### **Step 3: Create IAM User for Upload Access** (5 minutes)

You need credentials to upload vocabulary packs programmatically.

1. **Go to IAM**: Search for "IAM" in AWS Console

2. **Create Policy First**:
   - Click "Policies" in left sidebar
   - Click "Create policy"
   - Click "JSON" tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::wordmaster-vocabulary-packs",
        "arn:aws:s3:::wordmaster-vocabulary-packs/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```
   - Click "Next: Tags" → Skip
   - Click "Next: Review"
   - **Name**: `WordMasterVocabularyUploader`
   - Click "Create policy"

3. **Create User**:
   - Click "Users" in left sidebar
   - Click "Add users"
   - **User name**: `wordmaster-uploader`
   - **Access type**: ✅ "Programmatic access" (NOT console access)
   - Click "Next: Permissions"
   - **Attach existing policies directly**
   - Search for "WordMasterVocabularyUploader"
   - ✅ Check the box next to it
   - Click "Next: Tags" → Skip
   - Click "Next: Review"
   - Click "Create user"

4. **IMPORTANT - Save Credentials**:
   - You'll see a screen with:
     - **Access key ID**: `AKIA...`
     - **Secret access key**: `wJalrXUtnFE...` (click "Show" to see it)
   - ⚠️ **SAVE THESE NOW!** You can only see the secret once!
   - Click "Download .csv" to save them
   - Store securely (password manager, env file, etc.)

---

### **Step 4: Provide Me With These Details**

Once you've completed the above, send me:

```
AWS_S3_BUCKET=wordmaster-vocabulary-packs
AWS_REGION=us-east-1 (or whatever you chose)
AWS_ACCESS_KEY_ID=AKIA... (from Step 3)
AWS_SECRET_ACCESS_KEY=wJalrXUt... (from Step 3)
AWS_CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net (from Step 2)
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234ABCD (from CloudFront console)
```

**How to find CloudFront Distribution ID**:
- Go to CloudFront console
- Click on your distribution
- The ID is in the top (looks like `E1234ABCD5678`)

---

## 🔐 Security Best Practices

### **For the credentials you'll send me**:

**Option 1: Environment File** (Recommended):
Create a file: `.env.aws` (I'll add to .gitignore)
```bash
# AWS Credentials for WordMaster Vocabulary Upload
AWS_S3_BUCKET=wordmaster-vocabulary-packs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUt...
AWS_CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234ABCD
```

**Option 2: AWS CLI Profile** (Also good):
```bash
# Install AWS CLI if you haven't
brew install awscli  # or apt-get install awscli

# Configure profile
aws configure --profile wordmaster
# Enter the credentials when prompted
```

**Option 3: Paste in Chat** (Less secure but okay for dev):
Just paste them in our chat - I'll use them to set up the scripts and then you can rotate them later.

---

## 💰 AWS Cost Estimate

### **Monthly Costs**:

**S3 Storage**:
- 120 packs × 5 MB average = 600 MB
- Cost: $0.023/GB = **$0.01/month** ✅

**S3 Requests**:
- 10,000 downloads/month
- Cost: $0.0004 per 1,000 requests = **$0.004/month** ✅

**CloudFront**:
- 1 GB downloads/month (10,000 users × 100 KB average)
- First 1 TB/month: $0.085/GB
- Cost: **$0.09/month** ✅

**Total: ~$0.10/month for 10,000 downloads** 🎉

For 100,000 users: ~$5-10/month
For 1,000,000 users: ~$50-100/month

**Much cheaper than alternatives!**

---

## 🎯 Alternative: GitHub Releases (Still FREE!)

If AWS seems too complex, we can still use GitHub Releases:

**Pros**:
- ✅ Completely FREE
- ✅ Unlimited bandwidth
- ✅ Global CDN
- ✅ No AWS account needed
- ✅ Perfect for open source

**Cons**:
- ⚠️ Manual upload process
- ⚠️ Less control over CDN
- ⚠️ No analytics

**To use GitHub Releases instead**:
Just create a public repo `wordmaster-data` and give me access to create releases.

---

## 📋 What I'll Implement Once You Provide Credentials

1. **Pack Generator Script** ✅
   - Creates 120+ vocabulary packs from your database
   - Compresses to ZIP
   - Generates metadata.json

2. **AWS Upload Script** ✅
   - Uploads all packs to S3
   - Sets correct permissions
   - Invalidates CloudFront cache
   - Uploads metadata.json

3. **Download Manager Service** ✅
   - Downloads packs from CloudFront
   - Shows progress
   - Verifies integrity
   - Handles errors/retry

4. **Settings UI Integration** ✅
   - Language selection
   - Download progress
   - Storage management

5. **Testing** ✅
   - Test download flow
   - Test offline behavior
   - Test pack switching

---

## 🚀 Quick Start (Copy-Paste)

### **For you to run in AWS Console**:

```bash
# 1. Create S3 bucket (AWS Console → S3)
Bucket name: wordmaster-vocabulary-packs
Region: us-east-1
Uncheck "Block all public access"

# 2. Add bucket policy (Permissions tab)
# Copy policy from Step 1 above

# 3. Add CORS config (Permissions tab)
# Copy CORS from Step 1 above

# 4. Create CloudFront distribution (AWS Console → CloudFront)
Origin: Select your S3 bucket
Viewer protocol: Redirect HTTP to HTTPS

# 5. Create IAM user (AWS Console → IAM → Users)
Name: wordmaster-uploader
Access: Programmatic access only
Attach custom policy from Step 3 above

# 6. Save credentials and send to me!
```

---

## ✅ Checklist

Before I can implement, please complete:

- [ ] Create S3 bucket: `wordmaster-vocabulary-packs`
- [ ] Configure bucket policy (public read)
- [ ] Enable CORS on bucket
- [ ] Create CloudFront distribution
- [ ] Update S3 policy for CloudFront
- [ ] Create IAM policy for uploads
- [ ] Create IAM user: `wordmaster-uploader`
- [ ] Save access credentials
- [ ] Send me the 6 values listed in Step 4

**Estimated time**: 20-30 minutes if following guide

---

## 🎯 Once I Have Credentials

**Timeline**:
- **Day 1**: Set up upload scripts, create all packs, upload to S3
- **Day 2**: Implement download manager in app
- **Day 3**: Integrate with Settings UI
- **Day 4**: Testing and optimization
- **Day 5**: Production ready!

**Deliverables**:
1. ✅ All 120+ packs uploaded to CloudFront
2. ✅ App updated with download manager
3. ✅ Settings screen with language selection
4. ✅ Progress tracking and offline support
5. ✅ Documentation for maintenance

---

## 📞 Questions?

Common questions:

**Q: Can I use an existing AWS account?**
A: Yes! Just create the new S3 bucket and IAM user in your existing account.

**Q: Do I need a custom domain?**
A: No! CloudFront gives you a URL like `d1234.cloudfront.net` which works great.

**Q: Can I add a custom domain later?**
A: Yes! You can add `vocabulary.wordmaster.com` later in CloudFront settings.

**Q: What if I mess up the setup?**
A: No problem! Just send me what you have and I'll help debug.

**Q: Is there a cheaper option?**
A: GitHub Releases is FREE! But AWS gives you more control and analytics.

---

**Ready when you are!** Just send me those 6 values and I'll implement the production solution! 🚀

Or let me know if you prefer GitHub Releases instead (completely free, no AWS needed).
