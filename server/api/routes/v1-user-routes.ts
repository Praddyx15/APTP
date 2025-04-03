/**
 * V1 User API Routes
 * 
 * This module provides the v1 API routes for user management
 * with OpenAPI documentation.
 */

import { Router } from 'express';
import { storage } from '../../storage';
import { asyncHandler } from '../../core';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: Retrieves a list of all users. Requires admin privileges.
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/users', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check authorization (only admins can list all users)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  const users = await storage.getAllUsers();
  res.json(users);
}));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieves a specific user by ID. User can only access their own data unless they are an admin.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/users/:id', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = parseInt(req.params.id);
  
  // Check authorization (users can only access their own data unless they're admin)
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  const user = await storage.getUser(userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.json(user);
}));

/**
 * @swagger
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     description: Creates a new user. Only accessible to admins.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/users', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check authorization (only admins can create users)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  try {
    // Validate request body
    const userSchema = insertUserSchema.extend({
      password: z.string().min(8, 'Password must be at least 8 characters')
    });
    
    const userData = userSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: [{ field: 'username', message: 'Username already exists' }]
      });
    }
    
    // Create the user
    const newUser = await storage.createUser(userData);
    
    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: fieldErrors
      });
    }
    
    throw error;
  }
}));

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user
 *     description: Updates a user. Users can only update their own data unless they are an admin.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/users/:id', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = parseInt(req.params.id);
  
  // Check authorization (users can only update their own data unless they're admin)
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Check if user exists
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  try {
    // Validate request body (allow partial updates)
    const updateSchema = z.object({
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      password: z.string().min(8, 'Password must be at least 8 characters').optional(),
      // Only allow role updates if user is admin
      role: req.user.role === 'admin' ? z.string().optional() : z.undefined(),
      // Only allow organization updates if user is admin
      organizationType: req.user.role === 'admin' ? z.string().optional() : z.undefined(),
      organizationId: req.user.role === 'admin' ? z.number().optional() : z.undefined(),
    });
    
    const updateData = updateSchema.parse(req.body);
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, updateData);
    
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: fieldErrors
      });
    }
    
    throw error;
  }
}));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user
 *     description: Deletes a user. Only accessible to admins.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/users/:id', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check authorization (only admins can delete users)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  const userId = parseInt(req.params.id);
  
  // Check if user exists
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Delete the user
  const result = await storage.deleteUser(userId);
  
  res.status(204).send();
}));

export default router;