
/**
 * @deprecated Use the refactored hooks in session-joining/ directory instead
 */
import { useSessionJoiner as useRefactoredSessionJoiner } from "./session-joining/useSessionJoiner";

// Re-export the refactored hook to maintain backward compatibility
export const useSessionJoiner = useRefactoredSessionJoiner;
