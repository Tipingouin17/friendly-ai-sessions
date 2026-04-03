/**
 * animated button
 *
 * UI primitive for the AIfacilitator application.
 */
import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { VariantProps } from "class-variance-authority";

interface AnimatedButtonProps
    extends HTMLMotionProps<"button">,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                {...props}
            />
        );
    }
);
AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };
