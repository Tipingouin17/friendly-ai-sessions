/**
 * chat
 *
 * Type definitions for the AIfacilitator application.
 */
export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant" | "admin";
  timestamp?: Date;
  created_at?: string;
  participant?: string;
  name?: string;
  color?: string;
  isReport?: boolean;
  avatar?: string;
  isAnonymous?: boolean;
  isPinned?: boolean;
  recipientId?: string;
  isAdminMessage?: boolean;
  isWelcomeMessage?: boolean;
  isFallback?: boolean;
  isAIGenerated?: boolean;
  isEnhanced?: boolean;
  isPrivateToHost?: boolean;
}

export interface ParticipantInfo {
  id: number;
  name: string;
  avatar?: string | null;
  avatarSeed?: string | null;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  isHost?: boolean;
  joinedAt?: Date;
  lastActive?: Date;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

export interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
