import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END } from '@langchain/langgraph';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini LLM
const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-pro',
    temperature: 0.7
});

// Define state schema for conversation
const conversationState = {
    messages: [],
    userQuery: '',
    intent: '',
    filterUpdates: null,
    response: '',
    jobResults: null
};

/**
 * Node 1: Intent Detection
 * Classifies user query into: job_search, filter_update, help, or general
 */
async function detectIntent(state) {
    const intentPrompt = PromptTemplate.fromTemplate(`
You are an AI assistant for a job tracking application. Classify the user's intent.

User Query: {query}

Classify into ONE of these intents:
- "filter_update": User wants to change job filters (e.g., "show remote jobs", "only high matches", "clear filters")
- "job_search": User wants to find specific jobs (e.g., "find software engineer jobs", "show me Python roles")
- "help": User needs help with the app (e.g., "where are my applications?", "how does matching work?")
- "general": General conversation or unclear intent

Return ONLY the intent name, nothing else.
  `);

    const chain = intentPrompt.pipe(llm);
    const response = await chain.invoke({ query: state.userQuery });
    const intent = response.content.trim().toLowerCase();

    return {
        ...state,
        intent: ['filter_update', 'job_search', 'help', 'general'].includes(intent) ? intent : 'general'
    };
}

/**
 * Node 2: Filter Update Handler
 * Parses user query and generates filter updates
 */
async function handleFilterUpdate(state) {
    const filterPrompt = PromptTemplate.fromTemplate(`
You are parsing a user's request to update job filters.

User Query: {query}

Available filters:
- role: string (job title/role)
- skills: array of strings
- datePosted: "24h" | "week" | "month" | "any"
- jobType: "full-time" | "part-time" | "contract" | "internship" | "any"
- workMode: "remote" | "hybrid" | "onsite" | "any"
- location: string
- matchScore: "high" (>70%) | "medium" (40-70%) | "all"

Special commands:
- "clear filters" or "reset" → return {{"reset": true}}

Parse the query and return a JSON object with filter updates. Only include filters mentioned in the query.

Examples:
- "show remote jobs" → {{"workMode": "remote"}}
- "high match score only" → {{"matchScore": "high"}}
- "full-time jobs in San Francisco" → {{"jobType": "full-time", "location": "San Francisco"}}
- "clear all filters" → {{"reset": true}}
- "show Python and JavaScript jobs" → {{"skills": ["Python", "JavaScript"]}}

Return ONLY valid JSON, no additional text.
  `);

    const chain = filterPrompt.pipe(llm);
    const response = await chain.invoke({ query: state.userQuery });

    let filterUpdates = null;
    try {
        const content = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        filterUpdates = JSON.parse(content);
    } catch (error) {
        console.error('Failed to parse filter updates:', error);
        filterUpdates = { error: 'Could not parse filter request' };
    }

    return {
        ...state,
        filterUpdates,
        response: generateFilterResponse(filterUpdates)
    };
}

function generateFilterResponse(filterUpdates) {
    if (filterUpdates.reset) {
        return "I've cleared all filters for you. You should now see all available jobs.";
    }

    if (filterUpdates.error) {
        return "I couldn't understand that filter request. Try something like 'show remote jobs' or 'high match score only'.";
    }

    const updates = [];
    if (filterUpdates.workMode) updates.push(`work mode to ${filterUpdates.workMode}`);
    if (filterUpdates.jobType) updates.push(`job type to ${filterUpdates.jobType}`);
    if (filterUpdates.matchScore) updates.push(`match score to ${filterUpdates.matchScore}`);
    if (filterUpdates.location) updates.push(`location to ${filterUpdates.location}`);
    if (filterUpdates.role) updates.push(`role to ${filterUpdates.role}`);
    if (filterUpdates.skills) updates.push(`skills to ${filterUpdates.skills.join(', ')}`);
    if (filterUpdates.datePosted) updates.push(`date posted to ${filterUpdates.datePosted}`);

    if (updates.length === 0) {
        return "I didn't detect any specific filter changes. What would you like to filter by?";
    }

    return `I've updated the filters: ${updates.join(', ')}. The job list should update automatically.`;
}

/**
 * Node 3: Job Search Handler
 * Searches for jobs based on natural language query
 */
async function handleJobSearch(state) {
    const searchPrompt = PromptTemplate.fromTemplate(`
You are helping a user search for jobs.

User Query: {query}

Provide a helpful response about job searching. Mention that the user should:
1. Use the filters to narrow down results
2. Check the "Best Matches" section for top recommendations
3. Use the AI matching scores to find relevant positions

Keep the response conversational and helpful, 2-3 sentences max.
  `);

    const chain = searchPrompt.pipe(llm);
    const response = await chain.invoke({ query: state.userQuery });

    return {
        ...state,
        response: response.content
    };
}

/**
 * Node 4: Help Handler
 * Provides product guidance and help
 */
async function handleHelp(state) {
    const helpPrompt = PromptTemplate.fromTemplate(`
You are a helpful assistant for a job tracking application.

User Query: {query}

Provide helpful guidance about the app. Here are key features:
- Applications: Track jobs you've applied to (check the Applications page in navigation)
- Matching: AI analyzes your resume and scores each job (0-100%)
- Filters: Use filters to narrow down jobs by role, skills, location, work mode, etc.
- Smart Apply: When you apply to jobs, we track your application status
- Best Matches: Top jobs based on your resume appear at the top of the dashboard

Keep the response friendly and concise, 2-3 sentences max.
  `);

    const chain = helpPrompt.pipe(llm);
    const response = await chain.invoke({ query: state.userQuery });

    return {
        ...state,
        response: response.content
    };
}

/**
 * Node 5: General Handler
 * Handles general conversation
 */
async function handleGeneral(state) {
    const generalPrompt = PromptTemplate.fromTemplate(`
You are a friendly AI assistant for a job tracking application.

User Query: {query}

Respond helpfully. If the query is about jobs, guide them to use filters or search.
If it's about the app, explain features. Keep it conversational and brief (2-3 sentences).
  `);

    const chain = generalPrompt.pipe(llm);
    const response = await chain.invoke({ query: state.userQuery });

    return {
        ...state,
        response: response.content
    };
}

/**
 * Routing function: Determines next node based on intent
 */
function routeByIntent(state) {
    switch (state.intent) {
        case 'filter_update':
            return 'filter_update';
        case 'job_search':
            return 'job_search';
        case 'help':
            return 'help';
        default:
            return 'general';
    }
}

/**
 * Build LangGraph state graph
 */
function buildAssistantGraph() {
    const workflow = new StateGraph({
        channels: conversationState
    });

    // Add nodes
    workflow.addNode('detect_intent', detectIntent);
    workflow.addNode('filter_update', handleFilterUpdate);
    workflow.addNode('job_search', handleJobSearch);
    workflow.addNode('help', handleHelp);
    workflow.addNode('general', handleGeneral);

    // Set entry point
    workflow.setEntryPoint('detect_intent');

    // Add conditional edges from intent detection
    workflow.addConditionalEdges(
        'detect_intent',
        routeByIntent,
        {
            filter_update: 'filter_update',
            job_search: 'job_search',
            help: 'help',
            general: 'general'
        }
    );

    // All handler nodes end the graph
    workflow.addEdge('filter_update', END);
    workflow.addEdge('job_search', END);
    workflow.addEdge('help', END);
    workflow.addEdge('general', END);

    return workflow.compile();
}

// Create the compiled graph
const assistantGraph = buildAssistantGraph();

/**
 * Process user message through LangGraph
 */
export async function processAssistantMessage(userMessage, conversationHistory = []) {
    try {
        const initialState = {
            messages: conversationHistory,
            userQuery: userMessage,
            intent: '',
            filterUpdates: null,
            response: '',
            jobResults: null
        };

        const result = await assistantGraph.invoke(initialState);

        return {
            response: result.response,
            intent: result.intent,
            filterUpdates: result.filterUpdates,
            success: true
        };
    } catch (error) {
        console.error('Error in assistant graph:', error);
        return {
            response: "I'm having trouble processing that request. Please try again or rephrase your question.",
            intent: 'error',
            filterUpdates: null,
            success: false,
            error: error.message
        };
    }
}
