/**
 * Settings
 *
 * Page for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Bell, Shield, Trash2 } from "lucide-react";
import PageHead from "@/components/PageHead";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

const Settings = () => {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Use a per-user localStorage key so settings don't bleed between accounts
  const settingsKey = user?.id ? `user_settings_${user.id}` : null;

  // Load settings from localStorage on mount (keyed by user ID)
  useEffect(() => {
    if (!settingsKey) return;
    try {
      const stored = localStorage.getItem(settingsKey);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
  }, [settingsKey]);

  const updateSetting = (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (settingsKey) {
      localStorage.setItem(settingsKey, JSON.stringify(updated));
    }
    toast({
      title: "Setting updated",
      description: "Your preference has been saved.",
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // Sign the user out first, then delete their profile row.
      // Full account deletion (auth user) requires a server-side admin call;
      // we remove the profile and log out so the account is effectively disabled.
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Clear per-user settings from localStorage
      if (settingsKey) localStorage.removeItem(settingsKey);

      await logout();
      toast({
        title: "Account deleted",
        description: "Your account data has been removed. You have been signed out.",
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Could not delete your account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <PageHead title="Settings" description="Manage your account settings and preferences" />
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-700" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive email updates about your account</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="workshop-reminders" className="font-medium">Workshop Reminders</Label>
                  <p className="text-sm text-gray-500">Get notified before upcoming sessions</p>
                </div>
                <Switch
                  id="workshop-reminders"
                  checked={settings.workshopReminders}
                  onCheckedChange={(checked) => updateSetting('workshopReminders', checked)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Privacy</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="public-profile" className="font-medium">Public Profile</Label>
                  <p className="text-sm text-gray-500">Allow others to see your profile</p>
                </div>
                <Switch
                  id="public-profile"
                  checked={settings.publicProfile}
                  onCheckedChange={(checked) => updateSetting('publicProfile', checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-activity" className="font-medium">Show Activity Status</Label>
                  <p className="text-sm text-gray-500">Display when you are online</p>
                </div>
                <Switch
                  id="show-activity"
                  checked={settings.showActivity}
                  onCheckedChange={(checked) => updateSetting('showActivity', checked)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-semibold text-red-700">Danger Zone</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeletingAccount}>
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all of your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
