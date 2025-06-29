import { REPORT_TEMPLATES } from "./report-templates.ts";

/**
 * ENHANCED: Generate template response with complete facilitator and session context
 */
export function generateEnhancedTemplateResponse(
  messages: any[],
  generateReport: boolean,
  conversation: any,
  sessionProgress: string,
  participantStats: any,
  userTopics: string[],
  participantCount: number,
  participantDescription: string,
  facilitatorContext?: any,
  sessionObjective?: string
) {
  if (generateReport) {
    return generateReportTemplate(messages, conversation, participantStats, userTopics, participantCount, participantDescription, facilitatorContext, sessionObjective);
  }

  // ENHANCED: Generate contextual facilitator response with complete context
  const sessionType = conversation?.sessions?.session_type || "workshop";
  const sessionTitle = conversation?.sessions?.title || "Discussion Session";
  const objective = sessionObjective || conversation?.sessions?.objective || "facilitate meaningful discussion";
  
  // ENHANCED: Use complete facilitator context
  const facilitatorName = facilitatorContext?.name || 'Facilitator';
  const facilitatorDetails = facilitatorContext?.details || '';
  const facilitatorExpertise = facilitatorContext?.expertise || '';
  const facilitatorSpecialties = facilitatorContext?.specialties || [];

  console.log('ENHANCED: Generating template response with complete facilitator context:', {
    facilitatorName,
    facilitatorDetails,
    facilitatorExpertise,
    facilitatorSpecialties,
    participantDescription,
    objective
  });

  let response = "";

  // ENHANCED: Tailor response based on session progress and complete context
  switch (sessionProgress) {
    case "early":
      response = `Hello everyone! I'm ${facilitatorName}`;
      if (facilitatorDetails) {
        response += `, ${facilitatorDetails}`;
      }
      response += `. Welcome to our ${sessionType} on "${sessionTitle}".\n\n`;
      
      if (objective) {
        response += `Our goal today is: ${objective}\n\n`;
      }
      
      if (participantDescription) {
        response += `I'm excited to work with ${participantCount} ${participantDescription} `;
        if (facilitatorExpertise || facilitatorSpecialties.length > 0) {
          response += `and bring my expertise in ${facilitatorSpecialties.join(', ') || facilitatorExpertise} to help guide our discussion.\n\n`;
        } else {
          response += `to explore this topic together.\n\n`;
        }
      }
      
      // ENHANCED: Tailor opening question to participant type
      if (participantDescription?.toLowerCase().includes('squad') || participantDescription?.toLowerCase().includes('team')) {
        response += "To get started, could each of you briefly introduce yourselves and share your role in the team? What specific challenges or goals are you hoping to address in this session?";
      } else if (participantDescription?.toLowerCase().includes('student') || participantDescription?.toLowerCase().includes('learner')) {
        response += "Let's begin with introductions. Please share your name and what you're hoping to learn or achieve from this session.";
      } else {
        response += "Let's start with introductions. Please share your name and what brings you to this session today.";
      }
      break;

    case "middle":
      if (userTopics.length > 0) {
        response = `Thank you for sharing your thoughts on ${userTopics.slice(0, 3).join(", ")}. `;
        if (facilitatorName !== 'Facilitator') {
          response += `As ${facilitatorName}, `;
        }
        response += `I'd like to dive deeper into these areas in relation to our objective: ${objective}.\n\n`;
      } else {
        response = `Great discussion so far! `;
        if (facilitatorDetails) {
          response += `Drawing from my experience (${facilitatorDetails}), `;
        }
        response += `let's explore this topic further.\n\n`;
      }
      
      // ENHANCED: Add context-specific follow-up
      if (participantDescription?.toLowerCase().includes('squad') || participantDescription?.toLowerCase().includes('team')) {
        response += "How do you see these concepts applying to your team's current challenges? What specific situations have you encountered that relate to what we're discussing?";
      } else {
        response += "What are your thoughts on how this applies to your specific context? Are there particular aspects you'd like to explore further?";
      }
      break;

    case "concluding":
      response = `As we wrap up our ${sessionType}, `;
      if (facilitatorName !== 'Facilitator') {
        response += `I want to thank you as ${facilitatorName} `;
      } else {
        response += `I want to thank you `;
      }
      response += `for the valuable insights shared by our ${participantCount} ${participantDescription || 'participants'}.\n\n`;
      
      if (objective) {
        response += `Reflecting on our objective - ${objective} - what key takeaways will you apply moving forward?\n\n`;
      }
      
      if (facilitatorDetails || facilitatorSpecialties.length > 0) {
        response += `Based on my experience${facilitatorSpecialties.length > 0 ? ` in ${facilitatorSpecialties.join(', ')}` : ''}, I encourage you to continue exploring these concepts. `;
      }
      
      response += "Please share one action item or insight you'll take away from today's session.";
      break;

    default:
      // ENHANCED: Default response with complete facilitator context
      response = `Thank you for your contributions. `;
      if (facilitatorName !== 'Facilitator') {
        response += `As ${facilitatorName}, `;
      }
      if (facilitatorDetails) {
        response += `drawing from my background in ${facilitatorDetails}, `;
      }
      response += `I'd like to hear more about your perspectives on ${objective || 'our topic'}.\n\n`;
      
      if (participantDescription) {
        response += `Given your background as ${participantDescription}, what specific insights or experiences can you share that relate to what we're discussing?`;
      } else {
        response += "What are your thoughts on this topic? I'd love to hear your perspectives and experiences.";
      }
  }

  return response;
}

/**
 * ENHANCED: Generate report template with complete facilitator context
 */
function generateReportTemplate(
  messages: any[],
  conversation: any,
  participantStats: any,
  userTopics: string[],
  participantCount: number,
  participantDescription: string,
  facilitatorContext?: any,
  sessionObjective?: string
) {
  const template = REPORT_TEMPLATES.standard;
  const sessionTitle = conversation?.sessions?.title || "Session";
  const objective = sessionObjective || conversation?.sessions?.objective || "facilitate discussion";
  const facilitatorName = facilitatorContext?.name || 'Facilitator';
  const facilitatorDetails = facilitatorContext?.details || '';

  let report = `# ${sessionTitle} - Session Report\n\n`;
  
  // ENHANCED: Include complete facilitator context in report
  report += `**Facilitated by:** ${facilitatorName}\n`;
  if (facilitatorDetails) {
    report += `**Facilitator Background:** ${facilitatorDetails}\n`;
  }
  report += `**Session Objective:** ${objective}\n`;
  report += `**Participants:** ${participantCount} ${participantDescription || 'participants'}\n`;
  report += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

  // ENHANCED: Context-aware report sections
  report += `## Overview\n`;
  report += `This ${conversation?.sessions?.session_type || 'workshop'} brought together ${participantCount} ${participantDescription} `;
  report += `to focus on: ${objective}. `;
  if (facilitatorDetails) {
    report += `${facilitatorName}, with expertise in ${facilitatorDetails}, facilitated the discussion.\n\n`;
  } else {
    report += `The session was facilitated to encourage participation and meaningful dialogue.\n\n`;
  }

  report += `## Participation Analysis\n`;
  report += `${participantStats.summary}\n\n`;

  if (userTopics.length > 0) {
    report += `## Key Topics Discussed\n`;
    userTopics.forEach((topic, index) => {
      report += `${index + 1}. ${topic}\n`;
    });
    report += `\n`;
  }

  report += `## Recommendations\n`;
  if (participantDescription?.toLowerCase().includes('squad') || participantDescription?.toLowerCase().includes('team')) {
    report += `- Continue team collaboration on the topics discussed\n`;
    report += `- Schedule follow-up sessions to track progress on ${objective}\n`;
    report += `- Apply learnings to current team challenges\n`;
  } else {
    report += `- Continue exploring the topics discussed in individual practice\n`;
    report += `- Consider additional sessions to deepen understanding\n`;
    report += `- Apply insights to relevant contexts\n`;
  }

  if (facilitatorContext?.specialties?.length > 0) {
    report += `- Leverage additional resources in ${facilitatorContext.specialties.join(', ')}\n`;
  }

  report += `\n## Conclusion\n`;
  report += `The session successfully engaged ${participantCount} ${participantDescription} in meaningful discussion around ${objective}. `;
  if (facilitatorDetails) {
    report += `${facilitatorName}'s expertise in ${facilitatorDetails} helped guide productive conversations and insights.`;
  }

  return report;
}
