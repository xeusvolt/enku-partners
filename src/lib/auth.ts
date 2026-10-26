// Authentication & Cryptographic Utilities for Cloudflare Edge Runtime
import type { SessionData } from '../types';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Derives a PBKDF2 key from password and salt using Web Crypto API.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_BYTES * 8
  );

  return new Uint8Array(derivedBits);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hashes a plaintext password using PBKDF2 with random salt.
 * Format: `salt_hex:hash_hex`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await deriveKey(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
}

/**
 * Verifies a plaintext password against a stored `salt_hex:hash_hex` string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, expectedHashHex] = parts;
  const salt = fromHex(saltHex);
  const derivedHash = await deriveKey(password, salt);
  const derivedHex = toHex(derivedHash);

  // Constant-time string equality comparison
  if (derivedHex.length !== expectedHashHex.length) return false;
  let result = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    result |= derivedHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================
// Signed Session Management
// ============================================================

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Creates a tamper-proof signed session token.
 */
export async function createSessionToken(data: Omit<SessionData, 'exp'>, secret: string, durationSeconds = 7 * 24 * 3600): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + durationSeconds;
  const payload: SessionData = { ...data, exp };
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const enc = new TextEncoder();
  const key = await getHmacKey(secret);
  const signatureBytes = await crypto.subtle.sign('HMAC', key, enc.encode(encodedPayload));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBytes)));

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export async function verifySessionToken(token: string, secret: string): Promise<SessionData | null> {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const enc = new TextEncoder();
    const key = await getHmacKey(secret);
    const signatureStr = base64UrlDecode(encodedSignature);
    const signatureBytes = new Uint8Array(signatureStr.split('').map((c) => c.charCodeAt(0)));

    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, enc.encode(encodedPayload));
    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: SessionData = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
