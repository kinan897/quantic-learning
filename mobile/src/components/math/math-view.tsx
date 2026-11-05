'use dom';

/**
 * Renders lesson text (Markdown + LaTeX between $...$) with KaTeX.
 *
 * This is an Expo DOM component. On web it renders as ordinary HTML. On iOS/Android Expo
 * runs it inside a WebView, because native apps have no built-in LaTeX renderer.
 * Use <RichText> rather than this directly: it skips the WebView for plain text.
 *
 * The HTML comes only from our own API's course content, never from user input, so
 * inserting it with dangerouslySetInnerHTML is safe here.
 */

import type { DOMProps } from 'expo/dom';
import katex from 'katex';
import { marked } from 'marked';
import { useEffect, useMemo, useRef } from 'react';

// KaTeX's stylesheet points at its font files with relative URLs. Bundling the CSS from
// node_modules leaves those fonts behind, so load both from the CDN. Keep the version in
// sync with the `katex` package in package.json.
const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css';

type Props = {
  source: string;
  color: string;
  fontSize: number;
  align: 'left' | 'center';
  /** Reports the rendered height so the native side can size the WebView. */
  onHeight?: (height: number) => Promise<void> | void;
  dom?: DOMProps;
};

export default function MathView({ source, color, fontSize, align, onHeight }: Props) {
  const html = useMemo(() => renderMarkdownWithMath(source), [source]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !onHeight) return;
    const report = () => void onHeight(Math.ceil(node.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onHeight]);

  return (
    <>
      <link rel="stylesheet" href={KATEX_CSS} precedence="default" />
      <style>{CSS}</style>
      <div
        ref={ref}
        className="ql-rich"
        style={{ color, fontSize, textAlign: align }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

function renderMarkdownWithMath(source: string): string {
  // Pull math out first so Markdown doesn't mangle it (e.g. "*" or "_" inside LaTeX).
  const rendered: string[] = [];
  const stash = (tex: string, displayMode: boolean, trailing = '') => {
    const html = katex.renderToString(tex, { displayMode, throwOnError: false });
    // Keep punctuation right after inline math on the same line ("[1, 4]." not "[1, 4]⏎.").
    rendered.push(trailing ? `<span class="ql-nowrap">${html}${trailing}</span>` : html);
    return `@@MATH${rendered.length - 1}@@`;
  };
  const withPlaceholders = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => stash(tex, true))
    .replace(/\$([^$\n]+?)\$([.,;:!?)]*)/g, (_, tex: string, punct: string) =>
      stash(tex, false, punct),
    );

  const html = marked.parse(withPlaceholders, { async: false, gfm: true }) as string;
  return html.replace(/@@MATH(\d+)@@/g, (_, i: string) => rendered[Number(i)]);
}

const CSS = `
  html, body { margin: 0; padding: 0; background: transparent; }
  .ql-rich {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    line-height: 1.5;
    overflow-wrap: anywhere;
    -webkit-text-size-adjust: 100%;
  }
  .ql-rich > :first-child { margin-top: 0; }
  .ql-rich > :last-child { margin-bottom: 0; }
  .ql-rich p { margin: 0 0 0.6em; }
  .ql-rich ul, .ql-rich ol { margin: 0 0 0.6em; padding-left: 1.3em; }
  .ql-rich li { margin: 0.2em 0; }
  .ql-rich strong { font-weight: 700; }
  .ql-rich .ql-nowrap { white-space: nowrap; }
  .ql-rich .katex { font-size: 1.08em; }
  .ql-rich .katex-display { margin: 0.6em 0; overflow-x: auto; overflow-y: hidden; padding: 2px 0; }
`;
