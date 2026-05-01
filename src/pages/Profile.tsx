/**
 * Profile — World-class redesign
 * Premium hero layout with stats bar, tabbed sections, and glassmorphism cards.
 */
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHead from '@/components/PageHead';
import { PlanInfo } from '@/components/subscription/PlanInfo';
import { AvatarUploadModal } from '@/components/profile/AvatarUploadModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { TwoFactorSetupModal } from '@/components/profile/TwoFactorSetupModal';
import { LoginActivityModal } from '@/components/profile/LoginActivityModal';
import { SessionManagementModal } from '@/components/profile/SessionManagementModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Edit, Key, LogOut, User, Shield, Camera, CheckCircle2,
  Activity, Lock, Smartphone, Eye, EyeOff, ChevronRight,
  Calendar, Mail, Phone, Globe, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserDisplayName } from '@/utils/userUtils';
import { useQuery } from '@tanstack/react-query';
import api, { ApiUser } from "@/lib/api";

type Tab = 'overview' | 'security' | 'plan';

const Profile = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isLoginActivityModalOpen, setIsLoginActivityModalOpen] = useState(false);
  const [isSessionManagementModalOpen, setIsSessionManagementModalOpen] = useState(false);

  const userDisplayName = getUserDisplayName(user);

  // user from AuthContext already contains user_metadata, email_confirmed_at,
  // and created_at — no network call needed.  Alias to userMetadata to keep
  // the rest of the component unchanged.
  const userMetadata: ApiUser | null = user ?? null;

  // Fetch session stats
  // Profile stats: completed sessions don't change frequently.
  // 5 min staleTime avoids re-fetching every time the user visits the page.
  const { data: stats } = useQuery({
    queryKey: ['profileStats', user?.id],
    queryFn: async () => {
      if (!user) return { sessions: 0, participants: 0, messages: 0 };
      const { data, error } = await api
        .from('conversations')
        .select('participants, total_messages')
        .eq('is_session_ended', true);
      if (error) return { sessions: 0, participants: 0, messages: 0 };
      return {
        sessions: data.length,
        participants: data.reduce((sum, c) => sum + (c.participants || 0), 0),
        messages: data.reduce((sum, c) => sum + (c.total_messages || 0), 0),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
  };

  const meta = userMetadata?.user_metadata || {};
  const joinDate = userMetadata?.created_at || user?.created_at;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
    { id: 'plan', label: 'Plan & Billing', icon: <Activity size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white pb-20">
      <PageHead title="Profile" description="Manage your AIfacilitator profile" />

      {/* ── Hero Banner ── */}
      <div className="relative h-52 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 overflow-hidden">
        {/* Decorative mesh */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ── Avatar + Name Row ── */}
        <div className="relative -mt-16 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div className="p-1 rounded-full bg-white shadow-xl">
                <Avatar className="h-28 w-28 ring-4 ring-white">
                  <AvatarImage
                    src={meta?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userDisplayName}`}
                    alt={userDisplayName}
                  />
                  <AvatarFallback className="text-3xl font-bold bg-indigo-100 text-indigo-700">
                    {getInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute inset-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                aria-label="Change photo"
              >
                <Camera size={22} className="text-white" />
              </button>
              {userMetadata?.email_confirmed_at && (
                <div className="absolute bottom-1 right-1 bg-emerald-500 rounded-full p-1 border-2 border-white shadow">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + email */}
            <div className="pb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{userDisplayName}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
              {joinDate && (
                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                  <Calendar size={11} />
                  Member since {new Date(joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pb-1">
            <Button onClick={() => setIsEditProfileModalOpen(true)} size="sm" variant="outline" className="gap-1.5 rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Edit size={14} />
              Edit Profile
            </Button>
            <Button onClick={handleLogout} size="sm" variant="outline" className="gap-1.5 rounded-full border-red-200 text-red-600 hover:bg-red-50">
              <LogOut size={14} />
              Log Out
            </Button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Sessions Hosted', value: stats?.sessions ?? '—' },
            { label: 'Total Participants', value: stats?.participants ?? '—' },
            { label: 'Messages Exchanged', value: stats?.messages ?? '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <User size={16} className="text-indigo-500" />
                  Personal Information
                </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <InfoField icon={<Mail size={14} />} label="Email" value={user?.email} />
                  {meta?.phone && <InfoField icon={<Phone size={14} />} label="Phone" value={meta.phone} />}
                  {meta?.timezone && <InfoField icon={<Globe size={14} />} label="Timezone" value={meta.timezone} />}
                  {meta?.language && <InfoField icon={<Globe size={14} />} label="Language" value={meta.language} />}
                  {meta?.display_name && <InfoField icon={<User size={14} />} label="Display Name" value={meta.display_name} />}
                  <InfoField
                    icon={<Calendar size={14} />}
                    label="Account Created"
                    value={joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  />
                </div>
                {meta?.bio && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
                      <FileText size={12} /> Bio
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">{meta.bio}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <Key size={16} className="text-indigo-500" />
                  Account Actions
                </h2>
                <div className="space-y-3">
                  <ActionRow
                    icon={<Key size={16} className="text-indigo-500" />}
                    title="Change Password"
                    description="Update your login credentials"
                    onClick={() => setIsChangePasswordModalOpen(true)}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              {/* Account status card */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium opacity-90">Account Active</span>
                </div>
                <p className="text-xs opacity-70">Your account is in good standing. All features are available.</p>
              </div>
              <PlanInfo />
            </div>
          </div>
        )}

        {/* ── Tab: Security ── */}
        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-4">
            <SecurityRow
              icon={<Lock size={18} className="text-indigo-500" />}
              title="Two-Factor Authentication"
              description="Add an extra layer of security with 2FA"
              badge="Recommended"
              badgeColor="indigo"
              onClick={() => setIsTwoFactorModalOpen(true)}
              action="Set Up"
            />
            <SecurityRow
              icon={<Activity size={18} className="text-indigo-500" />}
              title="Recent Login Activity"
              description="Review your recent sign-in history and locations"
              onClick={() => setIsLoginActivityModalOpen(true)}
              action="View Activity"
            />
            <SecurityRow
              icon={<Smartphone size={18} className="text-indigo-500" />}
              title="Session Management"
              description="View and revoke active sessions across all devices"
              onClick={() => setIsSessionManagementModalOpen(true)}
              action="Manage Sessions"
            />
          </div>
        )}

        {/* ── Tab: Plan & Billing ── */}
        {activeTab === 'plan' && (
          <div className="max-w-2xl">
            <PlanInfo />
          </div>
        )}
      </div>

      {/* Modals */}
      <AvatarUploadModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} userId={user?.id || ''} currentAvatarUrl={meta?.avatar_url} userName={userDisplayName} />
      <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} user={user} />
      <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} />
      <TwoFactorSetupModal isOpen={isTwoFactorModalOpen} onClose={() => setIsTwoFactorModalOpen(false)} />
      <LoginActivityModal isOpen={isLoginActivityModalOpen} onClose={() => setIsLoginActivityModalOpen(false)} />
      <SessionManagementModal isOpen={isSessionManagementModalOpen} onClose={() => setIsSessionManagementModalOpen(false)} />
    </div>
  );
};

/* ── Sub-components ── */

const InfoField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-gray-800 font-medium text-sm">{value}</p>
    </div>
  );
};

const ActionRow = ({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-left"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
  </button>
);

const SecurityRow = ({
  icon, title, description, badge, badgeColor, onClick, action
}: {
  icon: React.ReactNode; title: string; description: string;
  badge?: string; badgeColor?: string; onClick: () => void; action: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-start gap-4">
      <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">{icon}</div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${badgeColor}-100 text-${badgeColor}-700`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    <Button onClick={onClick} variant="outline" size="sm" className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-shrink-0">
      {action}
    </Button>
  </div>
);

export default Profile;
