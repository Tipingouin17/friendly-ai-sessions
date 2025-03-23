
import { FACILITATION_STRATEGIES } from "./facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "./report-templates.ts";

/**
 * Generate a welcome message based on session context and language
 */
export function generateWelcomeMessage(
  sessionType: string,
  sessionTitle: string,
  sessionObjective: string,
  sessionLanguage: string,
  participantCount: number,
  participantDescription: string
) {
  // Basic welcome message
  let welcome = "";
  
  // Use basic translations for common welcome phrases based on language
  if (sessionLanguage === "es" || sessionLanguage === "Spanish") {
    welcome = `Bienvenido a nuestra sesión de ${sessionType} sobre ${sessionTitle}. ${sessionObjective ? `Nuestro objetivo hoy es ${sessionObjective}.` : ''} Estoy aquí para facilitar nuestra discusión.`;
  } else if (sessionLanguage === "fr" || sessionLanguage === "French") {
    welcome = `Bienvenue à notre session de ${sessionType} sur ${sessionTitle}. ${sessionObjective ? `Notre objectif aujourd'hui est de ${sessionObjective}.` : ''} Je suis là pour faciliter notre discussion.`;
  } else if (sessionLanguage === "de" || sessionLanguage === "German") {
    welcome = `Willkommen zu unserer ${sessionType}-Sitzung zum Thema ${sessionTitle}. ${sessionObjective ? `Unser Ziel heute ist es, ${sessionObjective}.` : ''} Ich bin hier, um unsere Diskussion zu moderieren.`;
  } else if (sessionLanguage === "zh" || sessionLanguage === "Chinese") {
    welcome = `欢迎参加我们关于${sessionTitle}的${sessionType}会议。${sessionObjective ? `今天我们的目标是${sessionObjective}。` : ''} 我在这里是为了促进我们的讨论。`;
  } else if (sessionLanguage === "ar" || sessionLanguage === "Arabic") {
    welcome = `مرحبًا بك في جلسة ${sessionType} حول ${sessionTitle}. ${sessionObjective ? `هدفنا اليوم هو ${sessionObjective}.` : ''} أنا هنا لتسهيل مناقشتنا.`;
  } else {
    // Default to English
    welcome = `Welcome to our ${sessionType} session on ${sessionTitle}. ${sessionObjective ? `Our objective today is to ${sessionObjective}.` : ''} I'm here to facilitate our discussion.`;
  }
  
  // Adapt based on participant count and description (keep in selected language)
  if (participantCount > 1) {
    if (sessionLanguage === "es" || sessionLanguage === "Spanish") {
      welcome += ` Veo que tenemos ${participantCount} participantes hoy${participantDescription ? ` descritos como ${participantDescription}` : ""}.`;
    } else if (sessionLanguage === "fr" || sessionLanguage === "French") {
      welcome += ` Je vois que nous avons ${participantCount} participants aujourd'hui${participantDescription ? ` décrits comme ${participantDescription}` : ""}.`;
    } else if (sessionLanguage === "de" || sessionLanguage === "German") {
      welcome += ` Ich sehe, dass wir heute ${participantCount} Teilnehmer haben${participantDescription ? `, die als ${participantDescription} beschrieben werden` : ""}.`;
    } else if (sessionLanguage === "zh" || sessionLanguage === "Chinese") {
      welcome += ` 我看到我们今天有${participantCount}名参与者${participantDescription ? `，被描述为${participantDescription}` : ""}。`;
    } else if (sessionLanguage === "ar" || sessionLanguage === "Arabic") {
      welcome += ` أرى أن لدينا ${participantCount} مشاركين اليوم${participantDescription ? ` وصفهم بأنهم ${participantDescription}` : ""}.`;
    } else {
      welcome += ` I see we have ${participantCount} participants today${participantDescription ? ` described as ${participantDescription}` : ""}.`;
    }
  }
  
  // Add final prompt in the selected language
  if (sessionLanguage === "es" || sessionLanguage === "Spanish") {
    welcome += " Por favor, comparta sus pensamientos iniciales sobre el tema.";
  } else if (sessionLanguage === "fr" || sessionLanguage === "French") {
    welcome += " Veuillez partager vos réflexions initiales sur le sujet.";
  } else if (sessionLanguage === "de" || sessionLanguage === "German") {
    welcome += " Bitte teilen Sie Ihre ersten Gedanken zum Thema mit.";
  } else if (sessionLanguage === "zh" || sessionLanguage === "Chinese") {
    welcome += " 请分享您对该主题的初步想法。";
  } else if (sessionLanguage === "ar" || sessionLanguage === "Arabic") {
    welcome += " يرجى مشاركة أفكارك الأولية حول الموضوع.";
  } else {
    welcome += " Please share your initial thoughts on the topic.";
  }
  
  return welcome;
}

/**
 * Generate a template-based facilitator response
 */
export function generateFacilitatorResponse(
  sessionProgress: string,
  participantStats: any,
  userTopics: string[],
  recentUserMessages: string[],
  groupSizeApproach: string,
  languageStyle: string,
  strategies: any
) {
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
      if (groupSizeApproach === "large group") {
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
