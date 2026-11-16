import React, { useMemo, useState } from 'react';
import { getRenderableNewsBody } from '../utils/richText';
import { LightboxModal } from './LightboxModal';

interface RichTextContentProps {
  content?: string | null;
  className?: string;
}

export function RichTextContent({ content, className = '' }: RichTextContentProps) {
  const sanitizedHtml = useMemo(() => getRenderableNewsBody(content), [content]);
  const [modalImage, setModalImage] = useState<string | null>(null);

  if (!sanitizedHtml) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        setModalImage(src);
      }
    }
  };

  return (
    <>
      <div
        className={`richtext-content ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        onClick={handleClick}
      />
      {modalImage && (
        <LightboxModal
          images={[modalImage]}
          initialIndex={0}
          onClose={() => setModalImage(null)}
        />
      )}
    </>
  );
}
