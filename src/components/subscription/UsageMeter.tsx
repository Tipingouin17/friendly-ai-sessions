/**
 * Usage Meter
 *
 * Subscription component for the AIfacilitator application.
 */
import { motion } from "framer-motion";
import { TrendingUp, Infinity as InfinityIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface UsageMeterProps {
    currentUsage: number;
    limit: number;
    planName: string;
    featureName: string;
}

export const UsageMeter = ({ currentUsage, limit, planName, featureName }: UsageMeterProps) => {
    const isUnlimited = limit === Infinity || limit >= 999999;

    // For unlimited plans, show a simple "unlimited" display
    if (isUnlimited) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center gap-3">
                        <InfinityIcon className="h-5 w-5 text-green-600" />
                        <div>
                            <span className="font-semibold text-gray-900">{featureName} Usage</span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded ml-2">
                                {planName}
                            </span>
                        </div>
                        <span className="ml-auto text-sm font-medium text-green-700">
                            {currentUsage} used — Unlimited
                        </span>
                    </div>
                </Card>
            </motion.div>
        );
    }

    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
    const remaining = Math.max(0, limit - currentUsage);
    const hasReachedLimit = remaining === 0;

    // Determine color based on usage
    const getColor = () => {
        if (percentage >= 100) return "text-red-600";
        if (percentage >= 70) return "text-indigo-600";
        return "text-green-600";
    };

    const getProgressColor = () => {
        if (percentage >= 100) return "bg-red-600";
        if (percentage >= 70) return "bg-indigo-500";
        return "bg-green-600";
    };

    // Only show the inline upgrade nudge when approaching (≥80%) but NOT yet at the limit.
    // When the limit IS reached, PlanLimitAlert (rendered separately) already shows the full message.
    const shouldShowUpgradeNudge = percentage >= 80 && !hasReachedLimit;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`h-5 w-5 ${getColor()}`} />
                            <h3 className="font-semibold text-gray-900">
                                {featureName} Usage
                            </h3>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
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

                            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                />
                            </div>
                        </div>

                        {shouldShowUpgradeNudge && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex items-start gap-2 pt-2 border-t border-gray-200"
                            >
                                <p className="text-sm text-gray-700">
                                    You're running low on {featureName.toLowerCase()}. Upgrade to continue without interruption.
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {shouldShowUpgradeNudge && (
                        <a href="/pricing">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors shadow-sm shadow-indigo-500/20">
                                Upgrade Plan
                            </button>
                        </a>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};
