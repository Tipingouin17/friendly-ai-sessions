import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type UpgradePromptVariant = 'modal' | 'card' | 'banner';

interface UpgradePromptProps {
    variant?: UpgradePromptVariant;
    isOpen?: boolean;
    onClose?: () => void;
    featureName?: string;
    title?: string;
    description?: string;
    benefits?: string[];
    className?: string;
}

const defaultBenefits = [
    "Unlimited AI Sessions",
    "Advanced Analytics & Reports",
    "Custom Facilitator Personas",
    "Priority Support"
];

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
    variant = 'card',
    isOpen = false,
    onClose,
    featureName,
    title,
    description,
    benefits = defaultBenefits,
    className = ''
}) => {
    const navigate = useNavigate();

    const handleUpgrade = () => {
        navigate('/pricing');
        if (onClose) onClose();
    };

    const getTitle = () => {
        if (title) return title;
        if (featureName) return `Unlock ${featureName}`;
        return "Upgrade to Premium";
    };

    const getDescription = () => {
        if (description) return description;
        if (featureName) return `Get access to ${featureName} and other exclusive features with our Premium plan.`;
        return "Take your facilitation to the next level with our Premium features.";
    };

    if (variant === 'modal') {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto bg-gradient-to-br from-yellow-100 to-orange-100 p-3 rounded-full w-fit mb-2">
                            <Crown className="h-6 w-6 text-orange-500" />
                        </div>
                        <DialogTitle className="text-center text-xl">{getTitle()}</DialogTitle>
                        <DialogDescription className="text-center">
                            {getDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{benefit}</span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        <Button
                            onClick={handleUpgrade}
                            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Upgrade Now
                        </Button>
                        {onClose && (
                            <Button variant="ghost" onClick={onClose} className="w-full">
                                Maybe Later
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    if (variant === 'banner') {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Zap className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-indigo-900">{getTitle()}</h4>
                        <p className="text-sm text-indigo-700">{getDescription()}</p>
                    </div>
                </div>
                <Button
                    onClick={handleUpgrade}
                    size="sm"
                    className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
                >
                    Upgrade Plan
                </Button>
            </motion.div>
        );
    }

    // Default Card Variant
    return (
        <Card className={`border-2 border-orange-100 overflow-hidden ${className}`}>
            <div className="h-2 bg-gradient-to-r from-orange-400 to-pink-500" />
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-orange-500" />
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Premium</span>
                </div>
                <CardTitle>{getTitle()}</CardTitle>
                <CardDescription>{getDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {benefits.slice(0, 3).map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{benefit}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleUpgrade}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade to Unlock
                </Button>
            </CardFooter>
        </Card>
    );
};
