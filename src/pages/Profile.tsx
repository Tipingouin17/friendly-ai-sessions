
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = () => {
    // In a real app, this would update the user profile
    setIsEditing(false);
  };

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
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                {isEditing ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                ) : (
                  <p className="text-gray-700">{user?.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                {isEditing ? (
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                ) : (
                  <p className="text-gray-700">{user?.email}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
