// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// OpenAI API key
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''

// Enhanced context window for history tracking
const MAX_CONTEXT_MESSAGES = 15
const MAX_TOKEN_ESTIMATE = 4000

// Facilitation strategies mapped by session type
const FACILITATION_STRATEGIES = {
  workshop: {
    techniques: ["brainstorming", "ideation", "collaborative", "action-oriented"],
    redirections: ["Let's explore more practical applications of that idea.", "How might we turn that into something actionable?"],
    summarization: "group ideas into themes and identify concrete next steps"
  },
  training: {
    techniques: ["knowledge-check", "application", "reflection", "guidance"],
    redirections: ["How does this relate to what you already know?", "Can you think of a situation where you'd apply this?"],
    summarization: "highlight key learning points and their practical applications"
  },
  consultation: {
    techniques: ["problem-solving", "expertise", "guidance", "questioning"],
    redirections: ["Let's examine the root causes.", "What specific challenges are you facing with this?"],
    summarization: "identify core problems and potential solutions"
  },
  coaching: {
    techniques: ["reflection", "discovery", "empowerment", "questioning"],
    redirections: ["What's stopping you from moving forward?", "How would success in this area look to you?"],
    summarization: "focus on insights, commitments, and growth opportunities"
  },
  team_building: {
    techniques: ["collaboration", "trust", "communication", "engagement"],
    redirections: ["How does this affect team dynamics?", "What would better collaboration look like?"],
    summarization: "highlight team dynamics, communication patterns, and relationship insights"
  }
}

// Report templates by session type
const REPORT_TEMPLATES = {
  default: {
    sections: [
      { title: "Key Discussion Points", description: "Main topics and insights from the session" },
      { title: "Participant Engagement", description: "Overview of participation and interaction" },
      { title: "Action Items", description: "Next steps and follow-up tasks" },
      { title: "Recommendations", description: "Suggestions for future discussions" }
    ]
  },
  workshop: {
    sections: [
      { title: "Workshop Outcomes", description: "Key results and deliverables" },
      { title: "Ideas Generated", description: "Notable ideas and concepts" },
      { title: "Action Plan", description: "Concrete steps and responsibilities" },
      { title: "Follow-up Timeline", description: "Schedule for next steps" }
    ]
  },
  training: {
    sections: [
      { title: "Learning Outcomes", description: "Key concepts covered and understood" },
      { title: "Knowledge Gaps", description: "Areas requiring further attention" },
      { title: "Application Opportunities", description: "How to apply the knowledge" },
      { title: "Further Resources", description: "Additional materials for continued learning" }
    ]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { messages, conversationId, generateReport = false, facilitationMetrics = {} } = await req.json()
    
    console.log(`Processing request for conversation: ${conversationId}, generateReport: ${generateReport}`)
    console.log(`Received ${messages.length} messages to process`)

    // Input validation
    if (!messages || !Array.isArray(messages) || !conversationId) {
      console.error("Invalid input: Missing messages array or conversationId")
      return new Response(
        JSON.stringify({ error: 'Invalid input: Messages array and conversationId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // IMPROVEMENT 1: ENHANCED CONTEXT MANAGEMENT
    // Get conversation data with more detailed session information
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        sessions:sessions_id (
          id,
          title,
          objective,
          prompt,
          session_type,
          duration_minutes,
          skill_level,
          difficulty_level,
          learning_outcomes,
          prerequisites
        )
      `)
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError.message)
    }

    // Get participant information for context
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('conversation_id', conversationId)

    if (participantsError) {
      console.error("Error fetching participants:", participantsError.message)
    }

    // Track participation metrics
    const participantStats = analyzeParticipation(messages, participants || [])
    
    // Determine session progress (time-based estimate)
    let sessionProgress = "early"
    if (conversation?.sessions?.duration_minutes) {
      const firstMessageTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date()
      const elapsed = (new Date().getTime() - firstMessageTime.getTime()) / (1000 * 60)
      const progressPercent = Math.min(100, Math.round((elapsed / conversation.sessions.duration_minutes) * 100))
      
      if (progressPercent > 80) sessionProgress = "concluding"
      else if (progressPercent > 40) sessionProgress = "middle"
    }

    // IMPROVEMENT 2: BETTER OPENAI INTEGRATION
    let responseContent = ""
    let responseMetrics = {
      generationMethod: "template",
      generationTime: 0,
      responseQuality: "medium",
      topicRelevance: "medium",
      participationBalance: participantStats.participationBalance
    }
    
    // Use OpenAI if available
    if (openaiApiKey && conversation?.sessions) {
      try {
        console.log("Using improved OpenAI integration for response generation")
        const startTime = performance.now()
        
        // Construct session context
        const sessionType = conversation.sessions.session_type || "workshop"
        const sessionObjective = conversation.sessions.objective || "facilitate a productive discussion"
        const sessionTitle = conversation.sessions.title || "Discussion Session"
        
        // Get relevant facilitation strategies
        const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop
        
        // Prune messages to fit context window
        const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE)
        
        // Extract user questions and topics
        const userTopics = extractUserTopics(prunedMessages)
        
        // Prepare messages for AI with better formatting and context
        const prompt = conversation.sessions.prompt || 
          `You are an expert facilitator leading a ${sessionType} session titled "${sessionTitle}". 
          Your objective is to ${sessionObjective}. 
          
          Current session progress: ${sessionProgress} stage.
          Participant count: ${participants?.length || 0}
          
          Use these facilitation techniques: ${strategies.techniques.join(", ")}.
          When needed, redirect the conversation with questions like: ${strategies.redirections.join(" Or, ")}
          
          For less active participants, ask direct but gentle questions to include them.
          Balance the conversation by acknowledging frequent contributors while encouraging others.
          
          ${generateReport ? "Create a comprehensive summary report of the discussion so far." : "Respond thoughtfully to guide the discussion forward."}`;

        // Format the most recent conversation context for the AI
        let promptContent = `Here's the current state of the discussion:\n\n`;
        
        // Add key topics being discussed
        if (userTopics.length > 0) {
          promptContent += `Key topics being discussed: ${userTopics.join(", ")}\n\n`;
        }
        
        // Add participation patterns
        promptContent += `Participation patterns: ${participantStats.summary}\n\n`;
        
        // Add the conversation history in a structured format
        promptContent += "Recent messages:\n";
        const recentMessages = prunedMessages.slice(-MAX_CONTEXT_MESSAGES);
        recentMessages.forEach(msg => {
          if (msg.sender === 'user') {
            const participantInfo = participants?.find(p => `P${p.participant_id}` === msg.participant);
            const participantName = participantInfo ? participantInfo.name : (msg.participant || 'Unknown');
            promptContent += `${participantName}: ${msg.content}\n`;
          } else if (msg.sender === 'assistant' && !msg.isReport) {
            promptContent += `Facilitator: ${msg.content}\n`;
          }
        });
        
        // Add specific instructions based on report generation
        if (generateReport) {
          const reportTemplate = REPORT_TEMPLATES[sessionType as keyof typeof REPORT_TEMPLATES] || REPORT_TEMPLATES.default;
          promptContent += `\nGenerate a comprehensive session report with these sections:\n`;
          reportTemplate.sections.forEach(section => {
            promptContent += `- ${section.title}: ${section.description}\n`;
          });
          promptContent += "\nAnalyze the discussion to identify patterns, key insights, action items, and recommendations.";
        } else {
          promptContent += `\nBased on this conversation, provide a thoughtful facilitator response that:
          1. Acknowledges key points raised
          2. Guides the discussion forward
          3. Encourages deeper exploration
          4. Involves less active participants when appropriate`;
        }
        
        // Call OpenAI with improved formatting and context
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: promptContent }
            ],
            temperature: generateReport ? 0.3 : 0.7, // Lower temperature for reports, more creative for responses
          }),
        });

        const data = await response.json();
        const endTime = performance.now();
        
        if (data.choices && data.choices[0]?.message?.content) {
          responseContent = data.choices[0].message.content;
          console.log("OpenAI generated response (truncated):", responseContent.substring(0, 100) + "...");
          
          responseMetrics = {
            generationMethod: "ai",
            generationTime: Math.round(endTime - startTime),
            responseQuality: "high",
            topicRelevance: "high",
            participationBalance: participantStats.participationBalance
          };
          
          // Save metrics to database for analysis
          try {
            await supabase.from('session_events').insert({
              conversation_id: conversationId,
              event_type: generateReport ? 'report_generation' : 'facilitator_response',
              data: {
                metrics: responseMetrics,
                contentLength: responseContent.length,
                topics: userTopics,
                participationStats: participantStats
              }
            });
          } catch (error) {
            console.error("Error saving metrics:", error.message);
          }
        } else {
          console.error("OpenAI API returned unexpected format:", data);
          // Fall back to improved template response
          responseContent = generateEnhancedTemplateResponse(
            prunedMessages, 
            generateReport, 
            conversation, 
            sessionProgress, 
            participantStats, 
            userTopics
          );
        }
      } catch (error) {
        console.error("Error using OpenAI API:", error.message);
        // Get the most recent user messages to inform the response
        const recentUserMessages = messages
          .filter(m => m.sender === 'user')
          .slice(-5)
          .map(m => m.content)
          .join("\n- ");
          
        // Fall back to improved template response
        responseContent = generateEnhancedTemplateResponse(
          messages, 
          generateReport, 
          conversation, 
          sessionProgress, 
          participantStats, 
          extractUserTopics(messages)
        );
      }
    } else {
      // Get the most recent user messages to inform the response
      const recentUserMessages = messages
        .filter(m => m.sender === 'user')
        .slice(-5)
        .map(m => m.content)
        .join("\n- ");
      
      console.log("Recent user messages to process:", recentUserMessages);
      
      // Use template-based response generation with improvements
      responseContent = generateEnhancedTemplateResponse(
        messages, 
        generateReport, 
        conversation, 
        sessionProgress, 
        participantStats, 
        extractUserTopics(messages)
      );
    }

    // Create response object with metrics
    const responseObject = {
      id: `resp-${Date.now()}`,
      content: responseContent,
      is_report: generateReport,
      metrics: responseMetrics
    }

    console.log("Sending facilitator response:", {
      id: responseObject.id,
      isReport: responseObject.is_report,
      contentLength: responseObject.content.length,
      metrics: responseObject.metrics
    });
    
    return new Response(
      JSON.stringify(responseObject),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error processing request:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during processing' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Generate an enhanced template-based response with better context awareness
 */
function generateEnhancedTemplateResponse(
  messages: any[], 
  generateReport: boolean,
  conversation: any,
  sessionProgress: string,
  participantStats: any,
  userTopics: string[]
) {
  // IMPROVEMENT 6: IMPROVED TEMPLATES
  const sessionType = conversation?.sessions?.session_type || "workshop";
  const sessionTitle = conversation?.sessions?.title || "Discussion Session";
  const sessionObjective = conversation?.sessions?.objective || "facilitate a productive discussion";
  
  // Get the appropriate facilitation strategies
  const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
  
  // Get recent user messages
  const recentUserMessages = messages
    .filter(m => m.sender === 'user')
    .slice(-5)
    .map(m => m.content);
  
  if (generateReport) {
    // IMPROVEMENT 3: BETTER REPORT GENERATION
    const reportTemplate = REPORT_TEMPLATES[sessionType as keyof typeof REPORT_TEMPLATES] || REPORT_TEMPLATES.default;
    
    let reportContent = `# ${sessionTitle} - Session Report\n\n`;
    
    // Add session context
    reportContent += `## Session Overview\n`;
    reportContent += `- **Objective**: ${sessionObjective}\n`;
    reportContent += `- **Participants**: ${participantStats.totalParticipants}\n`;
    reportContent += `- **Messages**: ${messages.filter(m => m.sender === 'user').length}\n\n`;
    
    // Add key discussion points
    reportContent += `## Key Discussion Points\n`;
    if (userTopics.length > 0) {
      userTopics.forEach(topic => {
        reportContent += `- ${topic}\n`;
      });
    } else {
      reportContent += `- The discussion covered several important aspects of the topic\n`;
      reportContent += `- Participants shared their perspectives and experiences\n`;
    }
    reportContent += `\n`;
    
    // Add participation summary
    reportContent += `## Participation Summary\n`;
    reportContent += `${participantStats.summary}\n\n`;
    
    // Add action items
    reportContent += `## Action Items\n`;
    reportContent += `1. Follow up on the discussed topics\n`;
    reportContent += `2. Address outstanding questions\n`;
    reportContent += `3. Schedule a follow-up session if needed\n\n`;
    
    // Add recommendations
    reportContent += `## Recommendations\n`;
    reportContent += `- Continue exploring ${userTopics.length > 0 ? userTopics[0] : "the main topic"} in more depth\n`;
    reportContent += `- Gather additional resources on key areas\n`;
    reportContent += `- Consider practical applications of the insights shared\n`;
    
    return reportContent;
  } else if (recentUserMessages.length === 0) {
    // Welcome message
    return `Welcome to our ${sessionType} session on ${sessionTitle}. ${sessionObjective ? `Our objective today is to ${sessionObjective}.` : ''} I'm here to facilitate our discussion. Please share your initial thoughts on the topic.`;
  } else {
    // IMPROVEMENT 4: FACILITATION INTELLIGENCE
    // Create a more thoughtful response based on session progress and participation
    let response = '';
    
    if (sessionProgress === "early") {
      // Early stage facilitation focuses on exploration
      response = `Thank you for sharing your thoughts. I notice we're discussing ${userTopics.length > 0 ? userTopics.join(", ") : "several interesting points"}.\n\n`;
      
      if (participantStats.participationBalance < 0.5) {
        // Low participation balance - encourage quieter participants
        response += `I'd like to hear from more participants. What are your thoughts on what's been shared so far?\n\n`;
      } else {
        // Good participation - keep momentum
        response += `You've raised some interesting points. Let's explore them further:\n\n`;
      }
      
      // Add a thought-provoking question using the appropriate facilitation technique
      response += `${strategies.redirections[0]} ${strategies.techniques.includes("questioning") ? "What specific examples come to mind?" : "How might this impact your work or situation?"}\n\n`;
    } 
    else if (sessionProgress === "middle") {
      // Middle stage facilitation focuses on deepening
      response = `We're making good progress in our discussion. ${userTopics.length > 0 ? `The topics of ${userTopics.join(", ")} are particularly interesting.` : "Several valuable insights have emerged."}\n\n`;
      
      // Add a summarization to consolidate learning
      response += `So far, I'm hearing that: \n`;
      recentUserMessages.slice(0, 3).forEach(msg => {
        response += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
      });
      
      response += `\nTo deepen our exploration: ${strategies.redirections[1]} What connections do you see between these different perspectives?\n\n`;
    }
    else {
      // Concluding stage facilitation focuses on consolidation and next steps
      response = `As we move toward wrapping up our session, let's consolidate what we've covered.\n\n`;
      
      // Summarize key points
      response += `The discussion has touched on ${userTopics.length > 0 ? userTopics.join(", ") : "several important aspects"}. Some key insights include:\n\n`;
      
      // Extract a few points from recent messages
      recentUserMessages.slice(0, 2).forEach(msg => {
        response += `- ${msg.substring(0, 80)}${msg.length > 80 ? '...' : ''}\n`;
      });
      
      // Add reflection prompt
      response += `\nAs we conclude, what do you see as the most valuable takeaway from our discussion? What specific actions might you consider based on today's conversation?`;
    }
    
    return response;
  }
}

/**
 * Analyze participation patterns in the conversation
 */
function analyzeParticipation(messages: any[], participants: any[]) {
  // Count messages per participant
  const messageCounts: {[key: string]: number} = {};
  const userMessages = messages.filter(m => m.sender === 'user');
  
  userMessages.forEach(msg => {
    const participantId = msg.participant;
    messageCounts[participantId] = (messageCounts[participantId] || 0) + 1;
  });
  
  // Calculate participation metrics
  const totalMessages = userMessages.length;
  const totalParticipants = participants.length;
  const activeParticipants = Object.keys(messageCounts).length;
  
  // Calculate participation distribution
  let participationBalance = 0;
  if (activeParticipants > 1) {
    const counts = Object.values(messageCounts);
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // Normalize to 0-1 scale where 1 is perfectly balanced
    participationBalance = Math.max(0, Math.min(1, 1 - coefficientOfVariation / 2));
  }
  
  // Create summary text
  let summary = "";
  if (totalMessages === 0) {
    summary = "No messages have been shared yet.";
  } else if (activeParticipants === 0) {
    summary = "No participant contributions detected.";
  } else {
    summary = `${activeParticipants} of ${totalParticipants} participants have contributed (${Math.round(activeParticipants/totalParticipants*100)}%).`;
    
    if (participationBalance < 0.3) {
      summary += " The conversation is dominated by a few participants.";
    } else if (participationBalance < 0.7) {
      summary += " There is moderate variation in participation levels.";
    } else {
      summary += " Participation is well-balanced among active participants.";
    }
  }
  
  return {
    messageCounts,
    totalMessages,
    totalParticipants,
    activeParticipants,
    participationBalance,
    summary
  };
}

/**
 * Extract main topics from user messages
 */
function extractUserTopics(messages: any[]): string[] {
  const userMessages = messages.filter(m => m.sender === 'user');
  
  if (userMessages.length === 0) return [];
  
  // Simple keyword extraction - in a real implementation, this would use
  // NLP techniques or AI to extract meaningful topics
  const allText = userMessages.map(m => m.content).join(" ").toLowerCase();
  
  // Remove common words and punctuation
  const stopWords = ["the", "and", "a", "to", "of", "in", "is", "it", "that", "for", "on", "with", "as", "this", "by", "be", "or", "at", "an"];
  const words = allText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Count word frequencies
  const wordCounts: {[key: string]: number} = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Get the top words
  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return topWords;
}

/**
 * Prune messages to fit within token limit
 */
function pruneMessagesToFitContext(messages: any[], maxTokens: number): any[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) {
    return messages;
  }
  
  // Keep the most recent messages and a few from the beginning for context
  const initialMessages = messages.slice(0, 2); // Keep first 2 messages
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES + 2); // Keep most recent messages
  
  return [...initialMessages, ...recentMessages];
}
