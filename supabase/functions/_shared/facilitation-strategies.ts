
// Facilitation strategies mapped by session type
export const FACILITATION_STRATEGIES = {
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
};
