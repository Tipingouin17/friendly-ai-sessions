
import { FACILITATION_STRATEGIES } from "./facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "./report-templates.ts";
import { analyzeSessionContext, determineSessionProgress } from "./context-analyzer.ts";
import { generateWelcomeMessage, generateFacilitatorResponse } from "./template-helpers.ts";
import { generateReportContent } from "./report-generator.ts";

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
  // Get session information
  const sessionType = conversation?.sessions?.session_type || "workshop";
  const sessionTitle = conversation?.sessions?.title || "Discussion Session";
  const sessionObjective = conversation?.sessions?.objective || "facilitate a productive discussion";
  const sessionLanguage = conversation?.language || "en";
  
  // Get the appropriate facilitation strategies
  const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
  
  // Get recent user messages
  const recentUserMessages = messages
    .filter(m => m.sender === 'user')
    .slice(-5)
    .map(m => m.content);
  
  // Analyze context for facilitation approach
  const { groupSizeApproach, languageStyle } = analyzeSessionContext(participantCount, participantDescription);
  
  if (generateReport) {
    // Generate report using the report generator
    return generateReportContent(
      sessionTitle,
      sessionObjective,
      participantCount,
      participantDescription,
      userTopics,
      participantStats,
      groupSizeApproach,
      messages
    );
  } else if (recentUserMessages.length === 0) {
    // Generate welcome message
    return generateWelcomeMessage(
      sessionType,
      sessionTitle,
      sessionObjective,
      sessionLanguage,
      participantCount,
      participantDescription
    );
  } else {
    // Generate facilitator response
    return generateFacilitatorResponse(
      sessionProgress,
      participantStats,
      userTopics,
      recentUserMessages,
      groupSizeApproach,
      languageStyle,
      strategies
    );
  }
}
