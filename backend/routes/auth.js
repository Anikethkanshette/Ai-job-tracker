import { v4 as uuidv4 } from 'uuid';

// In-memory storage
const sessions = new Map();
const users = new Map();

// Fixed credentials
const VALID_EMAIL = 'test@gmail.com';
const VALID_PASSWORD = 'test@123';

export default async function authRoutes(fastify, options) {
    // Login endpoint
    fastify.post('/login', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.status(400).send({
                error: 'Email and password are required'
            });
        }

        // Validate credentials
        if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
            return reply.status(401).send({
                error: 'Invalid credentials'
            });
        }

        // Generate session token
        const token = uuidv4();
        const userId = 'user_1'; // Single user system

        sessions.set(token, {
            userId,
            email,
            createdAt: new Date()
        });

        // Initialize user if doesn't exist
        if (!users.has(userId)) {
            users.set(userId, {
                id: userId,
                email,
                hasResume: false,
                resume: null
            });
        }

        const user = users.get(userId);

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                hasResume: user.hasResume
            }
        };
    });

    // Logout endpoint
    fastify.post('/logout', async (request, reply) => {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (token) {
            sessions.delete(token);
        }

        return { success: true };
    });

    // Verify token endpoint
    fastify.get('/verify', async (request, reply) => {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (!token || !sessions.has(token)) {
            return reply.status(401).send({
                error: 'Invalid or expired token'
            });
        }

        const session = sessions.get(token);
        const user = users.get(session.userId);

        return {
            user: {
                id: user.id,
                email: user.email,
                hasResume: user.hasResume
            }
        };
    });
}

// Export for use in other routes
export function authenticateRequest(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token || !sessions.has(token)) {
        throw new Error('Unauthorized');
    }

    const session = sessions.get(token);
    return session.userId;
}

export function getUser(userId) {
    return users.get(userId);
}

export function updateUser(userId, updates) {
    const user = users.get(userId);
    if (user) {
        users.set(userId, { ...user, ...updates });
    }
    return users.get(userId);
}
