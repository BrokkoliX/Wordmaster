/**
 * Upload Vocabulary Packs to AWS S3 + CloudFront
 * 
 * Prerequisites:
 * 1. AWS credentials configured (see AWS_SETUP_GUIDE.md)
 * 2. Vocabulary packs generated (run generateVocabularyPacks.js first)
 * 
 * Usage:
 *   node uploadToAWS.js
 * 
 * Or with credentials:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node uploadToAWS.js
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Configuration (from environment or .env file)
const CONFIG = {
  bucket: process.env.AWS_S3_BUCKET || 'wordmaster-vocabulary-packs',
  region: process.env.AWS_REGION || 'us-east-1',
  cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
  cloudfrontDistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
};

// Validate configuration
function validateConfig() {
  const required = ['bucket', 'region', 'accessKeyId', 'secretAccessKey'];
  const missing = required.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`  - ${key.toUpperCase()}`));
    console.error('\nPlease set environment variables or create .env file');
    console.error('See AWS_SETUP_GUIDE.md for details\n');
    process.exit(1);
  }
  
  console.log('✅ Configuration valid');
  console.log(`   Bucket: ${CONFIG.bucket}`);
  console.log(`   Region: ${CONFIG.region}`);
  console.log(`   CloudFront: ${CONFIG.cloudfrontDomain || 'Not configured'}\n`);
}

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: CONFIG.accessKeyId,
  secretAccessKey: CONFIG.secretAccessKey,
  region: CONFIG.region
});

const cloudfront = new AWS.CloudFront({
  accessKeyId: CONFIG.accessKeyId,
  secretAccessKey: CONFIG.secretAccessKey
});

// Upload a single file to S3
async function uploadFile(filePath, s3Key) {
  const fileContent = fs.readFileSync(filePath);
  const contentType = mime.lookup(filePath) || 'application/octet-stream';
  
  const params = {
    Bucket: CONFIG.bucket,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // Cache for 1 year
    ACL: 'public-read'
  };
  
  try {
    await s3.putObject(params).promise();
    return true;
  } catch (error) {
    console.error(`  ❌ Error uploading ${s3Key}:`, error.message);
    return false;
  }
}

// Upload all vocabulary packs
async function uploadAllPacks() {
  console.log('☁️  Uploading Vocabulary Packs to AWS S3\n');
  
  const packsDir = path.join(__dirname, '../../packs');
  
  if (!fs.existsSync(packsDir)) {
    console.error('❌ Packs directory not found!');
    console.error('   Run: node generateVocabularyPacks.js first\n');
    process.exit(1);
  }
  
  // Get all files in packs directory
  const files = fs.readdirSync(packsDir)
    .filter(f => f.endsWith('.zip') || f.endsWith('.json'));
  
  console.log(`Found ${files.length} files to upload\n`);
  
  let uploaded = 0;
  let failed = 0;
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(packsDir, file);
    const fileSize = fs.statSync(filePath).size;
    const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
    
    process.stdout.write(`📤 Uploading ${file} (${sizeMB} MB)... `);
    
    const success = await uploadFile(filePath, file);
    
    if (success) {
      console.log('✅');
      uploaded++;
      totalSize += fileSize;
    } else {
      console.log('❌');
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Uploaded: ${uploaded} files`);
  console.log(`❌ Failed: ${failed} files`);
  console.log(`📦 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (CONFIG.cloudfrontDomain) {
    console.log(`\n🌍 Files available at:`);
    console.log(`   https://${CONFIG.cloudfrontDomain}/metadata.json`);
    console.log(`   https://${CONFIG.cloudfrontDomain}/en-es-A1.zip`);
    console.log(`   ... etc`);
  } else {
    console.log(`\n🌍 Files available at:`);
    console.log(`   https://${CONFIG.bucket}.s3.${CONFIG.region}.amazonaws.com/metadata.json`);
  }
  
  // Update metadata.json with CloudFront URLs
  if (CONFIG.cloudfrontDomain) {
    console.log(`\n🔄 Updating metadata.json with CloudFront URLs...`);
    await updateMetadataUrls();
  }
  
  // Invalidate CloudFront cache
  if (CONFIG.cloudfrontDistributionId) {
    console.log(`\n🔄 Invalidating CloudFront cache...`);
    await invalidateCloudFront();
  }
  
  console.log(`\n✨ Done!\n`);
}

// Update metadata.json with actual CloudFront URLs
async function updateMetadataUrls() {
  const metadataPath = path.join(__dirname, '../../packs/metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.log('  ⚠️  metadata.json not found, skipping URL update');
    return;
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  
  // Update URLs
  metadata.packs = metadata.packs.map(pack => ({
    ...pack,
    url: `https://${CONFIG.cloudfrontDomain}/${pack.filename}`
  }));
  
  metadata.baseUrl = `https://${CONFIG.cloudfrontDomain}`;
  metadata.updatedForCloudFront = new Date().toISOString();
  
  // Save updated metadata
  const updatedPath = path.join(__dirname, '../../packs/metadata.cloudfront.json');
  fs.writeFileSync(updatedPath, JSON.stringify(metadata, null, 2));
  
  // Upload updated version
  await uploadFile(updatedPath, 'metadata.json');
  
  console.log('  ✅ Updated metadata.json with CloudFront URLs');
}

// Invalidate CloudFront cache so users get latest files
async function invalidateCloudFront() {
  if (!CONFIG.cloudfrontDistributionId) {
    console.log('  ⚠️  CloudFront distribution ID not configured, skipping invalidation');
    return;
  }
  
  const params = {
    DistributionId: CONFIG.cloudfrontDistributionId,
    InvalidationBatch: {
      CallerReference: `wordmaster-${Date.now()}`,
      Paths: {
        Quantity: 1,
        Items: ['/*'] // Invalidate all files
      }
    }
  };
  
  try {
    const result = await cloudfront.createInvalidation(params).promise();
    console.log(`  ✅ CloudFront invalidation created: ${result.Invalidation.Id}`);
    console.log(`  ⏱️  Invalidation typically completes in 5-10 minutes`);
  } catch (error) {
    console.error(`  ❌ Error creating CloudFront invalidation:`, error.message);
  }
}

// Main
async function main() {
  console.log('☁️  WordMaster AWS Upload Tool\n');
  
  // Load .env file if exists
  const envPath = path.join(__dirname, '../../.env.aws');
  if (fs.existsSync(envPath)) {
    console.log('📄 Loading credentials from .env.aws file\n');
    require('dotenv').config({ path: envPath });
    
    // Re-load config from env
    Object.keys(CONFIG).forEach(key => {
      const envKey = 'AWS_' + key.toUpperCase().replace(/([A-Z])/g, '_$1');
      if (process.env[envKey]) {
        CONFIG[key] = process.env[envKey];
      }
    });
  }
  
  validateConfig();
  await uploadAllPacks();
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { uploadAllPacks, uploadFile };
