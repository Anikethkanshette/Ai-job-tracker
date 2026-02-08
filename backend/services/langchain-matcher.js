import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini models
const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-1.5-flash', // Use flash model which is faster and more available
    temperature: 0.3,
    maxRetries: 1, // Reduce retries to fail fast
    timeout: 15000 // 15 second timeout
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'text-embedding-004', // Use newer embedding model
    maxRetries: 1,
    timeout: 10000
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

/**
 * Analyze resume with LLM for accurate results
 * Simplified prompt for better Gemini compatibility, with timeout fallback
 */
export async function quickAnalyzeResume(resumeText) {
    try {
        const limitedResume = resumeText.substring(0, 2500);
        
        // Use a simpler, more direct prompt
        const analysisPrompt = PromptTemplate.fromTemplate(`Extract career information from this resume. Return ONLY valid JSON.

RESUME:
{resumeText}

Return this exact JSON structure with real data from the resume:
{{"keySkills":["skill1","skill2","skill3"],"experienceLevel":"junior|mid|senior","yearsOfExperience":number,"recommendedRoles":["role1","role2"],"industryFit":["industry1"],"topStrengths":["strength1"],"summary":"brief one sentence summary"}}`);

        const chain = analysisPrompt.pipe(llm);
        
        console.log('Starting LLM analysis...');
        const startTime = Date.now();
        
        // Wrap with timeout - if LLM takes more than 15 seconds, fall back
        const response = await Promise.race([
            chain.invoke({ resumeText: limitedResume }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LLM timeout')), 15000)
            )
        ]);
        
        console.log(`LLM response received in ${Date.now() - startTime}ms`);
        console.log('Raw response:', response.content.substring(0, 200));

        // More aggressive JSON extraction
        let jsonStr = response.content;
        
        // Try to find JSON object in response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            // If no JSON found, log and fall back
            console.warn('No JSON found in LLM response, using fallback');
            return fallbackAnalyzeResume(resumeText);
        }

        // Clean up the JSON string
        jsonStr = jsonStr
            .replace(/[\r\n]/g, ' ') // Remove line breaks
            .replace(/\s+/g, ' ');   // Normalize whitespace

        try {
            const analysis = JSON.parse(jsonStr);
            
            console.log('Successfully parsed LLM analysis');

            return {
                success: true,
                analysis: {
                    keySkills: Array.isArray(analysis.keySkills) ? analysis.keySkills.slice(0, 5) : [],
                    experienceLevel: ['junior', 'mid', 'senior'].includes(analysis.experienceLevel) ? analysis.experienceLevel : 'mid',
                    yearsOfExperience: typeof analysis.yearsOfExperience === 'number' ? Math.max(0, Math.min(50, analysis.yearsOfExperience)) : 0,
                    recommendedRoles: Array.isArray(analysis.recommendedRoles) ? analysis.recommendedRoles.slice(0, 4) : [],
                    industryFit: Array.isArray(analysis.industryFit) ? analysis.industryFit.slice(0, 3) : [],
                    topStrengths: Array.isArray(analysis.topStrengths) ? analysis.topStrengths.slice(0, 3) : [],
                    summary: analysis.summary && typeof analysis.summary === 'string' ? analysis.summary : 'Professional with relevant skills'
                }
            };
        } catch (parseError) {
            console.log('JSON parsing failed, using fallback analysis');
            return fallbackAnalyzeResume(resumeText);
        }
        
    } catch (error) {
        console.log('LLM analysis error, using fallback:', error.message);
        return fallbackAnalyzeResume(resumeText);
    }
}

/**
 * Fallback resume analysis using intelligent keyword extraction
 * Used when LLM is unavailable - still extracts real information
 */
function fallbackAnalyzeResume(resumeText) {
    console.log('Using fallback resume analysis...');
    
    const resumeLower = resumeText.toLowerCase();
    
    // Extract skills by finding common technical terms
    const skillKeywords = [
        'javascript', 'python', 'java', 'c++', 'typescript', 'react', 'node.js', 'nodejs',
        'sql', 'aws', 'docker', 'git', 'rest api', 'graphql', 'mongodb', 'postgresql',
        'leadership', 'communication', 'project management', 'agile', 'scrum',
        'data analysis', 'machine learning', 'tensorflow', 'pandas', 'statistics', 
        'excel', 'tableau', 'html', 'css', 'vue.js', 'angular', 'kubernetes', 'ci/cd',
        'go', 'rust', 'kotlin', 'swift', 'objective-c', 'scala', 'clojure', 'elixir',
        'rails', 'django', 'flask', 'spring', 'hibernate', 'entity framework'
    ];

    const foundSkills = skillKeywords.filter(skill => resumeLower.includes(skill));
    const keySkills = [...new Set(foundSkills)].slice(0, 5);
    
    // Estimate experience level
    let experienceLevel = 'mid';
    if (resumeLower.includes('senior') || resumeLower.includes('principal') || 
        resumeLower.includes('architect') || resumeLower.includes('director')) {
        experienceLevel = 'senior';
    } else if (resumeLower.includes('junior') || resumeLower.includes('intern') || 
               resumeLower.includes('entry') || resumeLower.includes('graduate')) {
        experienceLevel = 'junior';
    }
    
    // Estimate years of experience by counting job titles and dates
    const jobMatches = resumeText.match(/(?:worked|experience|responsible|managed|developed|engineered|designed|led)/gi) || [];
    const yearsOfExperience = Math.min(Math.max(1, Math.ceil(jobMatches.length / 8)), 50);
    
    // Recommend roles based on actual skills found
    const recommendedRoles = recommendRolesFromSkills(keySkills);
    
    // Get industries
    const industryFit = getIndustriesBySkills(keySkills);
    
    // Extract strengths
    const topStrengths = extractTopStrengths(resumeText);
    
    // Create summary from found information
    const summary = keySkills.length > 0 
        ? `${experienceLevel === 'senior' ? 'Experienced' : experienceLevel === 'junior' ? 'Emerging' : 'Skilled'} professional with expertise in ${keySkills.slice(0, 2).join(', ')}.`
        : 'Professional with technical background and relevant experience.';
    
    return {
        success: true,
        analysis: {
            keySkills: keySkills.length > 0 ? keySkills : ['JavaScript', 'Python', 'SQL'],
            experienceLevel,
            yearsOfExperience,
            recommendedRoles: recommendedRoles.length > 0 ? recommendedRoles : ['Software Developer', 'Data Analyst'],
            industryFit: industryFit.length > 0 ? industryFit : ['Technology', 'Consulting'],
            topStrengths: topStrengths.length > 0 ? topStrengths : ['Technical Skills', 'Problem Solving', 'Team Collaboration'],
            summary
        }
    };
}

/**
 * Recommend job roles based on actual extracted skills
 */
function recommendRolesFromSkills(skills) {
    const skillStr = (skills || []).join(' ').toLowerCase();
    
    const roleMapping = [
        { role: 'Full Stack Developer', keywords: ['javascript', 'react', 'node', 'python', 'sql', 'mongodb'] },
        { role: 'Backend Developer', keywords: ['python', 'java', 'node', 'spring', 'sql', 'postgresql'] },
        { role: 'Frontend Developer', keywords: ['javascript', 'react', 'vue', 'angular', 'css', 'html'] },
        { role: 'DevOps Engineer', keywords: ['docker', 'kubernetes', 'aws', 'ci/cd', 'git'] },
        { role: 'Data Scientist', keywords: ['python', 'machine learning', 'tensorflow', 'pandas', 'statistics'] },
        { role: 'Cloud Architect', keywords: ['aws', 'azure', 'gcp', 'kubernetes', 'docker'] },
        { role: 'Product Manager', keywords: ['leadership', 'management', 'communication', 'agile'] }
    ];
    
    const roleScores = roleMapping.map(({ role, keywords }) => ({
        role,
        score: keywords.filter(kw => skillStr.includes(kw)).length
    })).sort((a, b) => b.score - a.score);
    
    const recommendedRoles = roleScores
        .filter(r => r.score > 0)
        .slice(0, 3)
        .map(r => r.role);
    
    // If no roles matched, return generic ones
    return recommendedRoles.length > 0 ? recommendedRoles : ['Software Developer', 'Data Analyst', 'Product Manager'];
}


/**
 * Full analysis with LLM (optional, can be done in background)
 * Use only when needed - not on initial resume upload
 */
export async function analyzeResumeForRecommendations(resumeText) {
    try {
        const analysisPrompt = PromptTemplate.fromTemplate(`
You are an expert career advisor. Analyze this resume and provide structured career recommendations.

Resume:
{resumeText}

Provide your analysis in the following JSON format:
{{
  "keySkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experienceLevel": "junior|mid|senior",
  "yearsOfExperience": number,
  "recommendedRoles": ["role1", "role2", "role3", "role4"],
  "industryFit": ["industry1", "industry2", "industry3"],
  "topStrengths": ["strength1", "strength2", "strength3"],
  "summary": "Brief 1-2 sentence summary of career profile"
}}

Guidelines:
- Extract the 5 most important skills mentioned
- Determine experience level from job history and titles
- Estimate years of experience
- Recommend 4 job roles this person would be well-suited for
- List 3 industries where these skills would be valuable
- Highlight 3 key strengths from the resume
- Write a concise professional summary

Return ONLY valid JSON, no additional text.
    `);

        const chain = analysisPrompt.pipe(llm);

        const response = await chain.invoke({
            resumeText: resumeText.substring(0, 3000)
        });

        // Parse LLM response
        try {
            const content = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const analysis = JSON.parse(content);

            return {
                success: true,
                analysis: {
                    keySkills: analysis.keySkills || [],
                    experienceLevel: analysis.experienceLevel || 'mid',
                    yearsOfExperience: analysis.yearsOfExperience || 0,
                    recommendedRoles: analysis.recommendedRoles || [],
                    industryFit: analysis.industryFit || [],
                    topStrengths: analysis.topStrengths || [],
                    summary: analysis.summary || 'Career profile analysis'
                }
            };
        } catch (parseError) {
            console.error('Failed to parse analysis JSON:', parseError);
            // Fallback to quick analysis
            return await quickAnalyzeResume(resumeText);
        }
    } catch (error) {
        console.error('Error in analyzeResumeForRecommendations:', error);
        // Fallback to quick analysis
        return await quickAnalyzeResume(resumeText);
    }
}

/**
 * Extract common skills/keywords from resume text
 */
function extractSkillsFromResume(resumeText) {
    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'C++', 'TypeScript', 'React', 'Node.js', 'SQL',
        'AWS', 'Docker', 'Git', 'REST API', 'GraphQL', 'MongoDB', 'PostgreSQL',
        'Leadership', 'Communication', 'Project Management', 'Agile', 'Scrum',
        'Data Analysis', 'Machine Learning', 'Statistics', 'Excel', 'Tableau',
        'HTML', 'CSS', 'Vue', 'Angular', 'Kubernetes', 'CI/CD', 'Ruby', 'PHP', 'Go',
        'Kubernetes', 'Jenkins', 'AWS', 'Azure', 'GCP', 'Linux', 'Windows'
    ];

    const resumeLower = resumeText.toLowerCase();
    return commonSkills.filter(skill =>
        resumeLower.includes(skill.toLowerCase())
    ).slice(0, 5);
}

/**
 * Estimate experience level from resume text
 */
function estimateExperienceLevel(resumeText) {
    const resumeLower = resumeText.toLowerCase();
    
    if (resumeLower.includes('senior') || resumeLower.includes('lead') || resumeLower.includes('manager')) {
        return 'senior';
    }
    if (resumeLower.includes('junior') || resumeLower.includes('intern') || resumeLower.includes('graduate')) {
        return 'junior';
    }
    return 'mid';
}

/**
 * Estimate years of experience
 */
function estimateYearsOfExperience(resumeText) {
    // Simple heuristic: count job-related keywords
    const jobCount = (resumeText.match(/(?:experience|worked|responsible|developed|managed)/gi) || []).length;
    return Math.min(Math.ceil(jobCount / 5), 15);
}

/**
 * Recommend job roles based on extracted skills
 */
function recommendRolesBasedOnSkills(skills) {
    const skillString = skills.join(' ').toLowerCase();
    
    const roleMapping = {
        'Software Developer': ['javascript', 'python', 'java', 'react', 'node'],
        'Data Analyst': ['python', 'sql', 'statistics', 'excel', 'tableau'],
        'DevOps Engineer': ['docker', 'kubernetes', 'aws', 'ci/cd', 'jenkins'],
        'Product Manager': ['management', 'communication', 'project', 'agile', 'leadership'],
        'Full Stack Developer': ['javascript', 'react', 'node', 'sql', 'html'],
        'Cloud Architect': ['aws', 'azure', 'gcp', 'kubernetes', 'docker']
    };

    const roles = Object.entries(roleMapping)
        .map(([role, keywords]) => ({
            role,
            score: keywords.filter(kw => skillString.includes(kw)).length
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(r => r.role);

    // Fallback if no matches
    if (roles.length === 0) {
        return ['Software Developer', 'Data Analyst', 'Product Manager', 'DevOps Engineer'];
    }

    return roles;
}

/**
 * Get industries based on skills
 */
function getIndustriesBySkills(skills) {
    const skillString = skills.join(' ').toLowerCase();
    
    const industryMapping = {
        'Technology': ['javascript', 'python', 'react', 'aws', 'docker', 'data'],
        'Finance': ['sql', 'data analysis', 'statistics', 'excel'],
        'Healthcare': ['data', 'analysis', 'management', 'communication'],
        'Consulting': ['management', 'communication', 'project', 'leadership'],
        'E-commerce': ['javascript', 'react', 'aws', 'data']
    };

    const industries = Object.entries(industryMapping)
        .map(([industry, keywords]) => ({
            industry,
            score: keywords.filter(kw => skillString.includes(kw)).length
        }))
        .filter(i => i.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(i => i.industry);

    return industries.length > 0 ? industries : ['Technology', 'Consulting'];
}

/**
 * Extract top strengths from resume
 */
function extractTopStrengths(resumeText) {
    const strengthPatterns = [
        { pattern: /leadership|lead|managed|managing/i, strength: 'Leadership' },
        { pattern: /technical|programming|developer|engineer/i, strength: 'Technical Skills' },
        { pattern: /communication|presentation|collaboration|team/i, strength: 'Team Collaboration' },
        { pattern: /problem.?solving|analytical|analyze/i, strength: 'Problem Solving' },
        { pattern: /innovation|creative|designed|architecture/i, strength: 'Creative Design' },
        { pattern: /organization|organized|planning|strategic/i, strength: 'Strategic Planning' }
    ];

    const strengths = strengthPatterns
        .filter(s => s.pattern.test(resumeText))
        .map(s => s.strength)
        .slice(0, 3);

    return strengths.length > 0 ? strengths : ['Technical Skills', 'Problem Solving', 'Team Collaboration'];
}

/**
 * Generate summary from skills and experience
 */
function generateSummary(skills, experienceLevel) {
    const skillsStr = skills.slice(0, 3).join(', ');
    const levelStr = experienceLevel === 'senior' ? 'experienced' : experienceLevel === 'junior' ? 'emerging' : 'skilled';
    return `${levelStr.charAt(0).toUpperCase() + levelStr.slice(1)} professional with expertise in ${skillsStr}. Well-positioned for roles leveraging these core competencies.`;
}
