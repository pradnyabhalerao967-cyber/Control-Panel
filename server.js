/**
 * CENTRALIZED SAAS & LICENSE COMMAND CENTER — MASTER REST SERVER
 * 100% Supabase-powered — NO local JSON file
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// ── Global Error Guard ───────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('⚠️ [UNCAUGHT EXCEPTION GUARD]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UNHANDLED REJECTION GUARD]:', reason && reason.message ? reason.message : reason);
});

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  }
);

if (supabase.realtime) {
  try {
    supabase.realtime.on('error', (err) => {
      console.warn('Supabase Realtime socket notice:', err && err.message ? err.message : err);
    });
  } catch (e) {}
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ── In-memory cache (loaded from Supabase on startup) ────────────────────────
let db = { licenses: [] };

// ── Optional Prisma connection for local dev.db sync ─────────────────────────
let prisma = null;
let liveDbStatus = {
  connected: false,
  provider: 'Supabase Cloud (Mumbai)',
  dbPath: '',
  organization: null,
  customerCount: 0,
  productCount: 0,
  userCount: 0,
  lastSync: null
};

async function initPrisma() {
  try {
    const devDbPath = path.resolve(__dirname, '../medical-erp/prisma/dev.db');
    if (fs.existsSync(devDbPath)) {
      const { PrismaClient } = require('../medical-erp/node_modules/@prisma/client');
      prisma = new PrismaClient({
        datasources: { db: { url: 'file:' + devDbPath } }
      });

      const org = await prisma.organization.findFirst();
      const custCount = await prisma.customer.count();
      const prodCount = await prisma.product.count();
      const usrCount = await prisma.user.count();

      liveDbStatus = {
        connected: true,
        provider: 'Medical ERP SQLite (dev.db) + Supabase Cloud',
        dbPath: devDbPath,
        organization: org ? org.name : 'Apollo Healthcare & Central ERP',
        drugLicense: org ? org.drugLicense20B : 'MH-TZ-20B-784910',
        gstin: org ? org.gstin : '27AABCU9603R1ZM',
        customerCount: custCount,
        productCount: prodCount,
        userCount: usrCount,
        lastSync: new Date().toISOString()
      };

      console.log(`✅ CONNECTED TO LIVE DATABASE: ${devDbPath}`);
      console.log(`   Organization: ${liveDbStatus.organization} | Customers: ${custCount} | Products: ${prodCount}`);
      await syncLicensesToLiveDB();
      await syncCustomersToSupabase();
    } else {
      console.log(`ℹ️  Live dev.db not found — running with Supabase only.`);
    }
  } catch (err) {
    console.error('Prisma connection note:', err.message);
  }
}

// ── Sync customers from dev.db to Supabase ───────────────────────────────────
async function syncCustomersToSupabase() {
  if (!prisma) return;
  try {
    const custs = await prisma.customer.findMany();
    for (const c of custs) {
      await supabase.from('customers').upsert({
        id: c.id,
        name: c.name,
        email: c.email || (c.phone ? `${c.phone}@customer.local` : 'walkin@retail.local'),
        business_type: 'Medical'
      }, { onConflict: 'id', returning: 'minimal' });
    }
    console.log(`✅ Synced ${custs.length} customers from dev.db to Supabase.`);
  } catch (err) {
    console.error('Error syncing customers to Supabase:', err.message);
  }
}

// ── Sync licenses into local Prisma dev.db Setting table ─────────────────────
async function syncLicensesToLiveDB() {
  if (!prisma) return;
  try {
    const licenses = db.licenses || [];
    for (const lic of licenses) {
      await prisma.setting.upsert({
        where: { key: `LICENSE_${lic.license_key}` },
        update: {
          value: JSON.stringify({
            key: lic.license_key,
            customer: lic.customer_name,
            business: lic.business_type,
            plan: lic.plan_tier,
            status: lic.status,
            modules: lic.features,
            expires: lic.expiration_date
          }),
          updatedAt: new Date()
        },
        create: {
          key: `LICENSE_${lic.license_key}`,
          value: JSON.stringify({
            key: lic.license_key,
            customer: lic.customer_name,
            business: lic.business_type,
            plan: lic.plan_tier,
            status: lic.status,
            modules: lic.features,
            expires: lic.expiration_date
          }),
          description: `Central ERP license for ${lic.customer_name}`
        }
      });
    }

    await prisma.setting.upsert({
      where: { key: 'CENTRAL_LICENSE_REGISTRY_TIMESTAMP' },
      update: { value: new Date().toISOString(), updatedAt: new Date() },
      create: { key: 'CENTRAL_LICENSE_REGISTRY_TIMESTAMP', value: new Date().toISOString(), description: 'Last sync timestamp' }
    });

    liveDbStatus.lastSync = new Date().toISOString();
    console.log(`✅ Synchronized ${licenses.length} licenses into live DB.`);
  } catch (err) {
    console.error('Error syncing to live DB:', err.message);
  }
}

// ── License helpers ──────────────────────────────────────────────────────────
const registeredMachines = new Map();

function computeDaysLeft(expirationDate, fallbackDays = 0) {
  if (!expirationDate || typeof expirationDate !== 'string') return fallbackDays;
  const match = expirationDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fallbackDays;
  const expUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((expUtc - todayUtc) / 86400000);
}

function parseSeatLimit(counters) {
  if (typeof counters === 'number' && counters > 0) return Math.floor(counters);
  if (typeof counters === 'string') {
    const m = counters.match(/\d+/);
    if (m && Number(m[0]) > 0) return Number(m[0]);
  } else if (counters && typeof counters === 'object') {
    const num = Number(counters.pcs || counters.seats || counters.devices || 1);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
  }
  return 1;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchSupabaseLicenses() {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase fetch error:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    ...row,
    days_left: computeDaysLeft(row.expiration_date, Number(row.days_left || 0))
  }));
}

async function upsertSupabaseLicense(lic) {
  // Only use columns that exist in the Supabase table
  const row = {
    license_key: lic.license_key || lic.key,
    customer_name: lic.customer_name || lic.name,
    business_type: lic.business_type || (lic.type === 'gym' ? 'Gym' : 'Medical'),
    plan_tier: lic.plan_tier || lic.plan || 'PRO',
    status: lic.status || 'Active',
    expiration_date: lic.expiration_date || lic.expiryDate,
    days_left: lic.days_left !== undefined ? lic.days_left : (lic.daysLeft || 30),
    counters: typeof lic.counters === 'object' ? JSON.stringify(lic.counters) : (lic.counters || '1 PC'),
    features: lic.features || lic.modules || {},
    created_at: lic.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('licenses')
    .upsert(row, { onConflict: 'license_key', returning: 'minimal' });

  if (error) {
    console.error('Supabase upsert error:', error.message);
    return error;
  }
  console.log(`✅ Supabase upserted: ${lic.license_key}`);
  return null;
}

async function deleteSupabaseLicense(license_key) {
  const { error } = await supabase.from('licenses').delete().eq('license_key', license_key);
  if (error) {
    console.error('Supabase delete error:', error.message);
    return error;
  }
  return null;
}

// ── Load database from Supabase on startup ───────────────────────────────────
async function loadDatabase() {
  try {
    const remote = await fetchSupabaseLicenses();
    db = { licenses: remote };
    console.log(`✅ Loaded ${remote.length} licenses from Supabase`);
  } catch (e) {
    console.error('Error loading DB from Supabase:', e.message);
    db = { licenses: [] };
  }
}

// ── Utility functions ────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (err) { resolve({}); }
    });
    req.on('error', err => reject(err));
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Passcode'
  });
  res.end(JSON.stringify(data));
}

// ── Initialize ───────────────────────────────────────────────────────────────
loadDatabase();
initPrisma();

// ══════════════════════════════════════════════════════════════════════════════
// HTTP SERVER
// ══════════════════════════════════════════════════════════════════════════════
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Passcode'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // ── API ROUTES ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const requiredPasscode = (process.env.ADMIN_PASSCODE || '').trim();
    const isPublicEndpoint = pathname === '/api/license/verify';
    if (requiredPasscode && !isPublicEndpoint) {
      const provided = String(req.headers['x-admin-passcode'] || '').trim();
      if (provided !== requiredPasscode) {
        return sendJSON(res, 401, { success: false, error: 'Admin passcode required' });
      }
    }
    try {

      // ── DB STATUS ──
      if (pathname === '/api/db/status' && method === 'GET') {
        return sendJSON(res, 200, {
          success: true,
          status: liveDbStatus,
          licensesCount: (db.licenses || []).length
        });
      }

      // ── DB SYNC ──
      if (pathname === '/api/db/sync' && method === 'POST') {
        await syncLicensesToLiveDB();
        await syncCustomersToSupabase();
        return sendJSON(res, 200, {
          success: true,
          message: 'Synchronized licenses and customers to Supabase & local DB.',
          status: liveDbStatus
        });
      }

      // ── GET CUSTOMERS (SUPABASE CLOUD) ──
      if (pathname === '/api/customers' && method === 'GET') {
        const { data, error } = await supabase.from('customers').select('*');
        return sendJSON(res, 200, { success: !error, customers: data || [] });
      }

      // ── GET ALL LICENSES ──
      if (pathname === '/api/licenses' && method === 'GET') {
        // Always fetch fresh from Supabase
        const fresh = await fetchSupabaseLicenses();
        db.licenses = fresh;
        return sendJSON(res, 200, { success: true, licenses: fresh });
      }

      // ── CREATE NEW LICENSE ──
      if (pathname === '/api/licenses/create' && method === 'POST') {
        const body = await parseBody(req);
        const newLic = body;

        // Auto-generate missing fields
        if (!newLic.id) newLic.id = Date.now().toString();
        if (!newLic.license_key) newLic.license_key = 'LIC-' + newLic.id;
        const now = new Date().toISOString();
        if (!newLic.created_at) newLic.created_at = now;
        newLic.updated_at = now;
        newLic.days_left = newLic.days_left !== undefined ? newLic.days_left : 0;
        newLic.features = newLic.features || {};
        newLic.status = newLic.status || 'Active';

        // Save to Supabase (single source of truth)
        const upsertErr = await upsertSupabaseLicense(newLic);
        if (upsertErr) {
          return sendJSON(res, 500, { success: false, error: upsertErr.message });
        }

        // Update in-memory cache
        db.licenses.unshift(newLic);

        // Optional: sync to local Prisma dev.db
        await syncLicensesToLiveDB();

        return sendJSON(res, 201, { success: true, license: newLic });
      }

      // ── UPDATE LICENSE ──
      if (pathname === '/api/licenses/update' && method === 'PUT') {
        const body = await parseBody(req);
        const {
          license_id, status, extend_days, features,
          customer_name, plan_tier, counters, days_left, expiration_date
        } = body;
        let lic = (db.licenses || []).find(
          l => l.id === license_id || l.license_key === license_id
        );
        if (!lic) {
          await loadDatabase();
          lic = (db.licenses || []).find(
            l => l.id === license_id || l.license_key === license_id
          );
        }

        if (!lic) {
          return sendJSON(res, 404, { success: false, error: 'License not found' });
        }

        if (status) lic.status = status;
        if (customer_name) lic.customer_name = customer_name;
        if (plan_tier) lic.plan_tier = plan_tier;
        if (counters) lic.counters = counters;
        if (days_left !== undefined) lic.days_left = parseInt(days_left, 10);
        if (expiration_date) lic.expiration_date = expiration_date;
        if (extend_days && days_left === undefined) {
          lic.days_left = (lic.days_left || 0) + parseInt(extend_days, 10);
          const cur = new Date();
          cur.setDate(cur.getDate() + lic.days_left);
          lic.expiration_date = cur.toISOString().slice(0, 10);
          if (lic.status === 'Deactivated' && lic.days_left > 0) lic.status = 'Active';
        }
        if (features) {
          lic.features = Object.assign(lic.features || {}, features);
        }
        lic.updated_at = new Date().toISOString();

        // Persist to Supabase
        const upsertErr = await upsertSupabaseLicense(lic);
        if (upsertErr) {
          return sendJSON(res, 500, { success: false, error: upsertErr.message });
        }
        await syncLicensesToLiveDB();

        return sendJSON(res, 200, { success: true, license: lic });
      }

      // ── FEATURE TOGGLE ──
      if (pathname === '/api/features/toggle' && method === 'POST') {
        const body = await parseBody(req);
        const { license_id, feature_key, enabled } = body;
        let lic = (db.licenses || []).find(
          l => l.id === license_id || l.license_key === license_id
        );
        if (!lic) {
          await loadDatabase();
          lic = (db.licenses || []).find(
            l => l.id === license_id || l.license_key === license_id
          );
        }

        if (!lic) {
          return sendJSON(res, 404, { success: false, error: 'License not found' });
        }

        if (!lic.features) lic.features = {};
        lic.features[feature_key] = !!enabled;
        lic.updated_at = new Date().toISOString();

        // Persist to Supabase
        const upsertErr = await upsertSupabaseLicense(lic);
        if (upsertErr) {
          return sendJSON(res, 500, { success: false, error: upsertErr.message });
        }
        await syncLicensesToLiveDB();

        return sendJSON(res, 200, { success: true, license: lic });
      }

      // ── LICENSE VERIFICATION ──
      if (pathname === '/api/license/verify' && method === 'POST') {
        const body = await parseBody(req);
        const { license_key, machine_id } = body;
        const fresh = await fetchSupabaseLicenses();
        if (fresh.length) db.licenses = fresh;
        const lic = (db.licenses || []).find(l => l.license_key === license_key);
        if (!lic) {
          return sendJSON(res, 404, { valid: false, error: 'License key not registered in central KMS' });
        }
        const computedDaysLeft = computeDaysLeft(lic.expiration_date, Number(lic.days_left || 0));
        const isExpired = computedDaysLeft <= 0;
        const seatsMax = parseSeatLimit(lic.counters);
        const machineSet = registeredMachines.get(license_key) || new Set();
        let seatLimitReached = false;

        if (machine_id && typeof machine_id === 'string' && machine_id.trim()) {
          const cleanId = machine_id.trim();
          if (!machineSet.has(cleanId)) {
            if (machineSet.size >= seatsMax) {
              seatLimitReached = true;
            } else {
              machineSet.add(cleanId);
              registeredMachines.set(license_key, machineSet);
            }
          }
        }

        const isValid = lic.status === 'Active' && !isExpired && !seatLimitReached;
        return sendJSON(res, 200, {
          valid: isValid,
          expired: isExpired,
          seat_limit_reached: seatLimitReached,
          seats_max: seatsMax,
          seats_used: machineSet.size,
          registered_machines: Array.from(machineSet),
          status: lic.status,
          customer_name: lic.customer_name,
          plan: lic.plan_tier,
          expiration_date: lic.expiration_date,
          days_left: computedDaysLeft,
          features: lic.features,
          db_source: 'Supabase Cloud'
        });
      }

      // ── DELETE LICENSE ──
      if (pathname === '/api/licenses/delete' && method === 'DELETE') {
        const body = await parseBody(req);
        const { license_key } = body;
        const deleteErr = await deleteSupabaseLicense(license_key);
        if (deleteErr) {
          return sendJSON(res, 500, { success: false, error: deleteErr.message });
        }
        db.licenses = db.licenses.filter(l => l.license_key !== license_key);
        return sendJSON(res, 200, { success: true, message: `Deleted ${license_key}` });
      }

      // ── DEFAULT API FALLBACK ──
      return sendJSON(res, 200, { success: true, message: 'Central ERP REST API Online' });

    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // ── STATIC FILE SERVING ──────────────────────────────────────────────────
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, path.normalize(safePath).replace(/^(\.\.[\/\\])+/, ''));
  if (!fs.existsSync(filePath)) {
    const rootPath = path.join(__dirname, safePath);
    if (fs.existsSync(rootPath)) filePath = rootPath;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// ── Start server with automatic port-fallback ─────────────────────────────
function startServer(portToUse) {
  server.removeAllListeners('error');
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(portToUse) + 1;
      console.warn(`⚠️ Port ${portToUse} is occupied (by Medical ERP or another process). Trying port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('❌ Server error:', err.message);
    }
  });

  server.listen(portToUse, () => {
    console.log(`\n======================================================`);
    console.log(`  Central ERP License Dashboard live at:`);
    console.log(`  http://localhost:${portToUse}`);
    console.log(`  Database: Supabase Cloud (ntrcrrcehrclogpqawzn)`);
    console.log(`======================================================\n`);
  });
}

startServer(PORT);
