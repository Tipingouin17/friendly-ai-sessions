/**
 * Session Full Page
 *
 * Shown when a participant tries to join a session that has reached
 * its maximum capacity. Provides:
 *  - Clear "session is full" messaging
 *  - Live participant count with auto-refresh
 *  - "Notify the Host" form so the waiting participant can signal
 *    their presence via a session_events row
 *  - Automatic transition back to the join form if a spot opens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Bell, RefreshCw, CheckCircle, Zap } from 'lucide-react';
import api from "@/lib/api";
import { ConversationWithSession } from '@/types/database';

interface SessionFullPageProps {
  conversation: ConversationWithSession | null;
  currentParticipantCount: number;
  effectiveMaxParticipants: number;
  onSpotOpened: () => void;   // called when count drops below max
  onRefresh: () => void;      // triggers a React Query refetch
}

const SessionFullPage: React.FC<SessionFullPageProps> = ({
  conversation,
  currentParticipantCount,
  effectiveMaxParticipants,
  onSpotOpened,
  onRefresh,
}) => {
  const [notifyName, setNotifyName] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const facilitatorDetails = conversation?.sessions?.facilitator_details;
  const sessionTitle = conversation?.sessions?.title || 'Workshop Session';
  const conversationId = conversation?.id;

  // ── Auto-refresh every 10 s to detect freed spots ───────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
      setLastRefreshed(new Date());
    }, 10_000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  // ── Detect when a spot opens ─────────────────────────────────────────────
  useEffect(() => {
    if (
      effectiveMaxParticipants > 0 &&
      currentParticipantCount < effectiveMaxParticipants
    ) {
      onSpotOpened();
    }
  }, [currentParticipantCount, effectiveMaxParticipants, onSpotOpened]);

  // ── Notify host ──────────────────────────────────────────────────────────
  const handleNotify = useCallback(async () => {
    if (!notifyName.trim() || !conversationId) return;
    setIsSending(true);
    try {
      await api.from('session_events').insert({
        conversation_id: conversationId,
        event_type: 'participant_waiting',
        data: {
          name: notifyName.trim(),
          message: notifyMessage.trim() || null,
          timestamp: new Date().toISOString(),
        },
      });
      setNotifySent(true);
    } catch (err) {
      console.error('Failed to notify host:', err);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, notifyName, notifyMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-start sm:items-center justify-center px-4 pt-6 pb-4 sm:py-4">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Facilitator banner */}
          {facilitatorDetails && (
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
              {facilitatorDetails.profile_picture ? (
                <img
                  src={facilitatorDetails.profile_picture}
                  alt={facilitatorDetails.title || 'Facilitator'}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  {(facilitatorDetails.title || 'F')[0]}
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Your Facilitator</p>
                <p className="text-white font-semibold">{facilitatorDetails.title || 'AI Facilitator'}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Session title */}
            <h1 className="text-xl font-bold text-gray-900 mb-1">{sessionTitle}</h1>

            {/* Full indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Users className="h-3.5 w-3.5" />
                Session Full
              </span>
              <span className="text-sm text-gray-400">
                {currentParticipantCount} / {effectiveMaxParticipants} participants
              </span>
            </div>

            {/* Message */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-amber-800 font-medium mb-1">
                This session has reached its maximum capacity.
              </p>
              <p className="text-xs text-amber-600">
                The page checks for open spots every 10 seconds. You will be taken to the join form automatically if a spot becomes available.
              </p>
            </div>

            {/* Auto-refresh status */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
              <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Checking for open spots… last checked {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Notify host section */}
            {!notifySent ? (
              <>
                {!showNotifyForm ? (
                  <button
                    onClick={() => setShowNotifyForm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors font-semibold text-sm py-3 px-4 rounded-xl"
                  >
                    <Bell className="h-4 w-4" />
                    Notify the Host I'm Waiting
                  </button>
                ) : (
                  <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/50">
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      Let the host know you're here
                    </p>

                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={notifyName}
                      onChange={e => setNotifyName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Message <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={notifyMessage}
                      onChange={e => setNotifyMessage(e.target.value)}
                      placeholder="e.g. I'm supposed to be in this session, can you make room?"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleNotify}
                        disabled={!notifyName.trim() || isSending}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        {isSending ? 'Sending…' : 'Send Notification'}
                      </button>
                      <button
                        onClick={() => setShowNotifyForm(false)}
                        className="px-4 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Notification sent!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    The host has been notified that you're waiting. Keep this page open — you'll be taken to the join form automatically if a spot opens.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default SessionFullPage;
