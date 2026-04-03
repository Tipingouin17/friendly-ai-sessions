/**
 * System Settings
 *
 * Admin component for the AIfacilitator application.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const SystemSettings = () => {
    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Settings className="h-6 w-6 text-purple-600" />
                        <CardTitle className="text-2xl">System Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Configure platform-wide settings and configurations
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Alert>
                        <AlertDescription>
                            System settings configuration coming soon. This will include email templates,
                            platform branding, API configurations, and more.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
};
