/**
 * Admin Messaging View
 *
 * Session component for the AIfacilitator application.
 * Includes a fully implemented Insights tab with real analytics.
 */

import React, { useMemo, useState } from 'react';
import { Message } from '@/types/chat';
import AdminMessageFilters from './AdminMessageFilters';
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, MessageSquare, BarChart4, List, Users, MessageCircle, TrendingUp, Award } from 'lucide-react';

interface AdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAnonymous: boolean;
  setShowAnonymous: (show: boolean) => void;
}

// ── Insights sub-components ──────────────────────────────────────────────────

interface InsightCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, label, value, sub, color = 'text-indigo-600' }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
    <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

interface ParticipantBarProps {
  name: string;
  count: number;
  max: number;
  color: string;
  rank: number;
}

const ParticipantBar: React.FC<ParticipantBarProps> = ({ name, count, max, color, rank }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-gray-400 w-4 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{count} msg{count !== 1 ? 's' : ''}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color || '#6366f1' }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const AdminMessagingView: React.FC<AdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  searchTerm,
  setSearchTerm,
  showAnonymous,
  setShowAnonymous
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  
  React.useEffect(() => { /* no-op */ }, [messages]);

  // Create a mapping of participant IDs to names
  const participantNameMap = useMemo(() => {
    const nameMap: { [key: string]: string } = {};
    messages.forEach(message => {
      if (message.participant && typeof message.participant === 'string') {
        if (isNaN(Number(message.participant)) && message.participant.includes(' ')) {
          nameMap[message.participant] = message.participant;
        }
      }
    });
    return nameMap;
  }, [messages]);

  const groupedMessages = useMemo(() => {
    if (messages.length > 0 && !messages.some(m => m.sender === "assistant")) {
      const userMessages = messages.filter(m => 
        m.sender === "user" && 
        (showAnonymous || !m.isAnonymous) &&
        (!searchTerm || m.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (userMessages.length > 0) {
        return [{
          question: {
            id: "default-question",
            content: "Participant messages",
            sender: "assistant",
            timestamp: new Date()
          },
          responses: userMessages
        }];
      }
    }

    const groups: { question: Message | { id: string; content: string; sender: string; timestamp: Date }; responses: Message[] }[] = [];
    let currentGroup: { question: Message | { id: string; content: string; sender: string; timestamp: Date } | null; responses: Message[] } = { question: null, responses: [] };

    for (const message of messages) {
      if (message.sender === "assistant" && !message.isReport) {
        if (currentGroup.question && currentGroup.responses.length > 0) {
          groups.push({ ...currentGroup } as { question: Message; responses: Message[] });
        }
        currentGroup = { question: message, responses: [] };
      } else if (message.sender === "user" && currentGroup.question) {
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      } else if (message.sender === "user" && !currentGroup.question) {
        if (groups.length === 0 && !currentGroup.question) {
          currentGroup = {
            question: {
              id: "default-question",
              content: "Participant messages",
              sender: "assistant",
              timestamp: new Date()
            },
            responses: []
          };
        }
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      }
    }
    
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup as { question: Message; responses: Message[] });
    }
    
    return groups;
  }, [messages, showAnonymous, searchTerm]);

  const totalResponses = groupedMessages.reduce((acc, group) => acc + group.responses.length, 0);
  
  const uniqueParticipants = useMemo(() => {
    const participantSet = new Set<string>();
    groupedMessages.forEach(group => {
      group.responses.forEach(response => {
        if (response.participant) participantSet.add(response.participant);
      });
    });
    return participantSet.size;
  }, [groupedMessages]);

  // ── Insights analytics ──────────────────────────────────────────────────────
  const insightsData = useMemo(() => {
    const userMessages = messages.filter(m => m.sender === 'user');
    const assistantMessages = messages.filter(m => m.sender === 'assistant' && !m.isReport);
    const totalMessages = userMessages.length;
    const totalQuestions = assistantMessages.length;
    
    // Messages per participant
    const participantCounts: Record<string, number> = {};
    userMessages.forEach(m => {
      const key = m.participant || m.sender || 'Unknown';
      participantCounts[key] = (participantCounts[key] || 0) + 1;
    });
    
    const participantList = Object.entries(participantCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    const maxCount = participantList[0]?.count || 1;
    
    // Participation rate
    const participationRate = currentParticipantCount > 0
      ? Math.round((uniqueParticipants / currentParticipantCount) * 100)
      : 0;
    
    // Average messages per participant
    const avgMessages = uniqueParticipants > 0
      ? (totalMessages / uniqueParticipants).toFixed(1)
      : '0';

    // Engagement score (0-100): combines participation rate + response density
    const responseDensity = totalQuestions > 0 ? Math.min(totalMessages / totalQuestions, 5) / 5 : 0;
    const engagementScore = Math.round((participationRate / 100 * 0.6 + responseDensity * 0.4) * 100);

    // Top contributor
    const topContributor = participantList[0];

    return {
      totalMessages,
      totalQuestions,
      uniqueParticipants,
      participationRate,
      avgMessages,
      engagementScore,
      topContributor,
      participantList,
      maxCount,
    };
  }, [messages, currentParticipantCount, uniqueParticipants]);

  const hasData = messages.length > 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4">
        <Tabs defaultValue="questions" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="questions" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1">
                <BarChart2 className="w-4 h-4" />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <button 
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => setViewMode('compact')}
                aria-label="Compact view"
              >
                <BarChart4 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <AdminMessageFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showAnonymous={showAnonymous}
            setShowAnonymous={setShowAnonymous}
            totalResponses={totalResponses}
            currentParticipantCount={currentParticipantCount}
            totalQuestions={groupedMessages.length}
            uniqueParticipants={uniqueParticipants}
          />
          
          <TabsContent value="questions" className="m-0 mt-2">
            {groupedMessages.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className={`space-y-${viewMode === 'compact' ? '4' : '8'} p-1`}>
                  {groupedMessages.map((group, groupIndex) => (
                    <AdminMessageGroup
                      key={`group-${groupIndex}-${group.question.id}`}
                      group={group}
                      groupIndex={groupIndex}
                      participantColors={participantColors}
                      participantNameMap={participantNameMap}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <MessageEmptyState
                isAdmin={true}
                messagesLength={messages.length}
                viewMode="admin"
              />
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="m-0 mt-4">
            {!hasData ? (
              <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-base font-medium text-gray-600 mb-1">No data yet</p>
                <p className="text-sm text-gray-400">
                  Insights will appear here once participants start sending messages.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-5 pb-4">
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <InsightCard
                      icon={<Users className="w-4 h-4" />}
                      label="Participation Rate"
                      value={`${insightsData.participationRate}%`}
                      sub={`${insightsData.uniqueParticipants} of ${currentParticipantCount} joined`}
                      color="text-indigo-600"
                    />
                    <InsightCard
                      icon={<MessageCircle className="w-4 h-4" />}
                      label="Total Messages"
                      value={insightsData.totalMessages}
                      sub={`${insightsData.avgMessages} avg per participant`}
                      color="text-blue-600"
                    />
                    <InsightCard
                      icon={<TrendingUp className="w-4 h-4" />}
                      label="Engagement Score"
                      value={`${insightsData.engagementScore}/100`}
                      sub="Based on participation & responses"
                      color={insightsData.engagementScore >= 70 ? 'text-emerald-600' : insightsData.engagementScore >= 40 ? 'text-amber-600' : 'text-red-500'}
                    />
                    <InsightCard
                      icon={<Award className="w-4 h-4" />}
                      label="Top Contributor"
                      value={insightsData.topContributor ? insightsData.topContributor.count : 0}
                      sub={insightsData.topContributor ? `${insightsData.topContributor.name}` : 'No messages yet'}
                      color="text-purple-600"
                    />
                  </div>

                  {/* Participation breakdown */}
                  {insightsData.participantList.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Messages per Participant
                      </h3>
                      <div className="space-y-0.5">
                        {insightsData.participantList.slice(0, 10).map((p, idx) => (
                          <ParticipantBar
                            key={p.name}
                            name={p.name}
                            count={p.count}
                            max={insightsData.maxCount}
                            color={Object.values(participantColors)[idx] || '#6366f1'}
                            rank={idx + 1}
                          />
                        ))}
                        {insightsData.participantList.length > 10 && (
                          <p className="text-xs text-gray-400 pt-2 text-center">
                            +{insightsData.participantList.length - 10} more participants
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Questions summary */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      Questions Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-blue-600">{insightsData.totalQuestions}</p>
                        <p className="text-xs text-blue-500 mt-0.5">Questions asked</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-indigo-600">{insightsData.totalMessages}</p>
                        <p className="text-xs text-indigo-500 mt-0.5">Responses</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-purple-600">
                          {insightsData.totalQuestions > 0
                            ? (insightsData.totalMessages / insightsData.totalQuestions).toFixed(1)
                            : '—'}
                        </p>
                        <p className="text-xs text-purple-500 mt-0.5">Avg responses/Q</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMessagingView;
