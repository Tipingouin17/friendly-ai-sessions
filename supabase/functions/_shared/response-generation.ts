import { FACILITATION_STRATEGIES } from "./facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "./report-templates.ts";

/**
 * Generate an enhanced template-based response with better context awareness
 * Includes participant count and description
 */
export function generateEnhancedTemplateResponse(
  messages: any[], 
  generateReport: boolean,
  conversation: any,
  sessionProgress: string,
  participantStats: any,
  userTopics: string[],
  participantCount: number,
  participantDescription: string
) {
  // IMPROVED TEMPLATES WITH PARTICIPANT AWARENESS
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
  
  // Determine appropriate facilitation approach based on participant count
  let groupSizeApproach = "";
  if (participantCount <= 3) {
    groupSizeApproach = "small group";
  } else if (participantCount <= 8) {
    groupSizeApproach = "medium group"; 
  } else {
    groupSizeApproach = "large group";
  }
  
  // Determine language style based on participant description
  let languageStyle = "professional";
  if (participantDescription) {
    const descLower = participantDescription.toLowerCase();
    if (descLower.includes("student") || descLower.includes("young") || descLower.includes("beginner")) {
      languageStyle = "accessible";
    } else if (descLower.includes("expert") || descLower.includes("technical") || descLower.includes("professional")) {
      languageStyle = "technical";
    } else if (descLower.includes("executive") || descLower.includes("leader") || descLower.includes("senior")) {
      languageStyle = "executive";
    }
  }
  
  if (generateReport) {
    // ENHANCED REPORT GENERATION WITH PARTICIPANT AWARENESS
    const reportTemplate = REPORT_TEMPLATES[sessionType as keyof typeof REPORT_TEMPLATES] || REPORT_TEMPLATES.default;
    
    let reportContent = `# ${sessionTitle} - Session Report\n\n`;
    
    // Add session context with participant information
    reportContent += `## Session Overview\n`;
    reportContent += `- **Objective**: ${sessionObjective}\n`;
    reportContent += `- **Participants**: ${participantCount} ${participantDescription ? `(${participantDescription})` : ""}\n`;
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
    
    // Add participation summary with context awareness
    reportContent += `## Participation Summary\n`;
    reportContent += `${participantStats.summary}\n`;
    reportContent += `This ${groupSizeApproach} of ${participantCount} ${participantDescription ? `(${participantDescription})` : "participants"} showed ${participantStats.participationBalance > 0.7 ? "strong" : participantStats.participationBalance > 0.4 ? "moderate" : "variable"} engagement.\n\n`;
    
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
    // Welcome message with participant awareness
    let welcome = `Welcome to our ${sessionType} session on ${sessionTitle}. ${sessionObjective ? `Our objective today is to ${sessionObjective}.` : ''} I'm here to facilitate our discussion.`;
    
    // Adapt based on participant count and description
    if (participantCount > 1) {
      welcome += ` I see we have ${participantCount} participants today${participantDescription ? ` described as ${participantDescription}` : ""}.`;
    }
    
    // Add group-size appropriate opener
    if (participantCount <= 3) {
      welcome += " Since we're a small group, we'll have plenty of opportunity for each of you to share your thoughts in depth.";
    } else if (participantCount <= 8) {
      welcome += " With our medium-sized group, we'll aim for a balance of individual contributions and group discussion.";
    } else {
      welcome += " With our larger group, I'll help ensure everyone has a chance to contribute as we explore the topic together.";
    }
    
    welcome += " Please share your initial thoughts on the topic.";
    
    return welcome;
  } else {
    // FACILITATION INTELLIGENCE WITH PARTICIPANT AWARENESS
    // Create a more thoughtful response based on session progress, participation, and participant context
    let response = '';
    
    // Add appropriate greeting based on language style
    if (languageStyle === "accessible") {
      response = `Thanks for sharing your thoughts! `;
    } else if (languageStyle === "technical") {
      response = `Thank you for your detailed contributions. `;
    } else if (languageStyle === "executive") {
      response = `Thank you for those insights. `;
    } else {
      response = `Thank you for sharing your perspectives. `;
    }
    
    // Add topic acknowledgment
    response += `I notice we're discussing ${userTopics.length > 0 ? userTopics.join(", ") : "several interesting points"}.\n\n`;
    
    // Add stage-appropriate facilitation
    if (sessionProgress === "early") {
      // Early stage facilitation focuses on exploration
      if (participantStats.participationBalance < 0.5) {
        // Low participation balance - encourage quieter participants
        if (participantCount > 3) {
          response += `I'd like to hear from more participants. What are your thoughts on what's been shared so far?\n\n`;
        } else {
          response += `I'd love to hear your perspective on this topic.\n\n`;
        }
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
      
      // Adapt question based on group size and language style
      if (groupSizeApproach === "small group") {
        response += `\nTo deepen our exploration: ${strategies.redirections[1]} What personal examples can you share related to this topic?\n\n`;
      } else if (groupSizeApproach === "large group") {
        response += `\nTo build on these ideas: How do these concepts apply in your specific contexts? Feel free to share brief examples.\n\n`;
      } else {
        response += `\nTo deepen our exploration: ${strategies.redirections[1]} What connections do you see between these different perspectives?\n\n`;
      }
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
      
      // Add reflection prompt based on group size
      if (groupSizeApproach === "large group") {
        response += `\nAs we conclude, take a moment to reflect: What is your main takeaway from today's discussion? What specific actions might you consider based on our conversation?`;
      } else {
        response += `\nAs we conclude, what do you see as the most valuable takeaway from our discussion? What specific actions might you consider based on today's conversation?`;
      }
    }
    
    return response;
  }
}
