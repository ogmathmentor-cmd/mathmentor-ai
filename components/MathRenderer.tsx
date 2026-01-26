
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
      const cleanLatex = String(latex)
        .replace(/\\\[/g, '')
        .replace(/\\\]/g, '')
        .replace(/\\\(/g, '')
        .replace(/\\\)/g, '')
        .trim();

      if (!cleanLatex) return "";

      return katex.renderToString(cleanLatex, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false
      });
    } catch (e) {
      console.error("KaTeX rendering error:", e);
      return `<span class="text-red-500 font-mono text-xs">Math Error: ${latex}</span>`;
    }
  }, [latex, displayMode]);

  if (!latex) return null;

  return (
    <span 
      className={`katex-math-render ${className} ${displayMode ? 'block my-4 overflow-x-auto overflow-y-hidden' : 'inline'}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathRenderer;
