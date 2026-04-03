/**
 * use Onboarding
 *
 * Hook for the AIfacilitator application.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
    hasSeenWelcome: boolean;
    hasCompletedTour: boolean;
    hasCreatedFirstSession: boolean;
    setHasSeenWelcome: (value: boolean) => void;
    setHasCompletedTour: (value: boolean) => void;
    setHasCreatedFirstSession: (value: boolean) => void;
    resetOnboarding: () => void;
}

export const useOnboarding = create<OnboardingState>()(
    persist(
        (set) => ({
            hasSeenWelcome: false,
            hasCompletedTour: false,
            hasCreatedFirstSession: false,
            setHasSeenWelcome: (value) => set({ hasSeenWelcome: value }),
            setHasCompletedTour: (value) => set({ hasCompletedTour: value }),
            setHasCreatedFirstSession: (value) => set({ hasCreatedFirstSession: value }),
            resetOnboarding: () =>
                set({
                    hasSeenWelcome: false,
                    hasCompletedTour: false,
                    hasCreatedFirstSession: false,
                }),
        }),
        {
            name: 'onboarding-storage',
        }
    )
);
