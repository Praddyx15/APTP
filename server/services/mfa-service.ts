/**
 * Multi-Factor Authentication Service
 *
 * This service provides MFA capabilities:
 * - TOTP (Time-based One-Time Password) generation and validation
 * - QR code generation for TOTP setup
 * - Biometric authentication integration
 * - Recovery codes management
 * - Session verification with MFA status
 */

import * as crypto from 'crypto';
import QRCode from 'qrcode';
import { User } from '@shared/schema';
import { Express } from 'express';

export enum MfaType {
  TOTP = 'totp',
  BIOMETRIC = 'biometric',
  RECOVERY = 'recovery'
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  VOICE = 'voice'
}

export interface MfaSecret {
  secret: string;
  uri: string;
  qrCode: string;
}

export interface BiometricData {
  type: BiometricType;
  template: string;
  deviceInfo?: {
    deviceId: string;
    name: string;
    platform: string;
  };
}

const MFA_SESSION_KEY = 'mfa_verified';
const TOTP_WINDOW = 1; // Allow 1 time step before/after current time
const TOTP_STEP = 30; // 30 seconds per step
const TOTP_DIGITS = 6; // 6 digit code
const TOTP_ALGORITHM = 'sha1';

/**
 * Generate a new TOTP secret for a user
 */
export async function generateTotpSecret(user: Express.User): Promise<MfaSecret> {
  // Generate a random secret key (base32 encoded)
  const buffer = crypto.randomBytes(20);
  const secret = buffer.toString('base64').replace(/=/g, '');
  
  // Create the URI for TOTP apps
  const issuer = encodeURIComponent('Aviation Training Platform');
  const account = encodeURIComponent(`${user.username}@${user.organizationType || 'aviation'}`);
  const uri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
  
  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(uri);
  
  return { secret, uri, qrCode };
}

/**
 * Validate a TOTP token against a secret
 */
export function validateTotpToken(token: string, secret: string): boolean {
  if (!token || !secret || token.length !== TOTP_DIGITS) {
    return false;
  }
  
  const normalizedToken = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }
  
  const currentStep = Math.floor(Date.now() / 1000 / TOTP_STEP);
  
  // Check current time and adjacent time steps based on TOTP_WINDOW
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const expectedToken = generateTotpToken(Buffer.from(secret, 'base64'), currentStep + i);
    if (expectedToken === normalizedToken) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a TOTP token for a given time
 */
function generateTotpToken(secret: Buffer, time: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(time), 0);
  
  const hmac = crypto.createHmac(TOTP_ALGORITHM, secret);
  hmac.update(buffer);
  const digest = hmac.digest();
  
  // Calculate the offset
  const offset = digest[digest.length - 1] & 0xf;
  
  // Calculate the code
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff);
  
  // Generate the token by taking modulo 10^TOTP_DIGITS
  const token = code % Math.pow(10, TOTP_DIGITS);
  
  // Pad with leading zeros
  return token.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Generate recovery codes for a user
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 4 groups of 4 alphanumeric characters
    const code = [
      crypto.randomBytes(2).toString('hex').toUpperCase(),
      crypto.randomBytes(2).toString('hex').toUpperCase(),
      crypto.randomBytes(2).toString('hex').toUpperCase(),
      crypto.randomBytes(2).toString('hex').toUpperCase()
    ].join('-');
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * Validate a recovery code
 */
export function validateRecoveryCode(code: string, storedCodes: string[]): boolean {
  if (!code || !storedCodes || storedCodes.length === 0) {
    return false;
  }
  
  // Normalize code (remove spaces, dashes, and convert to uppercase)
  const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
  
  // Check if the normalized code exists in the stored codes
  return storedCodes.some(storedCode => {
    const normalizedStoredCode = storedCode.replace(/[\s-]/g, '').toUpperCase();
    return normalizedStoredCode === normalizedCode;
  });
}

/**
 * Register a new biometric template
 * In a real system, this would securely process and store the biometric template
 * For this prototype, we'll do basic processing for demonstration
 */
export function registerBiometricTemplate(data: BiometricData): string {
  // In a real system, we would:
  // 1. Validate the biometric data format
  // 2. Extract features from raw biometric data
  // 3. Apply encryption/hashing to protect the template
  // 4. Store a secure representation of the template
  
  // For this prototype, we'll just simulate processing by adding a prefix
  // In a real system, NEVER store raw biometric data like this
  const processedTemplate = `PROCESSED_${data.type}_${Date.now()}_${data.template.substring(0, 100)}`;
  
  return processedTemplate;
}

/**
 * Verify a biometric sample against a stored template
 * In a real system, this would use advanced matching algorithms
 * For this prototype, we'll do basic comparison for demonstration
 */
export function verifyBiometricSample(sample: string, template: string): boolean {
  // In a real system, we would:
  // 1. Extract features from the biometric sample
  // 2. Compare against the stored template using appropriate algorithms
  // 3. Apply matching threshold to determine authenticity
  
  // For this prototype, we'll check if the template contains parts of the sample
  // This is NOT secure and is only for demonstration
  if (!sample || !template) {
    return false;
  }
  
  // Extract the timestamp from the template (added during registerBiometricTemplate)
  const templateParts = template.split('_');
  if (templateParts.length < 4) {
    return false;
  }
  
  // Simple check if the sample contains the last part of the template
  // In a real system, this would be a complex biometric matching algorithm
  return sample.includes(templateParts[3].substring(0, 20));
}

/**
 * Check if MFA is required for a specific user
 */
export function isMfaRequired(user: Express.User): boolean {
  // Admins always require MFA
  if (user.role === 'admin') {
    return true;
  }
  
  // Check organization-specific requirements
  if (user.organizationType === 'Airline' || user.organizationType === 'Military') {
    return true;
  }
  
  // Instructors require MFA
  if (user.role === 'instructor') {
    return true;
  }
  
  // For now, trainees don't require MFA by default
  return false;
}

/**
 * Set the MFA verification status in the session
 */
export function setMfaVerified(session: any): void {
  if (session) {
    session[MFA_SESSION_KEY] = {
      verified: true,
      timestamp: Date.now(),
    };
  }
}

/**
 * Check if the session has MFA verification
 */
export function verifyMfaSession(session: any): boolean {
  if (!session || !session[MFA_SESSION_KEY]) {
    return false;
  }
  
  const mfaSession = session[MFA_SESSION_KEY];
  
  // Verify that the session was verified and that it hasn't expired
  // For security, we require re-verification after 12 hours
  const twelveHours = 12 * 60 * 60 * 1000;
  return mfaSession.verified && (Date.now() - mfaSession.timestamp) < twelveHours;
}

/**
 * Clear the MFA verification status from the session
 */
export function clearMfaVerification(session: any): void {
  if (session && session[MFA_SESSION_KEY]) {
    delete session[MFA_SESSION_KEY];
  }
}