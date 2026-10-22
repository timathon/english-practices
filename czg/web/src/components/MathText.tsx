import React, { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
  as?: "span" | "div" | "p";
  highlight?: string;
}

/**
 * MathText: Intelligently renders inline LaTeX ($...$) and block LaTeX ($$...$$),
 * while keeping regular Chinese and English text completely natural.
 * Also supports highlighting key terms (like subTopic) in text outside formulas.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = "", as = "span", highlight }) => {
  const content = useMemo(() => {
    if (!text) return null;

    // Helper to highlight terms inside plain text segments
    const renderPlainTextWithHighlight = (plainText: string, baseKey: string | number) => {
      if (!highlight || !highlight.trim() || !plainText.includes(highlight)) {
        return plainText;
      }
      const regexHighlight = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "g");
      const subParts = plainText.split(regexHighlight);
      return subParts.map((sub, sIdx) => {
        if (sub === highlight) {
          return (
            <mark key={`${baseKey}-hl-${sIdx}`} className="subtopic-highlight">
              {sub}
            </mark>
          );
        }
        return sub;
      });
    };

    // Split text by math formulas ($$...$$ or $...$)
    const parts: React.ReactNode[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Push preceding plain text
      if (match.index > lastIndex) {
        const plain = text.substring(lastIndex, match.index);
        parts.push(renderPlainTextWithHighlight(plain, `plain-${lastIndex}`));
      }

      const raw = match[0];
      const isDisplay = raw.startsWith("$$");
      const latex = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      try {
        const html = katex.renderToString(latex, {
          displayMode: isDisplay,
          throwOnError: false,
          output: "html"
        });
        parts.push(
          <span
            key={`math-${match.index}`}
            className="katex-rendered inline-block mx-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        parts.push(raw);
      }

      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      parts.push(renderPlainTextWithHighlight(remaining, `plain-${lastIndex}`));
    }

    return parts;
  }, [text, highlight]);

  const Component = as;
  return <Component className={`math-text ${className}`}>{content}</Component>;
};
