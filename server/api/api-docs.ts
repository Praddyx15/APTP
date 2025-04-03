/**
 * API Documentation Module
 * 
 * This module handles OpenAPI documentation generation and Swagger UI
 * for the Advanced Pilot Training Platform API
 */

import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../core';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Advanced Pilot Training Platform API',
    version: '1.0.0',
    description: 'API documentation for the Advanced Pilot Training Platform',
    license: {
      name: 'Proprietary',
      url: 'https://example.com/license',
    },
    contact: {
      name: 'API Support',
      url: 'https://example.com/support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API version',
    },
    {
      url: '/api',
      description: 'Legacy API endpoint (no version prefix)',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session cookie for authenticated requests',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique identifier for the user',
          },
          username: {
            type: 'string',
            description: 'Username for login',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
          },
          firstName: {
            type: 'string',
            description: 'First name',
          },
          lastName: {
            type: 'string',
            description: 'Last name',
          },
          role: {
            type: 'string',
            enum: ['admin', 'instructor', 'trainee'],
            description: 'User role',
          },
          organizationType: {
            type: 'string',
            enum: ['airline', 'flight_school', 'military', 'corporate', 'individual'],
            description: 'Type of organization the user belongs to',
          },
          organizationId: {
            type: 'integer',
            description: 'ID of the organization the user belongs to',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp',
          },
        },
        required: ['id', 'username', 'email', 'role'],
      },
      UserCreate: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'Username for login',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
          },
          password: {
            type: 'string',
            format: 'password',
            description: 'User password',
            minLength: 8,
          },
          firstName: {
            type: 'string',
            description: 'First name',
          },
          lastName: {
            type: 'string',
            description: 'Last name',
          },
          role: {
            type: 'string',
            enum: ['admin', 'instructor', 'trainee'],
            description: 'User role',
          },
          organizationType: {
            type: 'string',
            enum: ['airline', 'flight_school', 'military', 'corporate', 'individual'],
            description: 'Type of organization the user belongs to',
          },
          organizationId: {
            type: 'integer',
            description: 'ID of the organization the user belongs to',
          },
        },
        required: ['username', 'email', 'password', 'role'],
      },
      // Add more schemas for other entities
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Unauthorized',
              code: 'UNAUTHORIZED',
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Forbidden',
              code: 'FORBIDDEN',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Resource not found',
              code: 'NOT_FOUND',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              errors: [
                {
                  field: 'email',
                  message: 'Invalid email format',
                },
              ],
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Training Programs',
      description: 'Training program management',
    },
    {
      name: 'Modules',
      description: 'Course module management',
    },
    {
      name: 'Lessons',
      description: 'Lesson management',
    },
    {
      name: 'Sessions',
      description: 'Training session operations',
    },
    {
      name: 'Assessments',
      description: 'Assessment and grading operations',
    },
    {
      name: 'Documents',
      description: 'Document management and processing',
    },
    {
      name: 'Syllabus Generator',
      description: 'AI-powered syllabus generation',
    },
    {
      name: 'Knowledge Graph',
      description: 'Knowledge graph operations',
    },
  ],
  security: [
    {
      sessionAuth: [],
    },
  ],
};

// Swagger options
const swaggerOptions = {
  swaggerDefinition,
  // Path to the API docs (include all route files)
  apis: [
    './server/api/routes/*.ts',
    './server/routes.ts',
    './server/routes/*.ts',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Setup Swagger UI
export function setupApiDocs(app: Express): void {
  // Serve swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'APTP API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // Serve swagger spec as JSON for external tools
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info('API documentation initialized at /api-docs');
}

export default swaggerSpec;