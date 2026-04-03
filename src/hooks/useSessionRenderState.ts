/**
 * use Session Render State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef } from "react";
import { SessionContextProps } from "@/types/session";

export function useSessionRenderState(
  props: SessionContextProps,
  effectiveAdmin: boolean,
  isLoading: boolean,
  error: string | null,
  retryConnection: () => void,
  connectionAttempts: number
) {
  const [renderState, setRenderState] = useState<{
    showLoading: boolean;
    showError: boolean;
    showErrorMessage: string | null;
    showNoConversation: boolean;
  }>({
    showLoading: true,
    showError: false,
    showErrorMessage: null,
    showNoConversation: false
  });

  // Update render state based on props
  useEffect(() => {
    setRenderState({
      showLoading: isLoading && !props.conversation && !(effectiveAdmin && props.isAdmin),
      showError: !!props.error || !!error,
      showErrorMessage: props.error || error,
      showNoConversation: !props.currentConversationId && !isLoading && !effectiveAdmin
    });
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, isLoading, effectiveAdmin, error]);

  return {
    renderState,
    retryConnection,
    connectionAttempts
  };
}
