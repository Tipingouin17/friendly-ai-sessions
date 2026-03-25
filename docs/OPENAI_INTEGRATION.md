# OpenAI Integration Documentation

## Overview

The AI facilitator system uses the OpenAI API to generate contextual, intelligent responses during workshop sessions. The integration replaces the previous mock/placeholder responses with real AI-powered conversation facilitation.

## Architecture

The OpenAI integration lives in `supabase_proxy/server.py` and is invoked through two edge function endpoints:

| Endpoint | Purpose | When Called |
|----------|---------|-------------|
| `handle-facilitator-response` | Generate welcome messages and follow-up responses | On session start and after host clicks "Continue" |
| `close-session-and-generate-report` | Generate a comprehensive session report | When host clicks "Close & Get Report" |

## Model Configuration

The system maps the frontend's `gpt_version` field to available models through the `GPT_MODEL_MAP` dictionary. The proxy environment provides access to three models:

| Frontend Value | Mapped Model | Use Case |
|---------------|-------------|----------|
| `gpt-4`, `gpt-4o`, `gpt-4-turbo` | `gpt-4.1-mini` | Primary facilitation (welcome + follow-ups) |
| `gpt-3.5-turbo`, `gpt-3.5` | `gpt-4.1-nano` | Lighter-weight responses |
| *(default fallback)* | `gpt-4.1-mini` | When no model is specified |

## System Prompt Construction

The AI system prompt is built dynamically from session metadata to ensure contextual relevance. The prompt includes the following components assembled in order:

1. **Facilitator Identity** -- The facilitator's name, personality description, and background details from the `facilitators` table.
2. **Session Objective** -- The workshop's stated objective from the `sessions` table.
3. **Session Scope** -- The workshop scope/description providing additional context.
4. **Participant Description** -- Information about the participants' roles and expertise level.
5. **Behavioral Rules** -- Instructions for response length, tone, formatting, and engagement style.

## Message Flow

### Session Start (Welcome Message)

When the host clicks "Start Session," the frontend calls `handle-facilitator-response` with `sessionStart: true`. The AI receives a user prompt asking it to introduce itself and the workshop, then generates a contextual welcome message that references the specific workshop topic and objectives.

### Follow-up Responses (After Participant Answers)

After participants submit their answers and the host clicks "Continue," the system collects all new participant responses since the last AI message. The AI receives the full conversation history plus the new responses and generates a synthesis that addresses each participant by name, draws connections between their ideas, and poses a new engaging question.

### Session Report

When the host clicks "Close & Get Report," the system sends the entire conversation history to the AI with instructions to generate a structured markdown report including key themes, individual contributions, actionable insights, and recommendations.

## Conversation History Management

The system maintains full conversation history by querying all messages for the conversation ordered by creation time. Each message is formatted as either an `assistant` role (for AI/facilitator messages) or a `user` role (for participant messages, prefixed with the participant's name). This ensures the AI has complete context for generating coherent, progressive responses.

## Environment Variables

The integration requires the following environment variable:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | API key for OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | *(Optional)* Base URL override for proxy endpoints |

The `OpenAI()` client is initialized at module level and automatically reads these environment variables.

## Error Handling

If the OpenAI API call fails, the system falls back to a generic error message: *"I apologize, but I'm having trouble generating a response right now. Please try again."* The error details are logged to the server console for debugging.

## Testing

The integration was tested end-to-end with the following scenario:

1. Host creates a session with "Serious Game Master" facilitator and "Gamification Workshop" template.
2. Two participants (Alice and Bob) join the session.
3. Host starts the session, triggering an AI-generated welcome message about gamification.
4. Both participants respond with ideas about gamifying their work.
5. Host clicks "Continue," and the AI synthesizes both responses, referencing each participant by name.
6. This cycle repeats for 3 rounds, with the AI maintaining context and building on previous discussion.

All 3 rounds produced contextually relevant, participant-aware responses that correctly referenced the workshop topic, individual contributions, and prior conversation history.
