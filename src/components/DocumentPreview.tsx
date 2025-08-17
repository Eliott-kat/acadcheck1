import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
import { cn } from "@/lib/utils";
import HighlightedText from "@/components/HighlightedText";

// Utilisation du worker PDF.js via import (plus besoin de fichier public)

export interface HighlightGroup {
  terms: string[];
  className: string;
}

export interface DocumentPreviewProps {
  file: File;
  className?: string;
  highlights?: HighlightGroup[];
  page?: number;
}

export const DocumentPreview = ({ file, className, highlights, page }: DocumentPreviewProps) => {
  const [pdfError, setPdfError] = useState(false);
  const ext = useMemo(() => (file.name.split(".").pop() || "").toLowerCase(), [file]);
  const [txt, setTxt] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  // Scroll automatique à la page demandée (PDF)
  useEffect(() => {
    if (ext === "pdf" && page && page !== pageNumber) {
      setPageNumber(page);
    }
    // eslint-disable-next-line
  }, [page, ext]);

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
        setPageNumber(1);
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
    <div className={cn("w-full max-h-[32rem] overflow-auto flex flex-col items-center justify-center", className)}>
      {ext === "pdf" && pdfUrl && !pdfError && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="px-2 py-1 border rounded">&lt;</button>
            <span>Page {pageNumber} / {numPages}</span>
            <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="px-2 py-1 border rounded">&gt;</button>
          </div>
          <div className="flex justify-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="text-center">Chargement du PDF...</div>}
              error={() => { setPdfError(true); return <></>; }}
            >
              <Page pageNumber={pageNumber} width={600} />
            </Document>
          </div>
        </>
      )}
      {ext === "pdf" && pdfUrl && pdfError && (
        <div className="w-full h-[80vh] flex flex-col items-center justify-center">
          <div className="text-center text-red-500 mb-2">Impossible d'afficher le PDF avec le lecteur intégré.<br/>Affichage natif du PDF ci-dessous :</div>
          <iframe
            src={pdfUrl}
            title="PDF natif"
            className="w-full h-full min-h-[600px] border rounded shadow"
            style={{ minHeight: 600 }}
          />
        </div>
      )}

      {ext === "docx" && (
        <div
          ref={docxContainerRef}
          className="docx-wrapper p-4 bg-white text-black rounded shadow max-w-3xl mx-auto"
          style={{
            fontFamily: 'Calibri, Arial, Helvetica, sans-serif',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            margin: '2rem auto',
            minHeight: '20rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            border: '1px solid #e5e7eb',
          }}
        />
      )}

      {ext === "txt" && txt && (
        <div className="p-4 text-base leading-relaxed bg-white text-black rounded shadow max-w-3xl mx-auto" style={{ fontFamily: 'Consolas, monospace', minHeight: '20rem', margin: '2rem auto', border: '1px solid #e5e7eb' }}>
          <HighlightedText text={txt} highlights={[]} groups={highlights} />
        </div>
      )}
    </div>
  );
};