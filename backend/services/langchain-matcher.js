import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini models
const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-pro',
    temperature: 0.3
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'embedding-001'
});

// Cache for embeddings to improve performance
const embeddingCache = new Map();

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Get embedding for text with caching
 */
async function getEmbedding(text, cacheKey) {
    if (embeddingCache.has(cacheKey)) {
        return embeddingCache.get(cacheKey);
    }

    const embedding = await embeddings.embedQuery(text);
    embeddingCache.set(cacheKey, embedding);
    return embedding;
}

/**
 * Match a resume against a job description using LangChain
 * Returns match score (0-100) and detailed explanation
 */
export async function matchResumeToJob(resumeText, job, skipExplanation = false) {
    try {
        // Create comprehensive job text for embedding
        const jobText = `
      Job Title: ${job.title}
      Company: ${job.company}
      Description: ${job.description}
      Required Skills: ${job.skills.join(', ')}
      Job Type: ${job.jobType}
      Work Mode: ${job.workMode}
      Location: ${job.location}
    `.trim();

        // Get embeddings for resume and job
        const resumeEmbedding = await getEmbedding(resumeText, `resume_${resumeText.substring(0, 100)}`);
        const jobEmbedding = await getEmbedding(jobText, `job_${job.id}`);

        // Calculate semantic similarity (0-1)
        const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);

        // Convert to percentage score (0-100)
        const baseScore = Math.round(similarity * 100);

        // Skip expensive LLM explanation for initial load
        if (skipExplanation) {
            return {
                score: baseScore,
                explanation: {
                    matchingSkills: extractSkillMatches(resumeText, job.skills),
                    relevantExperience: 'Quick match based on semantic similarity',
                    keywordAlignment: `${extractSkillMatches(resumeText, job.skills).length} of ${job.skills.length} skills matched`,
                    reasoning: 'Fast semantic matching'
                },
                metadata: {
                    semanticSimilarity: similarity,
                    baseScore: baseScore,
                    fastMode: true
                }
            };
        }

        // Generate detailed explanation using LLM (only when needed)
        const explanationPrompt = PromptTemplate.fromTemplate(`
You are an expert career advisor analyzing job-resume matches.

Resume Summary:
{resumeText}

Job Details:
Title: {jobTitle}
Company: {company}
Description: {jobDescription}
Required Skills: {requiredSkills}

The semantic similarity score is {similarityScore}%.

Provide a concise match analysis in the following JSON format:
{{
  "matchingSkills": ["skill1", "skill2", "skill3"],
  "relevantExperience": "brief description of relevant experience found in resume",
  "keywordAlignment": "brief description of keyword matches",
  "adjustedScore": number between 0-100,
  "reasoning": "one sentence explaining the score"
}}

Focus on:
1. Specific skills from the resume that match job requirements
2. Relevant experience that aligns with the role
3. Keyword overlap between resume and job description
4. Adjust the score if needed based on strong matches or mismatches

Return ONLY valid JSON, no additional text.
    `);

        const chain = explanationPrompt.pipe(llm);

        const response = await chain.invoke({
            resumeText: resumeText.substring(0, 2000), // Limit for token efficiency
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.description,
            requiredSkills: job.skills.join(', '),
            similarityScore: baseScore
        });

        // Parse LLM response
        let analysis;
        try {
            const content = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(content);
        } catch (parseError) {
            // Fallback if JSON parsing fails
            analysis = {
                matchingSkills: extractSkillMatches(resumeText, job.skills),
                relevantExperience: 'Experience analysis unavailable',
                keywordAlignment: 'Keyword analysis unavailable',
                adjustedScore: baseScore,
                reasoning: 'Automated semantic matching'
            };
        }

        // Use adjusted score from LLM or fall back to base score
        const finalScore = analysis.adjustedScore || baseScore;

        return {
            score: Math.min(100, Math.max(0, finalScore)), // Clamp between 0-100
            explanation: {
                matchingSkills: analysis.matchingSkills || [],
                relevantExperience: analysis.relevantExperience || 'Not analyzed',
                keywordAlignment: analysis.keywordAlignment || 'Not analyzed',
                reasoning: analysis.reasoning || 'Semantic similarity analysis'
            },
            metadata: {
                semanticSimilarity: similarity,
                baseScore: baseScore,
                adjustedScore: finalScore
            }
        };
    } catch (error) {
        console.error('Error in matchResumeToJob:', error);

        // Fallback to simple keyword matching if AI fails
        const simpleScore = calculateSimpleMatch(resumeText, job);

        return {
            score: simpleScore,
            explanation: {
                matchingSkills: extractSkillMatches(resumeText, job.skills),
                relevantExperience: 'AI matching temporarily unavailable',
                keywordAlignment: 'Basic keyword matching applied',
                reasoning: 'Fallback matching due to AI service error'
            },
            metadata: {
                error: error.message,
                fallbackMode: true
            }
        };
    }
}

/**
 * Simple keyword-based matching as fallback
 */
function calculateSimpleMatch(resumeText, job) {
    const resumeLower = resumeText.toLowerCase();
    const matchedSkills = job.skills.filter(skill =>
        resumeLower.includes(skill.toLowerCase())
    );

    const skillMatchRatio = matchedSkills.length / job.skills.length;
    const titleMatch = resumeLower.includes(job.title.toLowerCase()) ? 20 : 0;

    return Math.min(100, Math.round(skillMatchRatio * 60 + titleMatch));
}

/**
 * Extract matching skills between resume and job
 */
function extractSkillMatches(resumeText, jobSkills) {
    const resumeLower = resumeText.toLowerCase();
    return jobSkills.filter(skill =>
        resumeLower.includes(skill.toLowerCase())
    );
}

/**
 * Batch match resume against multiple jobs
 */
export async function batchMatchJobs(resumeText, jobs) {
    const matches = await Promise.all(
        jobs.map(async (job) => {
            const match = await matchResumeToJob(resumeText, job);
            return {
                jobId: job.id,
                ...match
            };
        })
    );

    return matches;
}
