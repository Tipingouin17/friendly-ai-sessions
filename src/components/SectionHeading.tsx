/**
 * SectionHeading
 *
 * Shared component for all public-page section titles.
 * Enforces consistent typography and alignment across the app.
 *
 * Props:
 *   title       – main heading text (required)
 *   subtitle    – optional sub-copy rendered below the title
 *   align       – 'center' (default) | 'left' | 'right'
 *   className   – optional extra classes on the wrapper div
 *   titleClass  – optional extra classes on the h2 element
 */

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "center" | "left" | "right";
  className?: string;
  titleClass?: string;
}

const alignMap: Record<NonNullable<SectionHeadingProps["align"]>, string> = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
};

const SectionHeading = ({
  title,
  subtitle,
  align = "center",
  className,
  titleClass,
}: SectionHeadingProps) => {
  const alignClass = alignMap[align];

  return (
    <div className={cn(alignClass, "mb-12", className)}>
      <h2
        className={cn(
          "text-3xl md:text-4xl font-bold text-gray-900 mb-4",
          alignClass,
          titleClass
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("text-lg text-gray-500 max-w-2xl mx-auto", alignClass)}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
