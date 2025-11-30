/**
 * Reusable animation variants and presets for consistent animations across the app
 */

// Respect user's motion preferences
export const shouldReduceMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Page transition variants
export const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1] as const, // cubic-bezier for easeOut
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 1, 1] as const, // cubic-bezier for easeIn
        },
    },
};

// Fade in animation
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

// Slide up animation
export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
    },
};

// Scale animation
export const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const }
    },
};

// Stagger children animation
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3 }
    },
};

// Button hover/tap animations
export const buttonVariants = {
    hover: {
        scale: 1.02,
        transition: { duration: 0.2 }
    },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1 }
    },
};

// Card hover animation
export const cardHover = {
    rest: {
        scale: 1,
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
    hover: {
        scale: 1.02,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1] as const,
        },
    },
};

// List item animation
export const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
        },
    }),
};

// Modal/Dialog animation
export const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1] as const,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            duration: 0.15,
            ease: [0.4, 0, 1, 1] as const,
        },
    },
};

// Spring animation config
export const springConfig = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
};

// Smooth spring config
export const smoothSpring = {
    type: 'spring' as const,
    stiffness: 100,
    damping: 20,
};
