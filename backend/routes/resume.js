import { authenticateRequest, getUser, updateUser } from './auth.js';
import { extractTextFromFile } from '../utils/pdf-extractor.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function resumeRoutes(fastify, options) {
    // Upload resume
    fastify.post('/upload', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({
                    error: 'No file uploaded'
                });
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'text/plain'];
            if (!allowedTypes.includes(data.mimetype)) {
                return reply.status(400).send({
                    error: 'Invalid file type. Please upload PDF or TXT files.'
                });
            }

            // Read file buffer
            const buffer = await data.toBuffer();

            // Extract text
            const resumeText = await extractTextFromFile(buffer, data.mimetype);

            if (!resumeText || resumeText.trim().length === 0) {
                return reply.status(400).send({
                    error: 'Could not extract text from file. Please ensure the file contains readable text.'
                });
            }

            // Save file
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            await fs.mkdir(uploadsDir, { recursive: true });

            const filename = `resume_${userId}_${Date.now()}${path.extname(data.filename)}`;
            const filepath = path.join(uploadsDir, filename);
            await fs.writeFile(filepath, buffer);

            // Update user
            updateUser(userId, {
                hasResume: true,
                resume: {
                    filename: data.filename,
                    filepath: filename,
                    text: resumeText,
                    uploadedAt: new Date(),
                    mimetype: data.mimetype
                }
            });

            return {
                success: true,
                message: 'Resume uploaded successfully',
                filename: data.filename
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: error.message || 'Failed to upload resume'
            });
        }
    });

    // Get resume info
    fastify.get('/', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const user = getUser(userId);

            if (!user.hasResume) {
                return reply.status(404).send({
                    error: 'No resume found'
                });
            }

            return {
                filename: user.resume.filename,
                uploadedAt: user.resume.uploadedAt,
                hasText: !!user.resume.text
            };
        } catch (error) {
            return reply.status(401).send({
                error: 'Unauthorized'
            });
        }
    });

    // Delete resume
    fastify.delete('/', async (request, reply) => {
        try {
            const userId = authenticateRequest(request, reply);
            const user = getUser(userId);

            if (user.hasResume && user.resume.filepath) {
                const filepath = path.join(__dirname, '..', 'uploads', user.resume.filepath);
                try {
                    await fs.unlink(filepath);
                } catch (err) {
                    // File might not exist, continue anyway
                    fastify.log.warn(`Could not delete file: ${filepath}`);
                }
            }

            updateUser(userId, {
                hasResume: false,
                resume: null
            });

            return {
                success: true,
                message: 'Resume deleted successfully'
            };
        } catch (error) {
            return reply.status(401).send({
                error: 'Unauthorized'
            });
        }
    });
}
