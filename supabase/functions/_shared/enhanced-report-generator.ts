
/**
 * Enhanced report generator that creates meaningful highlights and insights
 */

// Helper function to safely extract text content from JSONB or string
function extractTextContent(content: any): string {
  if (!content) return '';
  
  // If it's already a string, return it
  if (typeof content === 'string') return content;
  
  // If it's an object (JSONB), try to extract text content
  if (typeof content === 'object') {
    // Common patterns for content structure
    if (content.text) return String(content.text);
    if (content.content) return String(content.content);
    if (content.message) return String(content.message);
    
    // If it's an array, join the elements
    if (Array.isArray(content)) {
      return content.map(item => extractTextContent(item)).join(' ');
    }
    
    // Fallback: stringify the object
    return JSON.stringify(content);
  }
  
  // Fallback: convert to string
  return String(content);
}

export function generateEnhancedReportContent(
  sessionTitle: string,
  sessionObjective: string,
  participantCount: number,
  participantDescription: string,
  userTopics: string[],
  participantStats: any,
  groupSizeApproach: string,
  messages: any[]
) {
  const userMessages = messages.filter(m => m.role === 'user');
  const facilitatorMessages = messages.filter(m => m.role === 'assistant');
  
  let reportContent = `# ${sessionTitle} - Session Report\n\n`;
  
  // Executive Summary
  reportContent += `## Executive Summary\n`;
  reportContent += `This ${groupSizeApproach} session with ${participantCount} ${participantDescription ? `${participantDescription}` : "participants"} `;
  reportContent += `successfully facilitated discussions around: ${sessionObjective}. `;
  reportContent += `The session generated ${userMessages.length} participant contributions and ${facilitatorMessages.length} facilitator responses, `;
  reportContent += `demonstrating ${participantStats.participationBalance > 0.7 ? "excellent" : participantStats.participationBalance > 0.4 ? "good" : "varied"} engagement levels.\n\n`;
  
  // Key Insights
  reportContent += `## Key Insights\n`;
  const insights = extractKeyInsights(userMessages, participantStats);
  insights.forEach(insight => {
    reportContent += `- **${insight.category}**: ${insight.description}\n`;
  });
  reportContent += `\n`;
  
  // Discussion Highlights
  reportContent += `## Discussion Highlights\n`;
  const highlights = extractMeaningfulHighlights(userMessages);
  highlights.forEach((highlight, index) => {
    reportContent += `### ${index + 1}. ${highlight.topic}\n`;
    reportContent += `${highlight.content}\n\n`;
  });
  
  // Participation Analysis
  reportContent += `## Participation Analysis\n`;
  reportContent += `- **Active Participants**: ${participantStats.activeParticipants} of ${participantStats.totalParticipants} (${Math.round(participantStats.activeParticipants/participantStats.totalParticipants*100)}%)\n`;
  reportContent += `- **Total Messages**: ${participantStats.totalMessages}\n`;
  reportContent += `- **Average Messages per Active Participant**: ${Math.round(participantStats.totalMessages/participantStats.activeParticipants*10)/10}\n`;
  reportContent += `- **Engagement Distribution**: ${getEngagementDescription(participantStats.participationBalance)}\n\n`;
  
  // Key Themes
  if (userTopics.length > 0) {
    reportContent += `## Key Themes Discussed\n`;
    userTopics.forEach(topic => {
      reportContent += `- ${topic}\n`;
    });
    reportContent += `\n`;
  }
  
  // Recommendations
  reportContent += `## Recommendations\n`;
  const recommendations = generateRecommendations(participantStats, userMessages, sessionObjective);
  recommendations.forEach(rec => {
    reportContent += `- ${rec}\n`;
  });
  reportContent += `\n`;
  
  // Next Steps
  reportContent += `## Suggested Next Steps\n`;
  reportContent += `1. **Follow-up Actions**: Schedule individual follow-ups with key contributors\n`;
  reportContent += `2. **Resource Sharing**: Compile and share relevant resources mentioned during the session\n`;
  reportContent += `3. **Action Items**: Document and assign specific action items discussed\n`;
  if (participantStats.participationBalance < 0.5) {
    reportContent += `4. **Engagement**: Consider strategies to encourage broader participation in future sessions\n`;
  }
  
  return reportContent;
}

function extractKeyInsights(userMessages: any[], participantStats: any) {
  const insights = [];
  
  // Engagement insight
  if (participantStats.participationBalance > 0.7) {
    insights.push({
      category: "High Engagement",
      description: "Participants showed balanced and active engagement throughout the session"
    });
  } else if (participantStats.participationBalance < 0.3) {
    insights.push({
      category: "Focused Discussion",
      description: "Discussion was primarily driven by a few highly engaged participants"
    });
  }
  
  // Content depth insight
  const longMessages = userMessages.filter(m => {
    const content = extractTextContent(m.content);
    return content && content.length > 100;
  }).length;
  
  const shortMessages = userMessages.filter(m => {
    const content = extractTextContent(m.content);
    return content && content.length <= 50;
  }).length;
  
  if (longMessages > shortMessages) {
    insights.push({
      category: "In-depth Contributions",
      description: "Participants provided detailed, thoughtful responses indicating deep engagement with the topic"
    });
  } else if (shortMessages > longMessages * 2) {
    insights.push({
      category: "Quick Exchanges",
      description: "Discussion featured rapid exchanges and brief contributions, suggesting active real-time engagement"
    });
  }
  
  // Timing insight
  const firstHalf = userMessages.slice(0, Math.floor(userMessages.length / 2));
  const secondHalf = userMessages.slice(Math.floor(userMessages.length / 2));
  
  if (secondHalf.length > firstHalf.length * 1.2) {
    insights.push({
      category: "Building Momentum",
      description: "Participation increased as the session progressed, indicating growing engagement"
    });
  } else if (firstHalf.length > secondHalf.length * 1.2) {
    insights.push({
      category: "Strong Opening",
      description: "Session started with high engagement that maintained throughout"
    });
  }
  
  return insights;
}

function extractMeaningfulHighlights(userMessages: any[]) {
  const highlights = [];
  
  // Group messages by content themes (simplified)
  const themes = {
    questions: userMessages.filter(m => {
      const content = extractTextContent(m.content);
      return content && content.includes('?');
    }),
    agreements: userMessages.filter(m => {
      const content = extractTextContent(m.content).toLowerCase();
      return content && (content.includes('agree') || content.includes('yes'));
    }),
    challenges: userMessages.filter(m => {
      const content = extractTextContent(m.content).toLowerCase();
      return content && (content.includes('challenge') || content.includes('difficult'));
    }),
    solutions: userMessages.filter(m => {
      const content = extractTextContent(m.content).toLowerCase();
      return content && (content.includes('solution') || content.includes('suggest'));
    }),
  };
  
  // Create highlights from themes
  if (themes.questions.length > 0) {
    highlights.push({
      topic: "Key Questions Raised",
      content: `Participants raised ${themes.questions.length} important questions, demonstrating curiosity and engagement with the topic.`
    });
  }
  
  if (themes.agreements.length > 0) {
    highlights.push({
      topic: "Areas of Consensus",
      content: `Strong agreement emerged on several points, with ${themes.agreements.length} explicit expressions of consensus.`
    });
  }
  
  if (themes.challenges.length > 0) {
    highlights.push({
      topic: "Challenges Identified",
      content: `Participants identified key challenges and obstacles, showing critical thinking about implementation.`
    });
  }
  
  if (themes.solutions.length > 0) {
    highlights.push({
      topic: "Solutions Proposed",
      content: `Constructive solutions and suggestions were offered, indicating solution-oriented thinking.`
    });
  }
  
  // Add a general content highlight if we have messages but no specific themes
  if (highlights.length === 0 && userMessages.length > 0) {
    highlights.push({
      topic: "Active Discussion",
      content: `Participants engaged in meaningful dialogue with ${userMessages.length} contributions covering various aspects of the topic.`
    });
  }
  
  return highlights.slice(0, 3); // Limit to top 3 highlights
}

function getEngagementDescription(participationBalance: number): string {
  if (participationBalance > 0.8) return "Exceptionally balanced - all participants contributed equally";
  if (participationBalance > 0.6) return "Well balanced - most participants contributed actively";
  if (participationBalance > 0.4) return "Moderately balanced - some participants more active than others";
  if (participationBalance > 0.2) return "Uneven distribution - discussion led by a few participants";
  return "Highly concentrated - discussion dominated by very few participants";
}

function generateRecommendations(participantStats: any, userMessages: any[], objective: string): string[] {
  const recommendations = [];
  
  // Participation-based recommendations
  if (participantStats.participationBalance < 0.4) {
    recommendations.push("Consider strategies to encourage broader participation, such as structured turn-taking or smaller breakout groups");
  }
  
  if (participantStats.totalMessages / participantStats.totalParticipants < 2) {
    recommendations.push("Future sessions might benefit from longer duration to allow more in-depth exploration");
  }
  
  // Content-based recommendations
  const hasQuestions = userMessages.some(m => {
    const content = extractTextContent(m.content);
    return content && content.includes('?');
  });
  
  if (hasQuestions) {
    recommendations.push("Follow up on the questions raised during the session with additional resources or a Q&A session");
  }
  
  // Always include these standard recommendations
  recommendations.push("Document key insights and share them with all participants");
  recommendations.push("Consider scheduling follow-up sessions to continue the discussion");
  
  return recommendations;
}
