
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlanInfo } from '@/components/subscription/PlanInfo';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pt-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1 text-lg">{user?.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Created</label>
                  <div className="mt-1">
                    {/* User type doesn't have created_at, so we'll just show 'N/A' */}
                    N/A
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <PlanInfo />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
