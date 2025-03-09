
export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp?: Date;
  created_at?: string; // Added to support both timestamp and created_at
  participant?: string;
  color?: string;
  isReport?: boolean;
  likes?: string[]; // Array of participant identifiers who liked the message
  avatar?: string; // Added for participant avatar
  isAnonymous?: boolean; // Flag for anonymous messages
}

export interface ParticipantInfo {
  id: number;
  name: string;
  avatar: string;
  isAnonymous?: boolean; // Changed from is_anonymous to isAnonymous for consistency
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
