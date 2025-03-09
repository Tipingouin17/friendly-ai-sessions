
import { useState } from 'react';
import { useSessionMessages } from './useSessionMessages';
import { useReportGenerator } from './useReportGenerator';
import { useParticipantResponses } from './useParticipantResponses';

type UseSessionStateProps = {
  conversationId: number | null;
  welcomeMessage: string | null;
  currentUserParticipantId: number | null;
};

export const useSessionState = ({
  conversationId,
  welcomeMessage,
  currentUserParticipantId
}: UseSessionStateProps) => {
  // State for input and recording
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"participant" | "admin">("participant");
  
  // Use our new hooks for specific functionalities
  const { messages, setMessages, error: messagesError } = useSessionMessages({
    conversationId,
    welcomeMessage
  });
  
  const { handleGenerateReport, isGeneratingReport, error: reportError } = useReportGenerator({
    conversationId,
    messages,
    setMessages
  });
  
  const { hasAnswered, totalResponses, recordResponse } = useParticipantResponses({
    messages,
    currentUserParticipantId
  });
  
  // Combine errors from different sources
  const error = messagesError || reportError || null;
  
  return {
    messages,
    inputMessage,
    setInputMessage,
    currentParticipant: currentUserParticipantId || 0,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport,
    setMessages,
    hasAnswered,
    totalResponses,
    viewMode,
    setViewMode,
    recordResponse,
    error
  };
};
