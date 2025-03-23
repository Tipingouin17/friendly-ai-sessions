
/**
 * Generate report content based on session data and participant information
 */
export function generateReportContent(
  sessionTitle: string,
  sessionObjective: string,
  participantCount: number,
  participantDescription: string,
  userTopics: string[],
  participantStats: any,
  groupSizeApproach: string,
  messages: any[]
) {
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
}
