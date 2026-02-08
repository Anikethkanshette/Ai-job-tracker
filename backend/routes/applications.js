import { authenticateRequest } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for applications
const applications = new Map();

export default async function applicationRoutes(fastify, options) {
    // Create new application
    fastify.post('/', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const { jobId, jobTitle, company, status = 'applied' } = request.body;

            if (!jobId || !jobTitle || !company) {
                return reply.status(400).send({
                    error: 'jobId, jobTitle, and company are required'
                });
            }

            const applicationId = uuidv4();
            const application = {
                id: applicationId,
                userId,
                jobId,
                jobTitle,
                company,
                status, // applied, interview, offer, rejected
                appliedAt: new Date(),
                updatedAt: new Date(),
                timeline: [
                    {
                        status: 'applied',
                        date: new Date(),
                        note: 'Application submitted'
                    }
                ]
            };

            applications.set(applicationId, application);

            return {
                success: true,
                application
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Get all applications for user
    fastify.get('/', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const { status } = request.query;

            let userApplications = Array.from(applications.values())
                .filter(app => app.userId === userId);

            if (status) {
                userApplications = userApplications.filter(app => app.status === status);
            }

            // Sort by most recent first
            userApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

            return {
                applications: userApplications,
                total: userApplications.length
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Update application status
    fastify.patch('/:id', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const { id } = request.params;
            const { status, note } = request.body;

            const application = applications.get(id);

            if (!application) {
                return reply.status(404).send({ error: 'Application not found' });
            }

            if (application.userId !== userId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }

            if (!status) {
                return reply.status(400).send({ error: 'Status is required' });
            }

            // Valid status transitions
            const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
            if (!validStatuses.includes(status)) {
                return reply.status(400).send({
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            // Update application
            application.status = status;
            application.updatedAt = new Date();
            application.timeline.push({
                status,
                date: new Date(),
                note: note || `Status updated to ${status}`
            });

            applications.set(id, application);

            return {
                success: true,
                application
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Delete application
    fastify.delete('/:id', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const { id } = request.params;

            const application = applications.get(id);

            if (!application) {
                return reply.status(404).send({ error: 'Application not found' });
            }

            if (application.userId !== userId) {
                return reply.status(403).send({ error: 'Forbidden' });
            }

            applications.delete(id);

            return {
                success: true,
                message: 'Application deleted'
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });
}
