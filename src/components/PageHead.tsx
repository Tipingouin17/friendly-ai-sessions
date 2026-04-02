
import { useEffect } from 'react';

interface PageHeadProps {
  title?: string;
  description?: string;
}

/**
 * Sets the document title and meta description for SEO.
 * Usage: <PageHead title="Pricing" description="View our plans" />
 */
export const PageHead = ({ title, description }: PageHeadProps) => {
  useEffect(() => {
    const baseTitle = 'AIfacilitator';
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = baseTitle;
    };
  }, [title, description]);

  return null;
};

export default PageHead;
