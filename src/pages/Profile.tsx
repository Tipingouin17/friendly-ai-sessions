
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { name: name }
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="p-6">
            <p className="text-center text-gray-500">Please log in to view your profile.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">My Profile</h1>
        
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Personal Information</h2>
              <Button 
                variant="outline"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                {isEditing ? (
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                ) : (
                  <p className="text-gray-700">{user.name || "Not set"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                {isEditing ? (
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="text-gray-700">{user.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Member Since</label>
                <p className="text-gray-700">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
