import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { modalVariants } from "@/lib/animations";

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

const steps = [
    {
        title: "Welcome to AIfacilitator! 👋",
        description: "Your AI-powered facilitation platform for engaging workshops and sessions.",
        icon: "🎯",
    },
    {
        title: "Create Your First Session",
        description: "Choose from 12+ AI facilitators - from brainstorming to retrospectives.",
        icon: "✨",
    },
    {
        title: "Invite Participants",
        description: "Share your unique session link and collaborate in real-time.",
        icon: "👥",
    },
    {
        title: "AI Does the Heavy Lifting",
        description: "Our AI facilitator guides discussions, asks questions, and generates insights.",
        icon: "🤖",
    },
];

export const WelcomeModal = ({ isOpen, onClose, userName }: WelcomeModalProps) => {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleSkip}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card className="max-w-2xl w-full p-8 relative">
                                {/* Close button */}
                                <button
                                    onClick={handleSkip}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                {/* Content */}
                                <div className="space-y-6">
                                    {/* Step indicator */}
                                    <div className="flex gap-2 mb-8">
                                        {steps.map((_, index) => (
                                            <div
                                                key={index}
                                                className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep ? "bg-purple-600" : "bg-gray-200"
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Step content */}
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-center space-y-4"
                                        >
                                            <div className="text-6xl mb-4">{steps[currentStep].icon}</div>
                                            <h2 className="text-3xl font-bold text-gray-900">
                                                {steps[currentStep].title}
                                            </h2>
                                            <p className="text-lg text-gray-600 max-w-md mx-auto">
                                                {steps[currentStep].description}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>

                                    {/* Actions */}
                                    <div className="flex justify-between items-center pt-8">
                                        <Button
                                            variant="ghost"
                                            onClick={handleSkip}
                                            className="text-gray-500"
                                        >
                                            Skip tour
                                        </Button>

                                        <div className="flex gap-2">
                                            <span className="text-sm text-gray-500 self-center">
                                                {currentStep + 1} of {steps.length}
                                            </span>
                                            <Button onClick={handleNext} className="gap-2">
                                                {currentStep === steps.length - 1 ? (
                                                    <>
                                                        Get Started <Check className="h-4 w-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Next <ArrowRight className="h-4 w-4" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
