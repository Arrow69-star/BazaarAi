/**
 * BazaarAI — Google Cloud Storage Uploader
 * Uploads project files (logs, bookings, providers) to GCS
 *
 * Usage:
 *   node upload_to_gcs.js              → upload all project files
 *   node upload_to_gcs.js --logs       → upload session logs only
 *   node upload_to_gcs.js --providers  → upload providers dataset only
 *   node upload_to_gcs.js --bookings   → upload bookings DB only
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────
const PROJECT_ID   = process.env.GOOGLE_CLOUD_PROJECT_ID;
const BUCKET_NAME  = process.env.GCS_BUCKET_NAME || 'bazaarai-project-files';
const KEY_FILE     = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const ROOT         = path.join(__dirname, '..');
const LOGS_DIR     = path.join(ROOT, 'logs');
const DATA_DIR     = path.join(ROOT, 'data');

// ─── Validate ───────────────────────────────────────────────────────────────
if (!PROJECT_ID || PROJECT_ID === 'your_project_id_here') {
  console.error('❌ GOOGLE_CLOUD_PROJECT_ID not set in .env');
  process.exit(1);
}
if (!KEY_FILE || !fs.existsSync(KEY_FILE)) {
  console.error(`❌ Service account key not found at: ${KEY_FILE}`);
  console.error('   Download it from: console.cloud.google.com → IAM & Admin → Service Accounts → Keys → Add Key → JSON');
  process.exit(1);
}

// ─── Storage Client ─────────────────────────────────────────────────────────
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: KEY_FILE,
});

const bucket = storage.bucket(BUCKET_NAME);

// ─── Upload Function ─────────────────────────────────────────────────────────
async function uploadFile(localPath, remotePath) {
  const dest = `bazaarai/${remotePath}`;
  try {
    await bucket.upload(localPath, {
      destination: dest,
      metadata: {
        contentType: localPath.endsWith('.json') ? 'application/json' : 'text/plain',
        metadata: {
          uploadedBy: 'BazaarAI-Orchestrator',
          uploadedAt: new Date().toISOString(),
        }
      }
    });
    console.log(`  ✅ Uploaded: ${dest}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Failed: ${dest} — ${err.message}`);
    return false;
  }
}

async function uploadDirectory(localDir, remoteDir) {
  if (!fs.existsSync(localDir)) {
    console.log(`  ⚠️  Directory not found: ${localDir}`);
    return 0;
  }
  const files = fs.readdirSync(localDir).filter(f => f.endsWith('.json'));
  let count = 0;
  for (const file of files) {
    const success = await uploadFile(path.join(localDir, file), `${remoteDir}/${file}`);
    if (success) count++;
  }
  return count;
}

// ─── Ensure Bucket Exists ────────────────────────────────────────────────────
async function ensureBucket() {
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      await storage.createBucket(BUCKET_NAME, {
        location: 'ASIA-SOUTH1', // Mumbai — closest to Pakistan
        storageClass: 'STANDARD',
      });
      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    } else {
      console.log(`✅ Bucket found: ${BUCKET_NAME}`);
    }
  } catch (err) {
    if (err.code === 409) {
      console.log(`✅ Bucket exists: ${BUCKET_NAME}`);
    } else {
      throw err;
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const uploadLogs      = args.includes('--logs')      || args.length === 0;
  const uploadProviders = args.includes('--providers') || args.length === 0;
  const uploadBookings  = args.includes('--bookings')  || args.length === 0;
  const uploadAgents    = args.includes('--agents')    || args.length === 0;

  console.log('\n╔════════════════════════════════════════════╗');
  console.log(`║  🌩️  BazaarAI → Google Cloud Storage       ║`);
  console.log(`║  Project: ${PROJECT_ID.padEnd(33)}║`);
  console.log(`║  Bucket:  ${BUCKET_NAME.padEnd(33)}║`);
  console.log('╚════════════════════════════════════════════╝\n');

  await ensureBucket();

  let totalUploaded = 0;

  // Upload session logs
  if (uploadLogs) {
    console.log('\n📋 Uploading session logs...');
    const count = await uploadDirectory(LOGS_DIR, 'logs');
    console.log(`   ${count} log files uploaded`);
    totalUploaded += count;
  }

  // Upload providers dataset
  if (uploadProviders) {
    console.log('\n👥 Uploading providers dataset...');
    const success = await uploadFile(path.join(DATA_DIR, 'providers.json'), 'data/providers.json');
    if (success) totalUploaded++;
  }

  // Upload bookings DB
  if (uploadBookings) {
    const bookingsFile = path.join(LOGS_DIR, 'bookings_db.json');
    if (fs.existsSync(bookingsFile)) {
      console.log('\n📦 Uploading bookings database...');
      const success = await uploadFile(bookingsFile, 'data/bookings_db.json');
      if (success) totalUploaded++;
    }
  }

  // Upload agent source files (for judges to review)
  if (uploadAgents) {
    console.log('\n🤖 Uploading agent source code...');
    const agentsDir = path.join(ROOT, 'agents');
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.js'));
    for (const file of agentFiles) {
      const success = await uploadFile(path.join(agentsDir, file), `agents/${file}`);
      if (success) totalUploaded++;
    }
  }

  // List all files in bucket
  console.log('\n📂 Files in GCS bucket:\n');
  try {
    const [files] = await bucket.getFiles({ prefix: 'bazaarai/' });
    files.forEach(file => {
      const size = file.metadata.size
        ? `${(file.metadata.size / 1024).toFixed(1)} KB`
        : '—';
      console.log(`   gs://${BUCKET_NAME}/${file.name}  (${size})`);
    });
  } catch (err) {
    console.log('   Could not list files:', err.message);
  }

  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  ✅ Done! ${String(totalUploaded).padEnd(5)} files uploaded to GCS     ║`);
  console.log(`║  View: console.cloud.google.com/storage   ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
}

main().catch(err => {
  console.error('\n❌ Upload failed:', err.message);
  if (err.code === 403) {
    console.error('   → Check that your service account has "Storage Object Admin" role');
  }
  process.exit(1);
});
