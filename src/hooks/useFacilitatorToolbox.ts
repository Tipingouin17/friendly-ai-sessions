import { useEffect, useMemo, useState } from "react";
import { fetchEnabledFacilitatorTools } from "@/services/facilitatorService";
import type { ConversationWithSession } from "@/types/database";
import type { FacilitatorToolAssignment } from "@/types/facilitator";

type ToolboxConversation = ConversationWithSession | (Partial<ConversationWithSession> & {
  session?: {
    facilitator?: number | string | { id?: number } | null;
    facilitator_id?: number | string | null;
    facilitator_details?: { id?: number } | null;
  } | null;
  facilitator_id?: number | string | null;
});

const extractFacilitatorId = (conversation: ToolboxConversation | null | undefined): number | null => {
  const session = conversation?.sessions ?? conversation?.session ?? null;
  const facilitator = session?.facilitator ?? session?.facilitator_id ?? conversation?.facilitator_id ?? null;

  if (typeof facilitator === "number") return facilitator;
  if (typeof facilitator === "string" && facilitator.trim()) {
    const parsed = Number(facilitator);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (facilitator && typeof facilitator === "object" && typeof facilitator.id === "number") {
    return facilitator.id;
  }

  const detailsId = session?.facilitator_details?.id;
  return typeof detailsId === "number" ? detailsId : null;
};

export const buildToolboxInstruction = (tools: FacilitatorToolAssignment[]): string | undefined => {
  const enabledTools = tools.filter((tool) => tool.enabled && tool.is_active);
  if (enabledTools.length === 0) return undefined;

  const toolList = enabledTools
    .map((tool) => {
      const behavior = tool.effective_config?.runtimeBehavior || tool.description || "Use when it best serves the session objective.";
      return `- ${tool.name} (${tool.slug}, ${tool.category}): ${behavior}`;
    })
    .join("\n");

  return [
    "[TOOLBOX] You have access to the following facilitator tools for this session. Choose the most appropriate tool internally according to participant needs, session objective, and host instruction. Do not claim to use unavailable tools.",
    toolList,
  ].join("\n");
};

export const useFacilitatorToolbox = (conversation: ToolboxConversation | null | undefined) => {
  const facilitatorId = useMemo(() => extractFacilitatorId(conversation), [conversation]);
  const [enabledTools, setEnabledTools] = useState<FacilitatorToolAssignment[]>([]);
  const [isLoadingToolbox, setIsLoadingToolbox] = useState(false);
  const [toolboxError, setToolboxError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!facilitatorId) {
      setEnabledTools([]);
      setToolboxError(null);
      setIsLoadingToolbox(false);
      return;
    }

    setIsLoadingToolbox(true);
    setToolboxError(null);

    fetchEnabledFacilitatorTools(facilitatorId)
      .then((tools) => {
        if (!cancelled) setEnabledTools(tools);
      })
      .catch((error) => {
        console.error("[TOOLBOX] Failed to load facilitator tools", error);
        if (!cancelled) {
          setEnabledTools([]);
          setToolboxError(error instanceof Error ? error.message : "Unable to load facilitator toolbox");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingToolbox(false);
      });

    return () => {
      cancelled = true;
    };
  }, [facilitatorId]);

  const toolboxInstruction = useMemo(() => buildToolboxInstruction(enabledTools), [enabledTools]);

  return {
    facilitatorId,
    enabledTools,
    isLoadingToolbox,
    toolboxError,
    toolboxInstruction,
  };
};
