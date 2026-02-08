import { authenticateRequest, getUser } from './auth.js';
import { getJobs, getJobById } from '../services/job-mock-data.js';
import { matchResumeToJob, batchMatchJobs } from '../services/langchain-matcher.js';

export default async function jobRoutes(fastify, options) {
    // Get all jobs with optional filtering
    fastify.get('/', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const user = getUser(userId);

            let jobs = getJobs();

            // Apply filters from query params
            const { role, skills, datePosted, jobType, workMode, location, matchScore } = request.query;

            if (role) {
                const roleLower = role.toLowerCase();
                jobs = jobs.filter(job => job.title.toLowerCase().includes(roleLower));
            }

            if (skills) {
                const skillsArray = Array.isArray(skills) ? skills : [skills];
                jobs = jobs.filter(job =>
                    skillsArray.some(skill =>
                        job.skills.some(jobSkill => jobSkill.toLowerCase().includes(skill.toLowerCase()))
                    )
                );
            }

            if (datePosted && datePosted !== 'any') {
                const now = new Date();
                const cutoffDate = new Date();

                switch (datePosted) {
                    case '24h':
                        cutoffDate.setHours(now.getHours() - 24);
                        break;
                    case 'week':
                        cutoffDate.setDate(now.getDate() - 7);
                        break;
                    case 'month':
                        cutoffDate.setMonth(now.getMonth() - 1);
                        break;
                }

                jobs = jobs.filter(job => new Date(job.postedDate) >= cutoffDate);
            }

            if (jobType && jobType !== 'any') {
                jobs = jobs.filter(job => job.jobType === jobType);
            }

            if (workMode && workMode !== 'any') {
                jobs = jobs.filter(job => job.workMode === workMode);
            }

            if (location) {
                const locationLower = location.toLowerCase();
                jobs = jobs.filter(job => job.location.toLowerCase().includes(locationLower));
            }

            return {
                jobs,
                total: jobs.length
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    // Get match score for a specific job
    fastify.get('/:id/match', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const user = getUser(userId);

            if (!user.hasResume) {
                return reply.status(400).send({
                    error: 'Please upload a resume first to get match scores'
                });
            }

            const job = getJobById(request.params.id);
            if (!job) {
                return reply.status(404).send({ error: 'Job not found' });
            }

            const match = await matchResumeToJob(user.resume.text, job);

            return {
                jobId: job.id,
                ...match
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to calculate match score'
            });
        }
    });

    // Batch match all jobs against resume
    fastify.post('/match-all', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const user = getUser(userId);

            if (!user.hasResume) {
                return reply.status(400).send({
                    error: 'Please upload a resume first to get match scores'
                });
            }

            const jobs = getJobs();

            // Use fast mode (skip LLM explanations) for initial load
            const matches = await Promise.all(
                jobs.map(async (job) => {
                    const match = await matchResumeToJob(user.resume.text, job, true);
                    return {
                        jobId: job.id,
                        ...match
                    };
                })
            );

            // Sort by score descending
            matches.sort((a, b) => b.score - a.score);

            return {
                matches,
                total: matches.length
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to calculate match scores'
            });
        }
    });
}
