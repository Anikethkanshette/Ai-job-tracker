import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resume.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import assistantRoutes from './routes/assistant.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
    logger: true
});

// CORS configuration (make origins configurable via CORS_ORIGINS env var)
const corsOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';
let corsOptions;
if (corsOriginsRaw.trim() === '*') {
    corsOptions = { origin: true, credentials: true };
} else {
    const origins = corsOriginsRaw.split(',').map(s => s.trim()).filter(Boolean);
    corsOptions = { origin: origins, credentials: true };
}
await fastify.register(cors, corsOptions);

// Multipart for file uploads
await fastify.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Static files for uploads
await fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'uploads'),
    prefix: '/uploads/'
});

// Root route - API information
fastify.get('/', async (request, reply) => {
    return {
        name: 'AI Job Tracker API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            resume: '/api/resume',
            jobs: '/api/jobs',
            applications: '/api/applications',
            assistant: '/api/assistant'
        },
        documentation: 'Visit the frontend application for full functionality'
    };
});

// Health check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(resumeRoutes, { prefix: '/api/resume' });
await fastify.register(jobRoutes, { prefix: '/api/jobs' });
await fastify.register(applicationRoutes, { prefix: '/api/applications' });
await fastify.register(assistantRoutes, { prefix: '/api/assistant' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
        error: error.message || 'Internal Server Error',
        statusCode: error.statusCode || 500
    });
});

// Start server
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`\n🚀 Server running at http://localhost:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health\n`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
