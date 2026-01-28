
import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  latex?: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * A dedicated component for rendering LaTeX math using KaTeX.
 * Handles both inline and block math.
 */
const MathRenderer: React.FC<MathRendererProps> = ({ latex = "", displayMode = false, className = "" }) => {
  const html = useMemo(() => {
    if (latex === undefined || latex === null) return "";
    
    try {
      // Clean up common issues with AI-generated LaTeX (like redundant backslashes or spaces)
      let cleanLatex = String(latex)
        .replace(/\\\[/g, '')
        .replace(/\\\]/g, '')
        .replace(/\\\(/g, '')
        .replace(/\\\)/g, '')
        // Sometimes AI wraps everything in multiple delimiters
        .replace(/^\s*\$\$/g, '')
        .replace(/\$\$\s*$/g, '')
        .replace(/^\s*\$/g, '')
        .replace(/\$\s*$/g, '')
        .trim();

      if (!cleanLatex) return "";

      return katex.renderToString(cleanLatex, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false,
        macros: {
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}"
        }
      });
    } catch (e) {
      console.error("KaTeX rendering error:", e);
      return `<span class="text-red-500 font-mono text-xs">Math Error: ${latex}</span>`;
    }
  }, [latex, displayMode]);

  if (!latex) return null;

  return (
    <span 
      className={`katex-math-render ${className} ${displayMode ? 'block my-4 w-full overflow-x-auto overflow-y-hidden' : 'inline'}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathRenderer;
