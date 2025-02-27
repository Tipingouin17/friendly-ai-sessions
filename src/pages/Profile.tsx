
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
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-6">
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-amber-400" />
                  <CardTitle className="text-2xl">Account Information</CardTitle>
                </div>
                <CardDescription className="text-base mt-1">Your personal information and account details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2">Email Address</h3>
                    <p className="text-xl font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2">User ID</h3>
                    <p className="text-sm bg-gray-100 p-3 rounded font-mono break-all">{user?.id}</p>
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2">Account Created</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <p className="text-lg">Not available</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-500 font-medium mb-2">Account Status</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <p className="text-lg font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="py-6 flex flex-wrap gap-4 justify-start">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 rounded-full px-6" 
                  onClick={handleChangePassword}
                >
                  <Key size={18} />
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 rounded-full px-6 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100" 
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  Log Out
                </Button>
              </CardFooter>
            </Card>
            
            {/* Security Settings */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-amber-400" />
                  <CardTitle className="text-2xl">Security Settings</CardTitle>
                </div>
                <CardDescription className="text-base mt-1">Manage your account security preferences</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Two-Factor Authentication</h3>
                        <p className="text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="outline" size="lg" className="rounded-full px-6">Set Up</Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Recent Login Activity</h3>
                        <p className="text-gray-500">View your recent login history</p>
                      </div>
                      <Button variant="outline" size="lg" className="rounded-full px-6">View Activity</Button>
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
    </div>
  );
};

export default Profile;
