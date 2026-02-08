# LangChain Implementation

## Overview

The job matching system uses **LangChain** with **Google Gemini** to provide semantic job-resume matching that goes beyond simple keyword matching. This implementation leverages embeddings for semantic understanding and LLMs for generating human-readable explanations.

## Core Components

### 1. Gemini Models Initialization

```javascript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// LLM for generating explanations
const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: 'gemini-pro',
  temperature: 0.3  // Lower temperature for consistent, factual responses
});

// Embeddings model for semantic similarity
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: 'embedding-001'
});
```

## Matching Algorithm

### Step 1: Text Preparation

```javascript
// Combine job information into comprehensive text
const jobText = `
  Job Title: ${job.title}
  Company: ${job.company}
  Description: ${job.description}
  Required Skills: ${job.skills.join(', ')}
  Job Type: ${job.jobType}
  Work Mode: ${job.workMode}
  Location: ${job.location}
`.trim();
```

**Why**: Embeddings work better with rich context. Including all job details provides more semantic information for matching.

### Step 2: Generate Embeddings

```javascript
// Get vector representations
const resumeEmbedding = await embeddings.embedQuery(resumeText);
const jobEmbedding = await embeddings.embedQuery(jobText);
```

**What are embeddings?**
- Vector representations of text (arrays of numbers)
- Capture semantic meaning, not just keywords
- Similar meanings → similar vectors
- Typical dimension: 768 or 1536

**Example**:
- "Python developer" and "Python programmer" have similar embeddings
- "Python developer" and "Java developer" have somewhat similar embeddings
- "Python developer" and "Marketing manager" have very different embeddings

### Step 3: Calculate Similarity

```javascript
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
const baseScore = Math.round(similarity * 100); // Convert to 0-100
```

**Cosine Similarity**:
- Measures angle between two vectors
- Range: -1 to 1 (we use 0 to 1 for text)
- 1 = identical direction (perfect match)
- 0 = orthogonal (no similarity)

**Why cosine over Euclidean distance?**
- Invariant to vector magnitude
- Better for text embeddings
- Industry standard for semantic search

### Step 4: Generate Explanation with LLM

```javascript
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
  resumeText: resumeText.substring(0, 2000),
  jobTitle: job.title,
  company: job.company,
  jobDescription: job.description,
  requiredSkills: job.skills.join(', '),
  similarityScore: baseScore
});
```

**Prompt Engineering Decisions**:
1. **Structured Output**: Request JSON for reliable parsing
2. **Context Limiting**: Truncate resume to 2000 chars to save tokens
3. **Score Adjustment**: Let LLM refine the embedding-based score
4. **Specific Instructions**: Clear format prevents hallucination

### Step 5: Parse and Return

```javascript
let analysis = JSON.parse(response.content);

return {
  score: Math.min(100, Math.max(0, analysis.adjustedScore)),
  explanation: {
    matchingSkills: analysis.matchingSkills,
    relevantExperience: analysis.relevantExperience,
    keywordAlignment: analysis.keywordAlignment,
    reasoning: analysis.reasoning
  },
  metadata: {
    semanticSimilarity: similarity,
    baseScore: baseScore,
    adjustedScore: analysis.adjustedScore
  }
};
```

## Performance Optimizations

### 1. Embedding Caching

```javascript
const embeddingCache = new Map();

async function getEmbedding(text, cacheKey) {
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }
  const embedding = await embeddings.embedQuery(text);
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}
```

**Why**: 
- Embeddings are expensive (API calls, computation)
- Job descriptions don't change frequently
- Cache hit = instant response

**Cache Strategy**:
- Key: `job_${job.id}` for jobs
- Key: `resume_${resumeText.substring(0, 100)}` for resumes
- In-memory Map (production: use Redis)

### 2. Batch Processing

```javascript
export async function batchMatchJobs(resumeText, jobs) {
  const matches = await Promise.all(
    jobs.map(async (job) => {
      const match = await matchResumeToJob(resumeText, job);
      return { jobId: job.id, ...match };
    })
  );
  return matches;
}
```

**Why**:
- Process all jobs in parallel
- Faster than sequential processing
- Better user experience (single loading state)

## Fallback Mechanism

```javascript
catch (error) {
  console.error('Error in matchResumeToJob:', error);
  
  // Fallback to simple keyword matching
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
```

**Why Fallback**:
- API failures (rate limits, network issues)
- Invalid API key
- Service downtime
- Better degraded experience than complete failure

**Fallback Algorithm**:
```javascript
function calculateSimpleMatch(resumeText, job) {
  const resumeLower = resumeText.toLowerCase();
  const matchedSkills = job.skills.filter(skill => 
    resumeLower.includes(skill.toLowerCase())
  );
  
  const skillMatchRatio = matchedSkills.length / job.skills.length;
  const titleMatch = resumeLower.includes(job.title.toLowerCase()) ? 20 : 0;
  
  return Math.min(100, Math.round(skillMatchRatio * 60 + titleMatch));
}
```

## Match Score Interpretation

| Score Range | Label | Color | Meaning |
|------------|-------|-------|---------|
| 70-100% | High Match | Green | Strong alignment, highly recommended |
| 40-69% | Medium Match | Yellow | Partial fit, worth considering |
| 0-39% | Low Match | Gray | Poor fit, may not be suitable |

## Example Matching Flow

### Input
**Resume**: "Software Engineer with 5 years of Python and React experience. Built scalable web applications using Django and PostgreSQL. Strong in API design and microservices."

**Job**: "Senior Full Stack Developer at Tech Corp. Required: Python, React, PostgreSQL, REST APIs. Build web applications for enterprise clients."

### Processing

1. **Embeddings Generated**:
   - Resume vector: [0.23, -0.45, 0.67, ...] (768 dimensions)
   - Job vector: [0.25, -0.43, 0.69, ...] (768 dimensions)

2. **Similarity Calculated**:
   - Cosine similarity: 0.87
   - Base score: 87%

3. **LLM Analysis**:
   ```json
   {
     "matchingSkills": ["Python", "React", "PostgreSQL", "REST APIs"],
     "relevantExperience": "5 years building web applications with matching tech stack",
     "keywordAlignment": "Strong overlap in core technologies and domain",
     "adjustedScore": 92,
     "reasoning": "Excellent match with all required skills and relevant experience"
   }
   ```

4. **Final Output**:
   - Score: 92%
   - Badge: High Match (Green)
   - Explanation shown on hover

## Why This Approach Works

### 1. Semantic Understanding
- Recognizes "web applications" ≈ "web apps"
- Understands "API design" relates to "REST APIs"
- Captures context beyond exact keyword matches

### 2. Comprehensive Scoring
- Embeddings provide base similarity
- LLM refines with domain knowledge
- Combines quantitative and qualitative analysis

### 3. Explainability
- Users see why they match
- Builds trust in recommendations
- Helps users improve resumes

### 4. Scalability
- Caching reduces API calls
- Batch processing improves throughput
- Fallback ensures reliability

## Limitations and Considerations

### 1. API Costs
- Each embedding call costs tokens
- LLM explanations add cost
- Mitigation: Caching, batch processing

### 2. Latency
- API calls add latency (~1-2s per job)
- Batch of 30 jobs: ~3-5 seconds
- Mitigation: Loading states, progressive rendering

### 3. Accuracy
- Embeddings may miss nuanced requirements
- LLM may hallucinate details
- Mitigation: Fallback, score adjustment, human review

### 4. Context Limits
- Resume truncated to 2000 chars
- May miss important details
- Mitigation: Smart truncation (keep most relevant sections)

## Future Improvements

1. **Vector Database**: Store embeddings in Pinecone/Weaviate for faster retrieval
2. **Fine-tuning**: Train custom model on job-resume pairs
3. **Multi-modal**: Include resume formatting, structure analysis
4. **Ranking**: Use learning-to-rank algorithms
5. **Feedback Loop**: Learn from user applications and outcomes
