/**
 * Settings — World-class redesign
 * Sidebar navigation, grouped settings with visual hierarchy, danger zone.
 * Settings are now persisted to the database via PUT /auth/v1/user.
 */
import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import {
  Bell, Shield, Trash2, ChevronRight, Check,
  Mail, Smartphone, Eye, AlertTriangle, Loader2
} from "lucide-react";
import PageHead from "@/components/PageHead";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserSettings {
  emailNotifications: boolean;
  workshopReminders: boolean;
  publicProfile: boolean;
  showActivity: boolean;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  workshopReminders: true,
  publicProfile: false,
  showActivity: true,
};

type Section = 'notifications' | 'privacy' | 'danger';

const navItems: { id: Section; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
  { id: 'danger', label: 'Danger Zone', icon: <Trash2 size={16} />, danger: true },
];

const Settings = () => {
  const { toast } = useToast();
  const { user, logout, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('notifications');
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from user_metadata (populated from DB by the backend)
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const loaded: UserSettings = {
      emailNotifications: meta.setting_email_notifications ?? defaultSettings.emailNotifications,
      workshopReminders: meta.setting_workshop_reminders ?? defaultSettings.workshopReminders,
      publicProfile: meta.setting_public_profile ?? defaultSettings.publicProfile,
      showActivity: meta.setting_show_activity ?? defaultSettings.showActivity,
    };
    // Also try localStorage as fallback for users who haven't logged in since the update
    const settingsKey = user?.id ? `user_settings_${user.id}` : null;
    if (settingsKey && meta.setting_email_notifications === undefined) {
      try {
        const stored = localStorage.getItem(settingsKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(loaded, {
            emailNotifications: parsed.emailNotifications ?? loaded.emailNotifications,
            workshopReminders: parsed.workshopReminders ?? loaded.workshopReminders,
            publicProfile: parsed.publicProfile ?? loaded.publicProfile,
            showActivity: parsed.showActivity ?? loaded.showActivity,
          });
        }
      } catch { /* use defaults */ }
    }
    setSettings(loaded);
    setIsLoading(false);
  }, [user]);

  const persistSettings = useCallback(async (updated: UserSettings) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await api.auth.updateUser({
        data: {
          setting_email_notifications: updated.emailNotifications,
          setting_workshop_reminders: updated.workshopReminders,
          setting_public_profile: updated.publicProfile,
          setting_show_activity: updated.showActivity,
        },
      });
      if (error) throw error;
      // Also update localStorage as cache
      const settingsKey = `user_settings_${user.id}`;
      localStorage.setItem(settingsKey, JSON.stringify(updated));
      // Refresh user context so user_metadata is up to date
      if (refreshUser) await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Error saving settings', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, toast, refreshUser]);

  const updateSetting = (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1500);
    toast({ title: 'Saved', description: 'Your preference has been updated.' });
    persistSettings(updated);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // RGPD Article 17 — Right to Erasure.
      // DELETE /auth/v1/user atomically removes ALL user data from every table
      // in a single DB transaction: messages, sessions, facilitators, conversations,
      // referrals, tokens, audit logs, and the profile itself.
      const { error } = await api.auth.deleteUser();
      if (error) throw new Error(error.message);

      // Clear all local state (settings cache, join tokens, participant data)
      const settingsKey = user?.id ? `user_settings_${user.id}` : null;
      if (settingsKey) localStorage.removeItem(settingsKey);
      // api.auth.deleteUser() already called clearSession() + notifyAuth(SIGNED_OUT)
      // but we also call logout() to ensure the AuthContext state is reset.
      await logout();

      toast({
        title: 'Account deleted',
        description: 'Your personal data has been erased and session history anonymised (GDPR Article 17 §3).',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Deletion failed',
        description: msg || 'Could not delete your account. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white pb-20">
      <PageHead title="Settings" description="Manage your account settings and preferences" />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
            {isSaving && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage your preferences and account options — saved automatically</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col sm:flex-row gap-6">

          {/* ── Sidebar ── */}
          <nav className="sm:w-52 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {navItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all text-left
                    ${idx < navItems.length - 1 ? 'border-b border-gray-50' : ''}
                    ${activeSection === item.id
                      ? item.danger
                        ? 'bg-red-50 text-red-600'
                        : 'bg-indigo-50 text-indigo-700'
                      : item.danger
                        ? 'text-red-500 hover:bg-red-50/50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className={activeSection === item.id ? (item.danger ? 'text-red-500' : 'text-indigo-500') : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {activeSection === item.id && (
                    <ChevronRight size={14} className="ml-auto opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <SettingsCard
                icon={<Bell size={18} className="text-indigo-500" />}
                title="Notifications"
                description="Control how and when AIfacilitator communicates with you"
                isLoading={isLoading}
              >
                <ToggleRow
                  id="email-notifications"
                  icon={<Mail size={15} className="text-indigo-400" />}
                  title="Email Notifications"
                  description="Receive email updates about your account activity, new features, and important alerts"
                  checked={settings.emailNotifications}
                  onChange={v => updateSetting('emailNotifications', v)}
                  saved={savedKey === 'emailNotifications'}
                />
                <Divider />
                <ToggleRow
                  id="workshop-reminders"
                  icon={<Bell size={15} className="text-indigo-400" />}
                  title="Workshop Reminders"
                  description="Get notified before upcoming sessions so you never miss a scheduled workshop"
                  checked={settings.workshopReminders}
                  onChange={v => updateSetting('workshopReminders', v)}
                  saved={savedKey === 'workshopReminders'}
                />
              </SettingsCard>
            )}

            {/* Privacy */}
            {activeSection === 'privacy' && (
              <SettingsCard
                icon={<Shield size={18} className="text-indigo-500" />}
                title="Privacy"
                description="Manage who can see your information and how your data is used"
                isLoading={isLoading}
              >
                <ToggleRow
                  id="public-profile"
                  icon={<Eye size={15} className="text-indigo-400" />}
                  title="Public Profile"
                  description="Allow other facilitators and participants to view your profile information"
                  checked={settings.publicProfile}
                  onChange={v => updateSetting('publicProfile', v)}
                  saved={savedKey === 'publicProfile'}
                />
                <Divider />
                <ToggleRow
                  id="show-activity"
                  icon={<Smartphone size={15} className="text-indigo-400" />}
                  title="Show Activity Status"
                  description="Display your online status to other users when you are active on the platform"
                  checked={settings.showActivity}
                  onChange={v => updateSetting('showActivity', v)}
                  saved={savedKey === 'showActivity'}
                />
              </SettingsCard>
            )}

            {/* Danger Zone */}
            {activeSection === 'danger' && (
              <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-red-100 bg-red-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-xl">
                      <AlertTriangle size={18} className="text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-red-800">Danger Zone</h2>
                      <p className="text-xs text-red-500 mt-0.5">Irreversible and destructive actions</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-5">
                  {/* RGPD notice */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Your right to erasure — GDPR Article 17 §3</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        You have the right to request the erasure of all your personal data. Your account identity
                        and all personally-identifiable information (PII) will be permanently deleted. Session history
                        shared with other participants will be anonymised (attributed to "Deleted User") rather than
                        deleted, as permitted under GDPR Article 17 §3(c) — data necessary for other persons.
                      </p>
                    </div>
                  </div>
                  {/* What gets erased vs anonymised */}
                  <div className="px-1 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1.5">Permanently deleted (your PII):</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[
                          'Profile & account credentials',
                          'Email address & password',
                          'Login history & activity logs',
                          'Authentication tokens',
                          'Notification preferences',
                          'Referral records',
                        ].map(item => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">Anonymised (attributed to "Deleted User"):</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[
                          'Session & conversation history',
                          'AI facilitator configurations',
                          'Messages & transcripts',
                          'Session reports',
                        ].map(item => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {/* Delete button row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-red-100 bg-red-50/30">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Delete Account</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Permanently erase your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeletingAccount} className="flex-shrink-0 rounded-full">
                          {isDeletingAccount ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
                          {isDeletingAccount ? 'Deleting…' : 'Delete Account'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                  <p>This will immediately and permanently erase all your <strong>personal data</strong> (profile, credentials, login history) from our servers, in compliance with <strong>GDPR Article 17 §3</strong> (Right to Erasure).</p>
                              <p>Session history shared with other participants will be <strong>anonymised</strong> (attributed to "Deleted User") rather than deleted, as permitted under GDPR Article 17 §3(c).</p>
                              <p className="text-red-600 font-medium">This action cannot be undone. There is no recovery.</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel — keep my account</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                          >
                            {isDeletingAccount ? 'Deleting…' : 'Yes, permanently delete everything'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const SettingsCard = ({ icon, title, description, children, isLoading }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode; isLoading?: boolean;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-gray-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-xl">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
    <div className="px-6 py-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading your preferences…</span>
        </div>
      ) : children}
    </div>
  </div>
);

const ToggleRow = ({ id, icon, title, description, checked, onChange, saved }: {
  id: string; icon: React.ReactNode; title: string; description: string;
  checked: boolean; onChange: (v: boolean) => void; saved: boolean;
}) => (
  <div className="flex items-center justify-between gap-6 py-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <Label htmlFor={id} className="text-sm font-semibold text-gray-800 cursor-pointer">{title}</Label>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {saved && <Check size={14} className="text-emerald-500" />}
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  </div>
);

const Divider = () => <div className="border-t border-gray-50" />;

export default Settings;
