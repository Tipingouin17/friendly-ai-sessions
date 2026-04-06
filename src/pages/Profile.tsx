/**
 * Profile
 *
 * Page for the AIfacilitator application.
 */
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHead } from '@/components/PageHead';
import { PlanInfo } from '@/components/subscription/PlanInfo';
import { AvatarUploadModal } from '@/components/profile/AvatarUploadModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { TwoFactorSetupModal } from '@/components/profile/TwoFactorSetupModal';
import { LoginActivityModal } from '@/components/profile/LoginActivityModal';
import { SessionManagementModal } from '@/components/profile/SessionManagementModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit, Key, LogOut, User, Shield, Calendar, Camera, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserDisplayName } from '@/utils/userUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isLoginActivityModalOpen, setIsLoginActivityModalOpen] = useState(false);
  const [isSessionManagementModalOpen, setIsSessionManagementModalOpen] = useState(false);

  const userDisplayName = getUserDisplayName(user);

  // Fetch user metadata including avatar_url
  const { data: userMetadata } = useQuery({
    queryKey: ['userMetadata', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    enabled: !!user,
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleChangePassword = () => {
    setIsChangePasswordModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
  };

  return (
    <div className="min-h-screen pb-16 bg-gradient-to-b from-primary/10 to-white">
      <PageHead title="Profile" description="Manage your AIfacilitator profile" />
      <div className="container mx-auto px-4 max-w-6xl pt-24">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* User Profile Summary Card */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 h-32 relative"></div>
              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-12 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 border-4 border-white bg-white shadow-md">
                        <AvatarImage
                          src={userMetadata?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userDisplayName}`}
                          alt={userDisplayName}
                        />
                        <AvatarFallback className="text-2xl">{getInitials(userDisplayName)}</AvatarFallback>
                      </Avatar>

                      {/* Camera Button Overlay */}
                      <button
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                        aria-label="Upload profile picture"
                      >
                        <Camera size={24} className="text-white" />
                      </button>

                      {userMetadata?.email_confirmed_at && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-white shadow-lg">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <h2 className="text-2xl font-bold">{userDisplayName}</h2>
                      <p className="text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <Button onClick={handleEditProfile} variant="outline" size="sm" className="gap-2">
                      <Edit size={16} />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Account Information */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-6">
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-indigo-400" />
                  <CardTitle className="text-2xl">Account Information</CardTitle>
                </div>
                <CardDescription className="text-base mt-1 text-left">Your personal information and account details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Email Address</h3>
                    <p className="text-xl font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Account Created</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <p className="text-lg">
                        {userMetadata?.created_at 
                          ? new Date(userMetadata.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : user?.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'Not available'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Account Status</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <p className="text-lg font-medium">Active</p>
                    </div>
                  </div>

                  {userMetadata?.user_metadata?.phone && (
                    <div>
                      <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Phone</h3>
                      <p className="text-xl font-medium">{userMetadata.user_metadata.phone}</p>
                    </div>
                  )}

                  {userMetadata?.user_metadata?.timezone && (
                    <div>
                      <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Timezone</h3>
                      <p className="text-xl font-medium">{userMetadata.user_metadata.timezone}</p>
                    </div>
                  )}

                  {userMetadata?.user_metadata?.bio && (
                    <div className="md:col-span-2">
                      <h3 className="text-lg text-gray-500 font-medium mb-2 text-left">Bio</h3>
                      <p className="text-lg text-gray-700">{userMetadata.user_metadata.bio}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="py-6 flex flex-wrap gap-4 justify-start">
                <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" onClick={handleChangePassword}>
                  <Key size={18} />
                  Change Password
                </Button>
                <Button variant="outline" size="lg" className="gap-2 rounded-full px-6 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100" onClick={handleLogout}>
                  <LogOut size={18} />
                  Log Out
                </Button>
              </CardFooter>
            </Card>

            {/* Security Settings */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-indigo-400" />
                  <CardTitle className="text-2xl">Security Settings</CardTitle>
                </div>
                <CardDescription className="text-base mt-1 text-left">Manage your account security preferences</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-8">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div>
                        <h3 className="text-xl font-semibold mb-1 text-left">Two-Factor Authentication</h3>
                        <p className="text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full px-6 w-full sm:w-auto flex-shrink-0"
                        onClick={() => setIsTwoFactorModalOpen(true)}
                      >
                        Set Up
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div>
                        <h3 className="text-xl font-semibold mb-1 text-left">Recent Login Activity</h3>
                        <p className="text-gray-500">View your recent login history</p>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full px-6 w-full sm:w-auto flex-shrink-0"
                        onClick={() => setIsLoginActivityModalOpen(true)}
                      >
                        View Activity
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div>
                        <h3 className="text-xl font-semibold mb-1 text-left">Session Management</h3>
                        <p className="text-gray-500">Manage active sessions across all your devices</p>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full px-6 w-full sm:w-auto flex-shrink-0"
                        onClick={() => setIsSessionManagementModalOpen(true)}
                      >
                        Manage Sessions
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="space-y-6">
              <PlanInfo />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    If you have any questions or need assistance with your account, our support team is here to help.
                  </p>
                  <Button variant="outline" className="w-full">Contact Support</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>


      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        userId={user?.id || ''}
        currentAvatarUrl={userMetadata?.user_metadata?.avatar_url}
        userName={userDisplayName}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        user={userMetadata || user}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      <TwoFactorSetupModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
      />

      <LoginActivityModal
        isOpen={isLoginActivityModalOpen}
        onClose={() => setIsLoginActivityModalOpen(false)}
      />

      <SessionManagementModal
        isOpen={isSessionManagementModalOpen}
        onClose={() => setIsSessionManagementModalOpen(false)}
      />
    </div >
  );
};

export default Profile;
