
export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp?: Date;
  created_at?: string; // Added to support both timestamp and created_at
  participant?: string;
  color?: string;
  isReport?: boolean;
  avatar?: string; // Added for participant avatar
  isAnonymous?: boolean; // Flag for anonymous messages
  isPinned?: boolean; // Flag for pinned messages
  recipientId?: string; // For directed messages
  isAdminMessage?: boolean; // Flag for admin messages
  isWelcomeMessage?: boolean; // Flag for welcome messages
}

export interface ParticipantInfo {
  id: number;
  name: string;
  avatar?: string; // Changed from required to optional
  avatarSeed?: string | null; // Added to match the data structure in useParticipantTracking
  isAnonymous?: boolean;
  isAdmin?: boolean; // Added to match usage in useParticipantTracking
  joinedAt?: Date; // Added for tracking when participants joined
  lastActive?: Date; // Added for tracking participant activity
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
