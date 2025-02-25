
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch id="email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="workshop-reminders">Workshop Reminders</Label>
                <Switch id="workshop-reminders" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Privacy</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="public-profile">Public Profile</Label>
                <Switch id="public-profile" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-activity">Show Activity Status</Label>
                <Switch id="show-activity" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
