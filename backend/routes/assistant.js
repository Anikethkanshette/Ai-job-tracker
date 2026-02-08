import { authenticateRequest } from './auth.js';
import { processAssistantMessage } from '../services/langgraph-assistant.js';

// Store conversation history per user (in-memory)
const conversationHistories = new Map();

export default async function assistantRoutes(fastify, options) {
    // Chat with AI assistant
    fastify.post('/chat', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const { message } = request.body;

            if (!message || typeof message !== 'string') {
                return reply.status(400).send({
                    error: 'Message is required and must be a string'
                });
            }

            // Get or initialize conversation history
            if (!conversationHistories.has(userId)) {
                conversationHistories.set(userId, []);
            }
            const history = conversationHistories.get(userId);

            // Process message through LangGraph
            const result = await processAssistantMessage(message, history);

            // Update conversation history
            history.push({
                role: 'user',
                content: message,
                timestamp: new Date()
            });
            history.push({
                role: 'assistant',
                content: result.response,
                timestamp: new Date()
            });

            // Keep only last 20 messages to prevent memory bloat
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }

            conversationHistories.set(userId, history);

            return {
                response: result.response,
                intent: result.intent,
                filterUpdates: result.filterUpdates,
                timestamp: new Date()
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to process message',
                message: error.message
            });
        }
    });

    // Get conversation history
    fastify.get('/history', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const history = conversationHistories.get(userId) || [];

            return {
                history,
                total: history.length
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Clear conversation history
    fastify.delete('/history', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            conversationHistories.delete(userId);

            return {
                success: true,
                message: 'Conversation history cleared'
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });
}
