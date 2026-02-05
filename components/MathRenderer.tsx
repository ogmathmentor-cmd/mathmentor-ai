import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  latex?: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * A dedicated component for rendering LaTeX math using KaTeX.
 * Handles both inline and block math with refined cleaning logic.
 */
const MathRenderer: React.FC<MathRendererProps> = ({ latex = "", displayMode = false, className = "" }) => {
  const html = useMemo(() => {
    if (latex === undefined || latex === null) return "";
    
    try {
      // Clean only the outermost delimiters produced by some AI formatting behaviors
      // to avoid breaking internal escaped brackets that are part of math notation.
      let cleanLatex = String(latex).trim();
      
      // Remove starting/ending delimiters if they wrap the entire string
      if (cleanLatex.startsWith('\\[') && cleanLatex.endsWith('\\]')) {
        cleanLatex = cleanLatex.substring(2, cleanLatex.length - 2);
      } else if (cleanLatex.startsWith('\\(') && cleanLatex.endsWith('\\)')) {
        cleanLatex = cleanLatex.substring(2, cleanLatex.length - 2);
      } else if (cleanLatex.startsWith('$$') && cleanLatex.endsWith('$$')) {
        cleanLatex = cleanLatex.substring(2, cleanLatex.length - 2);
      } else if (cleanLatex.startsWith('$') && cleanLatex.endsWith('$')) {
        cleanLatex = cleanLatex.substring(1, cleanLatex.length - 1);
      }

      cleanLatex = cleanLatex.trim();
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