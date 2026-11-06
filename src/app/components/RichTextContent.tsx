import { useMemo } from 'react';
import { getRenderableNewsBody } from '../utils/richText';

interface RichTextContentProps {
  content?: string | null;
  className?: string;
}

export function RichTextContent({ content, className = '' }: RichTextContentProps) {
  const sanitizedHtml = useMemo(() => getRenderableNewsBody(content), [content]);

  if (!sanitizedHtml) return null;

  return (
    <div
      className={`richtext-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

