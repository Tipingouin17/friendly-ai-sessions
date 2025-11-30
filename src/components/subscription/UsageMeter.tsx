import { motion } from "framer-motion";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface UsageMeterProps {
    currentUsage: number;
    limit: number;
    planName: string;
    featureName: string;
}

export const UsageMeter = ({ currentUsage, limit, planName, featureName }: UsageMeterProps) => {
    const navigate = useNavigate();
    const percentage = (currentUsage / limit) * 100;
    const remaining = limit - currentUsage;

    // Determine color based on usage
    const getColor = () => {
        if (percentage >= 90) return "text-red-600";
        if (percentage >= 70) return "text-yellow-600";
        return "text-green-600";
    };

    const getProgressColor = () => {
        if (percentage >= 90) return "bg-red-600";
        if (percentage >= 70) return "bg-yellow-600";
        return "bg-green-600";
    };

    const shouldShowUpgrade = percentage >= 80;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`h-5 w-5 ${getColor()}`} />
                            <h3 className="font-semibold text-gray-900">
                                {featureName} Usage
                            </h3>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                {planName}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {currentUsage} of {limit} used
                                </span>
                                <span className={`font-semibold ${getColor()}`}>
                                    {remaining} remaining
                                </span>
                            </div>

                            <div className="relative">
                                <Progress value={percentage} className="h-2" />
                                <div
                                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>

                        {shouldShowUpgrade && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex items-start gap-2 pt-2 border-t border-purple-200"
                            >
                                <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700">
                                    You're running low on {featureName.toLowerCase()}. Upgrade to continue without interruption.
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {shouldShowUpgrade && (
                        <Button
                            onClick={() => navigate("/pricing")}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 whitespace-nowrap"
                        >
                            Upgrade Plan
                        </Button>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};
