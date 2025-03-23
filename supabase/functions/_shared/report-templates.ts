
// Report templates by session type
export const REPORT_TEMPLATES = {
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
};
