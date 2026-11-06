import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const split = trimmed.indexOf('=');
    if (split < 1) continue;
    const key = trimmed.slice(0, split).trim();
    if (process.env[key] != null) continue;
    let value = trimmed.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnv();

/**
 * Supabase Storage Configuration & Utilities for DDU Super Cup
 *
 * Implements the hybrid image storage architecture:
 * - Production: Supabase Storage bucket (ddu-super-cup-media) for all dynamic user uploads.
 * - Local / Test: Database-backed local storage adapter strictly when non-production and unconfigured.
 * - Organization:
 *     - players/group-[a-e]/[team-slug]/player-[player-id]-[timestamp].[ext]
 *     - motm/[match-id]/motm-[player-id]-[timestamp].[ext]
 *     - other/[entity-id]/[filename]
 * - Atomic replacement: upload new asset -> update database -> remove old asset if not reused.
 */

export const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ddu-super-cup-media';

export function getSupabaseConfig() {
  loadEnv();
  let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  if (!supabaseUrl && process.env.DATABASE_URL) {
    const match = process.env.DATABASE_URL.match(/postgres\.([a-zA-Z0-9_-]+)/);
    if (match) {
      supabaseUrl = `https://${match[1]}.supabase.co`;
    }
  }

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();

  return { supabaseUrl, supabaseKey, bucket };
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return Boolean(supabaseUrl && supabaseKey);
}

export function getStorageProvider() {
  const explicit = (process.env.IMAGE_STORAGE_PROVIDER || '').toLowerCase().trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = Boolean(process.env.DDU_DB);
  const hasSupabase = isSupabaseConfigured();

  if (explicit === 'supabase') {
    if (!hasSupabase) {
      if (isProduction || !isTest) {
        throw new Error('IMAGE_STORAGE_PROVIDER is set to "supabase", but Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY) are missing.');
      }
      return 'local';
    }
    return 'supabase';
  }

  if (explicit === 'local') {
    if (isProduction) {
      throw new Error('IMAGE_STORAGE_PROVIDER cannot be set to "local" in production mode.');
    }
    return 'local';
  }

  // Default behavior
  if (isProduction) {
    if (!hasSupabase) {
      throw new Error('Production environment requires Supabase Storage credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY). Local binary storage is disabled.');
    }
    return 'supabase';
  }

  // In non-production development or tests: use Supabase if credentials exist, else local adapter
  return hasSupabase ? 'supabase' : 'local';
}

let cachedClient = null;
let cachedKey = null;

export function getSupabaseClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
  }

  const keySignature = `${supabaseUrl}:::${supabaseKey}`;
  if (!cachedClient || cachedKey !== keySignature) {
    cachedClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedKey = keySignature;
  }
  return cachedClient;
}

/**
 * Builds a URL-safe, lowercase slug from an identifier or name.
 */
export function slugify(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\\\/]/g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'team';
}

/**
 * Resolves structured Supabase Storage paths for tournament entities.
 * - Players: players/group-[a-e]/[team-slug]/player-[player-id]-[timestamp].[ext]
 * - MOTM: motm/[match-id]/motm-[player-id]-[timestamp].[ext]
 * - Other: other/[entity-id]/[filename]
 */
export function buildStoragePath({ category = 'players', groupId, teamSlug = 'unknown', entityId = 'entity', filename }) {
  const cat = slugify(category);
  const ext = filename?.includes('.') ? filename.split('.').pop() : 'png';
  const ts = Date.now();

  if (cat === 'players') {
    const g = slugify(groupId || 'a').replace(/^group-/, '');
    const t = slugify(teamSlug);
    const p = slugify(entityId);
    return `players/group-${g}/${t}/player-${p}-${ts}.${ext}`;
  }

  if (cat === 'motm') {
    const m = slugify(entityId);
    return `motm/${m}/motm-${slugify(filename || 'photo')}-${ts}.${ext}`;
  }

  const ent = slugify(entityId);
  return `other/${ent}/${slugify(filename || 'image')}-${ts}.${ext}`;
}

/**
 * Validates uploaded photograph file format and size constraints.
 */
export function validateImageUpload(image) {
  if (!image) throw new Error('No image provided.');
  const contentType = String(image.contentType ?? '').toLowerCase().trim();
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(contentType)) {
    throw new Error('Only JPG, JPEG, PNG, and WebP images are allowed.');
  }

  let raw = String(image.data ?? '');
  const comma = raw.indexOf(',');
  if (raw.startsWith('data:') && comma >= 0) raw = raw.slice(comma + 1);
  const bytes = Buffer.from(raw, 'base64');

  if (!bytes.length) {
    throw new Error('The image was empty.');
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB limit
  if (bytes.length > maxBytes) {
    throw new Error('Image exceeds maximum allowed size of 5 MB.');
  }

  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extMap[contentType] || 'png';

  return { contentType, bytes, ext, base64: raw };
}

/**
 * Resolves the public URL for a Supabase Storage object.
 */
export function getPublicUrl(bucket = DEFAULT_BUCKET, path) {
  const { supabaseUrl } = getSupabaseConfig();
  if (supabaseUrl) {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const cleanPath = String(path).replace(/^\/+/, '');
    return `${cleanUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  }
  return `/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Uploads an image to Supabase Storage.
 */
export async function uploadToSupabaseStorage({ image, bucket = DEFAULT_BUCKET, path, upsert = true }) {
  const client = getSupabaseClient();
  const valid = validateImageUpload(image);

  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, valid.bytes, {
      contentType: valid.contentType,
      upsert,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const publicUrl = getPublicUrl(bucket, path);

  return {
    provider: 'supabase',
    bucket,
    path,
    publicUrl,
    format: valid.ext,
    bytes: valid.bytes.length,
    width: null,
    height: null,
    createdAt: Date.now(),
  };
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteFromSupabaseStorage(bucket = DEFAULT_BUCKET, path) {
  if (!path || !isSupabaseConfigured()) return { ok: true, skipped: true };
  try {
    const client = getSupabaseClient();
    const cleanPath = String(path).replace(/^\/+/, '');
    const { error } = await client.storage.from(bucket).remove([cleanPath]);
    if (error) {
      console.warn(`[Supabase Storage] Deletion warning for ${cleanPath}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[Supabase Storage] Deletion exception for ${path}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Generates an optimized, responsive Supabase Storage transformation URL.
 */
export function getOptimizedSupabaseUrl(urlOrPath, options = {}) {
  if (!urlOrPath) return '';
  const str = String(urlOrPath);

  // If already a full URL
  if (str.includes('/storage/v1/object/public/')) {
    const { width, height, quality = 80, resize = 'cover' } = options;
    if (!width && !height) return str;

    // Supabase image transformation endpoint
    const renderUrl = str.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const params = new URLSearchParams();
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
    if (quality) params.set('quality', String(quality));
    if (resize) params.set('resize', String(resize));
    return `${renderUrl}?${params.toString()}`;
  }

  return str;
}
