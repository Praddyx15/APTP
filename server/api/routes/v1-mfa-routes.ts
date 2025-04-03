/**
 * MFA API Routes (v1)
 * 
 * This module provides API endpoints for multi-factor authentication including:
 * - TOTP setup and verification
 * - Biometric authentication
 * - Recovery codes management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../../storage';
import { logger } from '../../core';
import { insertMfaCredentialSchema, MfaCredential } from '@shared/schema';
import { z } from 'zod';
import * as mfaService from '../../services/mfa-service';
import { BiometricType } from '../../services/mfa-service';

const router = Router();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // TypeScript type guard to ensure req.user is defined throughout the rest of the route
  req.user = req.user as Express.User;
  // This assertion helps TypeScript know that req.user is definitely defined
  if (!req.user) {
    return res.status(401).json({ message: 'User not found in session' });
  }
  next();
};

/**
 * @swagger
 * /api/v1/mfa/status:
 *   get:
 *     summary: Get MFA status for the current user
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: MFA status information
 *       401:
 *         description: Unauthorized
 */
router.get('/mfa/status', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if MFA is required for this user
    const mfaRequired = mfaService.isMfaRequired(req.user);
    
    // Get user's MFA credentials
    const credentials = await storage.getMfaCredentialsByUser(userId);
    
    // Check if session has already been verified with MFA
    const sessionMfaVerified = mfaService.verifyMfaSession(req.session);
    
    // Determine MFA status
    const mfaEnabled = req.user.mfaEnabled || false;
    const mfaMethodsSet = credentials.map(cred => cred.type);
    
    res.json({
      mfaRequired,
      mfaEnabled,
      mfaVerified: sessionMfaVerified,
      mfaMethods: mfaMethodsSet,
      enforced: mfaRequired && !sessionMfaVerified && mfaEnabled
    });
  } catch (error) {
    logger.error('Error fetching MFA status', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to fetch MFA status' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/totp/setup:
 *   post:
 *     summary: Set up TOTP-based MFA
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: TOTP setup information including QR code
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/totp/setup', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate TOTP secret
    const totpSecret = await mfaService.generateTotpSecret(req.user);
    
    // Save credential to storage (not enabled yet until verification)
    const credential: MfaCredential = await storage.createMfaCredential({
      userId,
      type: 'totp',
      secret: totpSecret.secret,
      enabled: false,
      lastUsed: new Date()
    });
    
    // Also generate recovery codes
    const recoveryCodes = mfaService.generateRecoveryCodes();
    await storage.createMfaCredential({
      userId,
      type: 'recovery',
      recoveryCodes,
      enabled: false,
      lastUsed: new Date()
    });
    
    // Return the setup information
    res.json({
      credentialId: credential.id,
      qrCode: totpSecret.qrCode,
      uri: totpSecret.uri,
      recoveryCodes
    });
  } catch (error) {
    logger.error('Error setting up TOTP', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to set up TOTP' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/totp/verify:
 *   post:
 *     summary: Verify TOTP token and enable MFA
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - credentialId
 *             properties:
 *               token:
 *                 type: string
 *               credentialId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: TOTP verified and MFA enabled
 *       400:
 *         description: Invalid token
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/totp/verify', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const schema = z.object({
      token: z.string().length(6),
      credentialId: z.number()
    });
    
    // Validate request
    const { token, credentialId } = schema.parse(req.body);
    
    // Get the credential
    const credential = await storage.getMfaCredential(credentialId);
    
    // Check if credential exists and belongs to user
    if (!credential || credential.userId !== userId || credential.type !== 'totp') {
      return res.status(400).json({ message: 'Invalid credential' });
    }
    
    // Verify the token
    const isValid = credential.secret ? mfaService.validateTotpToken(token, credential.secret) : false;
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Enable TOTP credential
    await storage.updateMfaCredential(credential.id, { enabled: true });
    
    // Enable recovery codes credential
    const recoveryCredential = await storage.getMfaCredentialByUserAndType(userId, 'recovery');
    if (recoveryCredential) {
      await storage.updateMfaCredential(recoveryCredential.id, { enabled: true });
    }
    
    // Update user record to indicate MFA is enabled
    await storage.updateUser(userId, { 
      mfaEnabled: true,
      mfaMethod: 'totp'
    });
    
    // Mark session as MFA verified
    mfaService.setMfaVerified(req.session);
    
    res.json({ 
      success: true,
      message: 'TOTP verification successful. MFA is now enabled.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    logger.error('Error verifying TOTP', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to verify TOTP' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/login/verify:
 *   post:
 *     summary: Verify MFA during login
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - method
 *             properties:
 *               token:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [totp, recovery, biometric]
 *     responses:
 *       200:
 *         description: MFA verified successfully
 *       400:
 *         description: Invalid token or method
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/login/verify', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const schema = z.object({
      token: z.string(),
      method: z.enum(['totp', 'recovery', 'biometric'])
    });
    
    // Validate request
    const { token, method } = schema.parse(req.body);
    
    // Get the credential
    const credential = await storage.getMfaCredentialByUserAndType(userId, method);
    
    // Check if credential exists
    if (!credential || !credential.enabled) {
      return res.status(400).json({ message: `${method} is not set up for this user` });
    }
    
    let isValid = false;
    
    // Verify based on method
    switch (method) {
      case 'totp':
        isValid = credential.secret ? mfaService.validateTotpToken(token, credential.secret) : false;
        break;
      case 'recovery':
        isValid = credential.recoveryCodes ? mfaService.validateRecoveryCode(token, credential.recoveryCodes) : false;
        
        // If valid, remove the used recovery code
        if (isValid && credential.recoveryCodes) {
          const normalizedToken = token.replace(/-/g, '').toUpperCase();
          const updatedCodes = credential.recoveryCodes.filter(
            code => code && code.replace(/-/g, '').toUpperCase() !== normalizedToken
          );
          
          // Update recovery codes, removing the used one
          await storage.updateMfaCredential(credential.id, {
            recoveryCodes: updatedCodes,
            lastUsed: new Date()
          });
          
          // If no codes left, deactivate recovery
          if (updatedCodes.length === 0) {
            await storage.updateMfaCredential(credential.id, { enabled: false });
          }
        }
        break;
      case 'biometric':
        isValid = credential.biometricTemplate ? mfaService.verifyBiometricSample(token, credential.biometricTemplate) : false;
        break;
      default:
        return res.status(400).json({ message: 'Unsupported verification method' });
    }
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    // Update last used timestamp
    await storage.updateMfaCredential(credential.id, { lastUsed: new Date() });
    
    // Mark session as MFA verified
    mfaService.setMfaVerified(req.session);
    
    res.json({ 
      success: true, 
      message: 'MFA verification successful' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    logger.error('Error verifying MFA during login', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to verify MFA' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/biometric/register:
 *   post:
 *     summary: Register biometric template
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - template
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [fingerprint, face, voice]
 *               template:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Biometric template registered
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/biometric/register', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const schema = z.object({
      type: z.enum(['fingerprint', 'face', 'voice']),
      template: z.string(),
      deviceInfo: z.object({
        deviceId: z.string(),
        name: z.string(),
        platform: z.string()
      }).optional()
    });
    
    // Validate request
    const { type, template, deviceInfo } = schema.parse(req.body);
    
    // Process biometric template - convert string type to BiometricType enum
    const biometricType = type as BiometricType; // Type assertion
    const processedTemplate = mfaService.registerBiometricTemplate({
      type: biometricType,
      template,
      deviceInfo
    });
    
    // Check if user already has a biometric credential
    const existingCredential = await storage.getMfaCredentialByUserAndType(userId, 'biometric');
    
    if (existingCredential) {
      // Update existing credential
      await storage.updateMfaCredential(existingCredential.id, {
        biometricType: biometricType,  // Use the converted type
        biometricTemplate: processedTemplate,
        lastUsed: new Date(),
        enabled: true
      });
    } else {
      // Create new credential
      await storage.createMfaCredential({
        userId,
        type: 'biometric',
        biometricType: biometricType,  // Use the converted type
        biometricTemplate: processedTemplate,
        enabled: true,
        lastUsed: new Date()
      });
    }
    
    // Update user record to indicate MFA is enabled
    await storage.updateUser(userId, { 
      mfaEnabled: true,
      mfaMethod: 'biometric'
    });
    
    // Mark session as MFA verified
    mfaService.setMfaVerified(req.session);
    
    res.json({ 
      success: true,
      message: 'Biometric template registered successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    logger.error('Error registering biometric template', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to register biometric template' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/recovery/generate:
 *   post:
 *     summary: Generate new recovery codes
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: New recovery codes generated
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/recovery/generate', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate new recovery codes
    const recoveryCodes = mfaService.generateRecoveryCodes();
    
    // Check if user already has recovery codes
    const existingCredential = await storage.getMfaCredentialByUserAndType(userId, 'recovery');
    
    if (existingCredential) {
      // Update existing credential
      await storage.updateMfaCredential(existingCredential.id, {
        recoveryCodes,
        lastUsed: new Date(),
        enabled: true
      });
    } else {
      // Create new credential
      await storage.createMfaCredential({
        userId,
        type: 'recovery',
        recoveryCodes,
        enabled: true,
        lastUsed: new Date()
      });
    }
    
    res.json({ 
      recoveryCodes,
      message: 'New recovery codes generated successfully'
    });
  } catch (error) {
    logger.error('Error generating recovery codes', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to generate recovery codes' });
  }
});

/**
 * @swagger
 * /api/v1/mfa/disable:
 *   post:
 *     summary: Disable MFA for the user
 *     tags: [MFA]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/mfa/disable', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all MFA credentials for user
    const credentials = await storage.getMfaCredentialsByUser(userId);
    
    // Disable all credentials
    for (const credential of credentials) {
      await storage.updateMfaCredential(credential.id, { enabled: false });
    }
    
    // Update user record
    await storage.updateUser(userId, { 
      mfaEnabled: false,
      mfaMethod: null
    });
    
    res.json({ 
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    logger.error('Error disabling MFA', { userId: req.user?.id }, error as Error);
    res.status(500).json({ message: 'Failed to disable MFA' });
  }
});

export default router;