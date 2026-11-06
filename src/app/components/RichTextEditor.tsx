import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Quote,
  Undo,
  Redo,
  RemoveFormatting,
} from 'lucide-react';
import { isHtmlContent, formatLegacyTextToHtml } from '../utils/richText';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write the story here... format headings, paragraphs, and lists freely.',
  minHeight = '240px',
  className = '',
  disabled = false,
}: RichTextEditorProps) {
  // Normalize initial content (converting legacy plain text to HTML if necessary)
  const initialHtml = isHtmlContent(content) ? content : formatLegacyTextToHtml(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#f5c518] underline hover:text-[#ffd644]',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: initialHtml,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose-editor focus:outline-none px-4 py-3 text-white/90 leading-relaxed min-h-[${minHeight}]`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor has empty paragraph '<p></p>', treat as empty string for validation
      if (editor.isEmpty) {
        onChange('');
      } else {
        onChange(html);
      }
    },
  });

  // Sync external content changes (e.g. when editing a different article or resetting)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const targetHtml = isHtmlContent(content) ? content : formatLegacyTextToHtml(content);
    if (content === '' && !editor.isEmpty) {
      editor.commands.clearContent();
    } else if (targetHtml && targetHtml !== currentHtml) {
      editor.commands.setContent(targetHtml);
    }
  }, [content, editor]);

  // Set link handler
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL (e.g. https://example.com):', previousUrl || 'https://');
    if (url === null) return; // cancelled
    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  // Word count & character count
  const text = editor ? editor.getText().trim() : '';
  const wordsCount = text.length > 0 ? text.split(/\s+/).length : 0;
  const charsCount = text.length;

  if (!editor) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-[#0c1424] text-xs text-white/40">
        Loading editor...
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0c1424] transition-colors focus-within:border-[#f5c518]/50 ${className}`}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#10192b]/80 p-2 text-white/70">
        {/* Paragraph / Headings */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Normal Paragraph"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('paragraph') && !editor.isActive('heading')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Pilcrow className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Heading 1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Heading 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Heading 3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Inline Formatting: Bold, Italic, Underline */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('bold')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('italic')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Underline (Ctrl+U)"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('underline')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Lists & Blockquote */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Bullet List"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Text Alignment */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Align Left"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive({ textAlign: 'left' })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Align Center"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive({ textAlign: 'center' })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Align Right"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive({ textAlign: 'right' })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Justify"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive({ textAlign: 'justify' })
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Links */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Insert Link"
            onClick={setLink}
            className={`rounded-md p-1.5 transition-colors ${
              editor.isActive('link')
                ? 'bg-[#f5c518] text-[#102018] font-bold'
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              title="Remove Link"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="rounded-md p-1.5 hover:bg-white/10 hover:text-white"
            >
              <Unlink className="h-4 w-4 text-red-400" />
            </button>
          )}
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        {/* Clear Formatting, Undo, Redo */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            type="button"
            title="Clear Formatting"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="rounded-md p-1.5 hover:bg-white/10 hover:text-white"
          >
            <RemoveFormatting className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
            className="rounded-md p-1.5 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
            className="rounded-md p-1.5 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* EDITING AREA */}
      <div className="richtext-content relative min-h-[220px] bg-[#070d18]/50">
        <EditorContent editor={editor} />
      </div>

      {/* FOOTER: WORD & CHARACTER COUNT */}
      <div className="flex items-center justify-between border-t border-white/5 bg-[#10192b]/60 px-4 py-2 text-[11px] font-medium text-white/40">
        <span>Rich Text Editor</span>
        <div className="flex items-center gap-3">
          <span>{wordsCount} {wordsCount === 1 ? 'word' : 'words'}</span>
          <span>·</span>
          <span>{charsCount} {charsCount === 1 ? 'character' : 'characters'}</span>
        </div>
      </div>
    </div>
  );
}

