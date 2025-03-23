
/**
 * Calls OpenAI API to generate a response based on conversation context
 */
export async function generateOpenAIResponse(
  openaiApiKey: string,
  prompt: string,
  promptContent: string,
  generateReport: boolean
) {
  try {
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
    
    if (data.choices && data.choices[0]?.message?.content) {
      return {
        content: data.choices[0].message.content,
        success: true
      };
    } else {
      console.error("OpenAI API returned unexpected format:", data);
      return {
        content: "",
        success: false,
        error: "Unexpected response format from OpenAI"
      };
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error instanceof Error ? error.message : "Unknown error");
    return {
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate AI response"
    };
  }
}

/**
 * Prepares the prompt for OpenAI based on conversation context
 */
export function prepareOpenAIPrompt(
  conversation: any,
  sessionProgress: string,
  participantCount: number,
  participantDescription: string,
  strategies: any
) {
  const sessionType = conversation?.sessions?.session_type || "workshop";
  const sessionObjective = conversation?.sessions?.objective || "facilitate a productive discussion";
  const sessionTitle = conversation?.sessions?.title || "Discussion Session";
  
  return conversation?.sessions?.prompt || 
    `You are an expert facilitator leading a ${sessionType} session titled "${sessionTitle}". 
    Your objective is to ${sessionObjective}. 
    
    Current session progress: ${sessionProgress} stage.
    
    PARTICIPANT INFORMATION:
    Number of participants: ${participantCount}
    Participant description: ${participantDescription || "No specific description provided"}
    
    Use these facilitation techniques: ${strategies.techniques.join(", ")}.
    When needed, redirect the conversation with questions like: ${strategies.redirections.join(" Or, ")}
    
    Adapt your facilitation style to the participant count:
    - For small groups (1-3): Use more direct questioning and personal engagement
    - For medium groups (4-8): Balance group discussion with individual contributions
    - For large groups (9+): Focus on structured sharing and synthesizing multiple viewpoints
    
    Tailor your language and examples to match the described participants' background and context.
    
    For less active participants, ask direct but gentle questions to include them.
    Balance the conversation by acknowledging frequent contributors while encouraging others.`;
}

/**
 * Prepares the content for OpenAI based on conversation context and messages
 */
export function prepareOpenAIContent(
  recentMessages: any[],
  participantCount: number, 
  participantDescription: string,
  userTopics: string[],
  participantStats: any,
  participants: any[],
  generateReport: boolean,
  reportTemplate: any
) {
  let promptContent = `Here's the current state of the discussion:\n\n`;
  
  // Add participant context information 
  promptContent += `PARTICIPANT CONTEXT:\n`;
  promptContent += `- Number of participants: ${participantCount}\n`;
  promptContent += `- Description: ${participantDescription || "No specific description provided"}\n\n`;
  
  // Add key topics being discussed
  if (userTopics.length > 0) {
    promptContent += `Key topics being discussed: ${userTopics.join(", ")}\n\n`;
  }
  
  // Add participation patterns
  promptContent += `Participation patterns: ${participantStats.summary}\n\n`;
  
  // Add the conversation history in a structured format
  promptContent += "Recent messages:\n";
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
    promptContent += `\nGenerate a comprehensive session report with these sections:\n`;
    reportTemplate.sections.forEach((section: any) => {
      promptContent += `- ${section.title}: ${section.description}\n`;
    });
    promptContent += "\nAnalyze the discussion to identify patterns, key insights, action items, and recommendations.";
    promptContent += "\nInclude information about the participant demographics and how it influenced the discussion.";
  } else {
    promptContent += `\nBased on this conversation and the participant information provided (${participantCount} participants described as: "${participantDescription}"), provide a thoughtful facilitator response that:
    1. Acknowledges key points raised
    2. Guides the discussion forward
    3. Encourages deeper exploration
    4. Involves less active participants when appropriate
    5. Uses language and examples appropriate for the described participants`;
  }
  
  return promptContent;
}
