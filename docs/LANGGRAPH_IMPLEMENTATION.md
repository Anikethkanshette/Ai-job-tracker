# LangGraph Implementation

## Overview

The AI Assistant uses **LangGraph** to orchestrate complex conversational flows with state management. LangGraph provides a state machine framework that allows the assistant to handle different types of user queries through conditional routing and specialized handlers.

## State Graph Architecture

```
                    ┌─────────────────┐
                    │  User Message   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ detect_intent   │
                    │                 │
                    │ Classify query  │
                    │ into intent     │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         filter_update   job_search    help
                │            │            │
                ▼            ▼            ▼
              ┌──────────────────────────┐
              │          END             │
              └──────────────────────────┘
```

## State Schema

```javascript
const conversationState = {
  messages: [],           // Conversation history
  userQuery: '',         // Current user input
  intent: '',            // Detected intent
  filterUpdates: null,   // Filter changes to apply
  response: '',          // AI response text
  jobResults: null       // Job search results (if applicable)
};
```

## Nodes Explained

### Node 1: Intent Detection

**Purpose**: Classify user query into one of four intents

```javascript
async function detectIntent(state) {
  const intentPrompt = PromptTemplate.fromTemplate(`
You are an AI assistant for a job tracking application. Classify the user's intent.

User Query: {query}

Classify into ONE of these intents:
- "filter_update": User wants to change job filters
- "job_search": User wants to find specific jobs
- "help": User needs help with the app
- "general": General conversation or unclear intent

Return ONLY the intent name, nothing else.
  `);

  const chain = intentPrompt.pipe(llm);
  const response = await chain.invoke({ query: state.userQuery });
  const intent = response.content.trim().toLowerCase();

  return {
    ...state,
    intent: ['filter_update', 'job_search', 'help', 'general'].includes(intent) 
      ? intent 
      : 'general'
  };
}
```

**Why This Approach**:
- Single LLM call for classification
- Clear, mutually exclusive categories
- Fallback to 'general' for safety
- Low latency (~500ms)

**Example Classifications**:
| User Query | Intent |
|-----------|--------|
| "Show only remote jobs" | filter_update |
| "Find me Python developer roles" | job_search |
| "Where are my applications?" | help |
| "Hello" | general |

### Node 2: Filter Update Handler

**Purpose**: Parse natural language into structured filter updates

```javascript
async function handleFilterUpdate(state) {
  const filterPrompt = PromptTemplate.fromTemplate(`
You are parsing a user's request to update job filters.

User Query: {query}

Available filters:
- role: string
- skills: array of strings
- datePosted: "24h" | "week" | "month" | "any"
- jobType: "full-time" | "part-time" | "contract" | "internship" | "any"
- workMode: "remote" | "hybrid" | "onsite" | "any"
- location: string
- matchScore: "high" (>70%) | "medium" (40-70%) | "all"

Special commands:
- "clear filters" or "reset" → return {{"reset": true}}

Parse the query and return a JSON object with filter updates.

Examples:
- "show remote jobs" → {{"workMode": "remote"}}
- "high match score only" → {{"matchScore": "high"}}
- "full-time jobs in San Francisco" → {{"jobType": "full-time", "location": "San Francisco"}}

Return ONLY valid JSON, no additional text.
  `);

  const chain = filterPrompt.pipe(llm);
  const response = await chain.invoke({ query: state.userQuery });

  let filterUpdates = null;
  try {
    const content = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    filterUpdates = JSON.parse(content);
  } catch (error) {
    filterUpdates = { error: 'Could not parse filter request' };
  }

  return {
    ...state,
    filterUpdates,
    response: generateFilterResponse(filterUpdates)
  };
}
```

**Prompt Engineering**:
1. **Structured Output**: JSON for reliable parsing
2. **Examples**: Few-shot learning improves accuracy
3. **Constraints**: Explicit filter options prevent hallucination
4. **Special Cases**: Handle "reset" command

**Frontend Integration**:
```javascript
// In AIAssistant.jsx
const { filterUpdates } = response.data;

if (filterUpdates) {
  if (filterUpdates.reset) {
    resetFilters();  // Clear all filters
  } else if (!filterUpdates.error) {
    updateFilters(filterUpdates);  // Apply partial updates
  }
}
```

**Why This Works**:
- Direct manipulation of frontend state
- No page reload needed
- Immediate visual feedback
- Maintains filter state consistency

### Node 3: Job Search Handler

**Purpose**: Provide guidance for job searching

```javascript
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
```

**Design Decision**: 
- Don't actually search jobs (frontend already has them)
- Provide guidance on using existing features
- Keep responses concise

### Node 4: Help Handler

**Purpose**: Answer questions about the application

```javascript
async function handleHelp(state) {
  const helpPrompt = PromptTemplate.fromTemplate(`
You are a helpful assistant for a job tracking application.

User Query: {query}

Provide helpful guidance about the app. Here are key features:
- Applications: Track jobs you've applied to (check the Applications page)
- Matching: AI analyzes your resume and scores each job (0-100%)
- Filters: Use filters to narrow down jobs
- Smart Apply: When you apply, we track your application status
- Best Matches: Top jobs based on your resume

Keep the response friendly and concise, 2-3 sentences max.
  `);

  const chain = helpPrompt.pipe(llm);
  const response = await chain.invoke({ query: state.userQuery });

  return {
    ...state,
    response: response.content
  };
}
```

**Knowledge Base**:
- Embedded in prompt (simple approach)
- Production: Use RAG (Retrieval-Augmented Generation)
- Could integrate with documentation

### Node 5: General Handler

**Purpose**: Handle miscellaneous queries

```javascript
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
```

## Edges and Routing

### Conditional Routing

```javascript
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
```

**Graph Construction**:
```javascript
const workflow = new StateGraph({ channels: conversationState });

// Add nodes
workflow.addNode('detect_intent', detectIntent);
workflow.addNode('filter_update', handleFilterUpdate);
workflow.addNode('job_search', handleJobSearch);
workflow.addNode('help', handleHelp);
workflow.addNode('general', handleGeneral);

// Set entry point
workflow.setEntryPoint('detect_intent');

// Conditional routing from intent detection
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

// All handlers end the graph
workflow.addEdge('filter_update', END);
workflow.addEdge('job_search', END);
workflow.addEdge('help', END);
workflow.addEdge('general', END);

const assistantGraph = workflow.compile();
```

## Conversation Memory

```javascript
const conversationHistories = new Map();

// Store per user
export async function processAssistantMessage(userMessage, conversationHistory = []) {
  const initialState = {
    messages: conversationHistory,
    userQuery: userMessage,
    // ... other state
  };

  const result = await assistantGraph.invoke(initialState);
  
  return {
    response: result.response,
    intent: result.intent,
    filterUpdates: result.filterUpdates
  };
}
```

**Memory Strategy**:
- In-memory Map (userId → messages)
- Keep last 20 messages
- Production: Use Redis or database

## Example Conversation Flows

### Flow 1: Filter Update

```
User: "Show only remote jobs"
  ↓
detect_intent → "filter_update"
  ↓
filter_update → Parse: {workMode: "remote"}
  ↓
Response: "I've updated the filters: work mode to remote. The job list should update automatically."
  ↓
Frontend: updateFilters({workMode: "remote"})
  ↓
UI updates with filtered jobs
```

### Flow 2: Multi-Filter Update

```
User: "Full-time Python jobs in San Francisco with high match"
  ↓
detect_intent → "filter_update"
  ↓
filter_update → Parse: {
  jobType: "full-time",
  skills: ["Python"],
  location: "San Francisco",
  matchScore: "high"
}
  ↓
Response: "I've updated the filters: job type to full-time, skills to Python, location to San Francisco, match score to high."
  ↓
Frontend: updateFilters({...})
  ↓
UI shows highly matched Python jobs in SF
```

### Flow 3: Help Query

```
User: "Where can I see my applications?"
  ↓
detect_intent → "help"
  ↓
help → Generate response
  ↓
Response: "You can view all your applications by clicking 'My Applications' in the top navigation. There you'll see your application history, status updates, and timeline for each job you've applied to."
```

### Flow 4: Reset Filters

```
User: "Clear all filters"
  ↓
detect_intent → "filter_update"
  ↓
filter_update → Parse: {reset: true}
  ↓
Response: "I've cleared all filters for you. You should now see all available jobs."
  ↓
Frontend: resetFilters()
  ↓
UI shows all jobs
```

## Why LangGraph?

### 1. **Structured Reasoning**
- Clear separation of concerns
- Each node has single responsibility
- Easy to debug and test

### 2. **Conditional Logic**
- Route based on intent
- Different handling for different queries
- Extensible for new intents

### 3. **State Management**
- Maintain conversation context
- Pass data between nodes
- Track user journey

### 4. **Maintainability**
- Add new nodes without breaking existing ones
- Modify prompts independently
- Clear execution flow

## Advantages Over Simple Prompt

**Without LangGraph** (single prompt):
```javascript
// Everything in one prompt - hard to maintain
const response = await llm.invoke(`
  You are a job assistant. Handle these cases:
  1. If user wants to filter, parse filters
  2. If user wants help, explain features
  3. If user wants to search, guide them
  ...
  User: ${userMessage}
`);
```

**Problems**:
- Prompt becomes huge
- Hard to debug which part failed
- Difficult to add new features
- No structured output
- Inconsistent behavior

**With LangGraph**:
- Modular nodes
- Clear routing
- Structured outputs
- Easy to extend
- Testable components

## Performance Characteristics

| Operation | Latency | LLM Calls |
|-----------|---------|-----------|
| Intent Detection | ~500ms | 1 |
| Filter Update | ~800ms | 2 (intent + parse) |
| Job Search | ~800ms | 2 |
| Help | ~800ms | 2 |
| Total (typical) | ~1-2s | 2 |

**Optimization Opportunities**:
1. Cache common intents
2. Parallel LLM calls where possible
3. Streaming responses
4. Pre-computed responses for FAQs

## Error Handling

```javascript
try {
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
```

**Graceful Degradation**:
- Catch all errors
- Return friendly message
- Log for debugging
- Don't crash the app

## Future Enhancements

1. **Multi-turn Conversations**: Remember context across messages
2. **Clarification Questions**: Ask for missing information
3. **Proactive Suggestions**: "Would you like to see remote jobs?"
4. **Learning**: Improve from user feedback
5. **Tool Calling**: Actually execute job searches, create applications
6. **Streaming**: Real-time response generation
7. **Voice Input**: Speech-to-text integration

## Testing Strategy

```javascript
// Test individual nodes
test('detectIntent classifies filter updates', async () => {
  const state = { userQuery: 'show remote jobs' };
  const result = await detectIntent(state);
  expect(result.intent).toBe('filter_update');
});

// Test routing
test('routeByIntent routes to correct handler', () => {
  const state = { intent: 'help' };
  const next = routeByIntent(state);
  expect(next).toBe('help');
});

// Test full graph
test('graph handles filter update end-to-end', async () => {
  const result = await processAssistantMessage('show remote jobs');
  expect(result.filterUpdates).toEqual({ workMode: 'remote' });
});
```

## Conclusion

LangGraph provides a robust framework for building the AI assistant with:
- **Modularity**: Easy to extend and maintain
- **Reliability**: Structured error handling
- **Performance**: Optimized LLM usage
- **Scalability**: Add new intents without refactoring

The state machine approach ensures consistent behavior and makes the system production-ready for complex conversational AI applications.
