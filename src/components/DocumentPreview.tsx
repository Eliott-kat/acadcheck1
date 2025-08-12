import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import HighlightedText from "@/components/HighlightedText";

export interface HighlightGroup {
  terms: string[];
  className: string;
}

export interface DocumentPreviewProps {
  file: File;
  className?: string;
  highlights?: HighlightGroup[];
}

export const DocumentPreview = ({ file, className, highlights }: DocumentPreviewProps) => {
  const ext = useMemo(() => (file.name.split(".").pop() || "").toLowerCase(), [file]);
  const [txt, setTxt] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Apply highlights inside DOCX-rendered HTML, scoped per paragraph to avoid layout issues
  const applyHighlightsToContainer = (container: HTMLElement) => {
    if (!highlights || highlights.length === 0) return;

    // Remove previous marks from our runs
    container.querySelectorAll('mark[data-hl="1"]').forEach((el) => {
      const parent = el.parentNode as Node | null;
      if (!parent) return;
      // unwrap mark
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });

    const tokens = highlights
      .flatMap((g) => (g.terms || []).map((t) => t?.trim()).filter(Boolean).map((t) => ({ term: t as string, className: g.className })))
      .sort((a, b) => b.term.length - a.term.length);

    // Limit processing to paragraph-like containers for stability and performance
    const paragraphs = Array.from(container.querySelectorAll('p')) as HTMLElement[];
    let processedNodes = 0;

    const processElement = (rootEl: HTMLElement) => {
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = (node as Text).parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (p.closest('mark[data-hl="1"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const nodes: Text[] = [];
      while (walker.nextNode()) {
        nodes.push(walker.currentNode as Text);
        processedNodes++;
        if (processedNodes > 20000) break; // hard safety cap
      }

      for (const textNode of nodes) {
        const original = textNode.nodeValue || "";
        const lower = original.toLowerCase();
        let cursor = 0;
        const parts: (string | { s: number; e: number; cls: string })[] = [];

        // Greedy find earliest match repeatedly
        while (cursor < lower.length) {
          let best: { start: number; end: number; cls: string } | null = null;
          for (const tok of tokens) {
            const idx = lower.indexOf(tok.term.toLowerCase(), cursor);
            if (idx !== -1) {
              const end = idx + tok.term.length;
              if (!best || idx < best.start || (idx === best.start && tok.term.length > best.end - best.start)) {
                best = { start: idx, end, cls: tok.className };
              }
            }
          }
          if (!best) break;
          if (best.start > cursor) parts.push(original.slice(cursor, best.start));
          parts.push({ s: best.start, e: best.end, cls: best.cls });
          cursor = best.end;
        }
        if (parts.length === 0) continue;
        if (cursor < original.length) parts.push(original.slice(cursor));

        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (typeof p === "string") frag.appendChild(document.createTextNode(p));
          else {
            const m = document.createElement("mark");
            m.setAttribute("data-hl", "1");
            m.className = p.cls;
            m.textContent = original.slice(p.s, p.e);
            frag.appendChild(m);
          }
        }
        textNode.parentNode?.replaceChild(frag, textNode);
      }
    };

    // Process only visible paragraphs for performance
    const limit = Math.max(50, Math.ceil(paragraphs.length * 1.0));
    for (let i = 0; i < Math.min(paragraphs.length, limit); i++) {
      processElement(paragraphs[i]);
      if (processedNodes > 20000) break;
    }
  };

  useEffect(() => {
    const run = async () => {
      if (ext === "pdf") {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        setTxt("");
        if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
        return;
      }
      if (ext === "docx") {
        setPdfUrl(null);
        setTxt("");
        if (!docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = "";
        try {
          const { renderAsync } = await import("docx-preview");
          const arrayBuffer = await file.arrayBuffer();
          await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
            inWrapper: true,
            className: "docx-preview",
          });
          // Apply highlights after render
          if (docxContainerRef.current) {
            try { applyHighlightsToContainer(docxContainerRef.current); } catch (e) { console.error("HL apply error", e); }
          }
        } catch (err) {
          console.error("DOCX render failed, fallback to text:", err);
          try {
            const { extractRawText } = await import("mammoth");
            const arrayBuffer = await file.arrayBuffer();
            const { value } = await extractRawText({ arrayBuffer });
            setTxt(value || "");
          } catch (e2) {
            console.error("DOCX text fallback failed:", e2);
            setTxt("(Impossible d'afficher ce DOCX)");
          }
        }
        return;
      }
      // txt and others fallback: show plain text
      try {
        const content = await file.text();
        setTxt(content);
      } catch (e) {
        console.error("Read text failed", e);
        setTxt("");
      }
      setPdfUrl(null);
      if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
    };
    run();
    // Re-apply highlights when highlights change for docx
    if (ext === "docx" && docxContainerRef.current) {
      try { applyHighlightsToContainer(docxContainerRef.current); } catch (e) { console.error("HL apply error", e); }
    }
  }, [file, ext, JSON.stringify(highlights)]);

  return (
    <div className={cn("w-full max-h-[32rem] overflow-auto", className)}>
      {ext === "pdf" && pdfUrl && (
        <iframe
          title="Aperçu PDF"
          src={pdfUrl}
          className="w-full h-[32rem] bg-background"
        />
      )}

      {ext === "docx" && (
        <div ref={docxContainerRef} className="docx-wrapper p-4" />
      )}

      {ext === "txt" && txt && (
        <div className="p-4 text-sm leading-relaxed">
          <HighlightedText text={txt} highlights={[]} groups={highlights} />
        </div>
      )}
    </div>
  );
};
