import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

// Create a single Supabase client using the service role key to bypass RLS and access private buckets.
// This MUST NOT be exposed to the frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const BUCKETS = {
  IMAGES: 'satquery-images',
  EVIDENCE: 'satquery-evidence',
  REPORTS: 'satquery-reports',
} as const;

type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * Sanitizes a storage path to prevent directory traversal and absolute paths.
 * @param path - The requested storage path
 * @returns The sanitized path
 * @throws Error if the path contains unsafe traversal segments or is absolute
 */
export function sanitizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');

  if (normalized.startsWith('/')) {
    throw new Error('Absolute paths are not allowed.');
  }

  const segments = normalized.split('/');
  for (const segment of segments) {
    if (segment === '..' || segment === '.') {
      throw new Error('Directory traversal segments (../ or ./) are not allowed.');
    }
  }

  const cleaned = segments.filter(Boolean).join('/');
  if (!cleaned) {
    throw new Error('Path cannot be empty.');
  }

  return cleaned;
}

/**
 * Uploads a file to a specified private bucket.
 * @param bucket - The name of the private bucket (e.g., BUCKETS.IMAGES)
 * @param path - The destination path within the bucket
 * @param fileBody - The file content
 * @param contentType - The MIME type of the file
 * @returns The storage path on success, throws an error on failure.
 */
export async function uploadPrivateFile(
  bucket: BucketName,
  path: string,
  fileBody: Buffer | ArrayBuffer | Blob | File | string,
  contentType?: string
): Promise<string> {
  try {
    const safePath = sanitizePath(path);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(safePath, fileBody, {
        contentType,
        upsert: true, // Overwrite if it exists
      });

    if (error) {
      throw error;
    }

    return data.path;
  } catch (err) {
    console.error(`[Storage] Failed to upload to ${bucket}/${path}:`, err);
    throw new Error(`Storage upload failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Downloads a file from a specified private bucket.
 * @param bucket - The name of the bucket
 * @param path - The path of the file to download
 * @returns A Blob containing the file data
 */
export async function downloadPrivateFile(
  bucket: BucketName,
  path: string
): Promise<Blob> {
  try {
    const safePath = sanitizePath(path);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(safePath);

    if (error) {
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`[Storage] Failed to download from ${bucket}/${path}:`, err);
    throw new Error(`Storage download failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Generates a short-lived signed URL to temporarily access a private file.
 * @param bucket - The name of the bucket
 * @param path - The path of the file
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 * @returns The signed URL
 */
export async function getPrivateFileSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const safePath = sanitizePath(path);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(safePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (err) {
    console.error(`[Storage] Failed to create signed URL for ${bucket}/${path}:`, err);
    throw new Error(`Storage signed URL creation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Deletes a file from a specified private bucket.
 * @param bucket - The name of the bucket
 * @param path - The path of the file
 */
export async function deletePrivateFile(
  bucket: BucketName,
  path: string
): Promise<void> {
  try {
    const safePath = sanitizePath(path);
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([safePath]);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error(`[Storage] Failed to delete from ${bucket}/${path}:`, err);
    throw new Error(`Storage delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ------------------------------------------------------------------
// Specific Domain Helpers
// ------------------------------------------------------------------

export async function uploadImage(path: string, fileBody: Buffer | ArrayBuffer | Blob, contentType?: string) {
  return uploadPrivateFile(BUCKETS.IMAGES, path, fileBody, contentType);
}

export async function uploadEvidence(path: string, fileBody: Buffer | ArrayBuffer | Blob, contentType?: string) {
  return uploadPrivateFile(BUCKETS.EVIDENCE, path, fileBody, contentType);
}

export async function uploadReport(path: string, fileBody: Buffer | ArrayBuffer | Blob, contentType?: string) {
  return uploadPrivateFile(BUCKETS.REPORTS, path, fileBody, contentType);
}
