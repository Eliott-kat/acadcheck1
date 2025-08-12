import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
// Optional styles can be added locally if needed for DOCX rendering

export interface DocumentPreviewProps {
  file: File;
  className?: string;
}

export const DocumentPreview = ({ file, className }: DocumentPreviewProps) => {
  const ext = useMemo(() => (file.name.split(".").pop() || "").toLowerCase(), [file]);
  const [txt, setTxt] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup any previous URL
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    const run = async () => {
      if (ext === "pdf") {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        setTxt("");
        // Clear docx container if switching type
        if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
        return;
      }
      if (ext === "docx") {
        setPdfUrl(null);
        setTxt("");
        if (!docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = "";
        const { renderAsync } = await import("docx-preview");
        const arrayBuffer = await file.arrayBuffer();
        await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
          inWrapper: true,
          className: "docx-preview",
        });
        return;
      }
      // txt and others fallback: show plain text
      const content = await file.text();
      setTxt(content);
      setPdfUrl(null);
      if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
    };
    run();
  }, [file, ext]);

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
        <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{txt}</pre>
      )}
    </div>
  );
};
