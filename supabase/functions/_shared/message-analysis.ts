
/**
 * Analyze participation patterns in the conversation
 */
export function analyzeParticipation(messages: any[], participants: any[]) {
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
export function extractUserTopics(messages: any[]): string[] {
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
