
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlanInfo } from '@/components/subscription/PlanInfo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit, Key, LogOut, User, Shield, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  const handleEditProfile = () => {
    toast({
      title: "Edit Profile",
      description: "This feature will be available soon.",
    });
  };
  
  const handleChangePassword = () => {
    toast({
      title: "Change Password",
      description: "This feature will be available soon.",
    });
  };
  
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* User Profile Summary Card */}
            <Card className="overflow-hidden">
              <div className="bg-primary/10 h-32 relative"></div>
              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-12 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <Avatar className="h-24 w-24 border-4 border-white bg-white shadow-md">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`} alt={user?.name || "User"} />
                      <AvatarFallback className="text-2xl">{user?.name ? getInitials(user.name) : user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="mt-4 sm:mt-0">
                      <h2 className="text-2xl font-bold">{user?.name || "User"}</h2>
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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Account Information</CardTitle>
                </div>
                <CardDescription>Your personal information and account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
                    <p className="text-lg">{user?.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">User ID</h3>
                    <p className="text-sm bg-gray-100 p-2 rounded font-mono break-all">{user?.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Account Created</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p>Not available</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Account Status</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
                      <p>Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="pt-6 flex flex-wrap gap-4">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleChangePassword}>
                  <Key size={16} />
                  Change Password
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut size={16} />
                  Log Out
                </Button>
              </CardFooter>
            </Card>
            
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Security Settings</CardTitle>
                </div>
                <CardDescription>Manage your account security preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" size="sm">Set Up</Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <h3 className="font-medium">Recent Login Activity</h3>
                      <p className="text-sm text-gray-500">View your recent login history</p>
                    </div>
                    <Button variant="outline" size="sm">View Activity</Button>
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
    </div>
  );
};

export default Profile;
