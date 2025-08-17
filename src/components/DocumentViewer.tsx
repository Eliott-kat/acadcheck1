import { useState } from "react";
import { DocumentPreview } from "./DocumentPreview";

export interface DocumentViewerProps {
  file: File;
  highlights?: { terms: string[]; className: string }[];
  mode?: "full" | "thumbnail";
  onClose?: () => void;
  page?: number;
}

export const DocumentViewer = ({ file, highlights, mode = "full", onClose, page }: DocumentViewerProps) => {
  const [open, setOpen] = useState(true);
  if (!open && mode === "thumbnail") {
    // Miniature: PDF = 1ère page, DOCX = icône ou 1ère page, TXT = icône
    const ext = file.name.split(".").pop()?.toLowerCase();
    return (
      <div className="flex flex-col items-center justify-center p-2 border rounded bg-muted/50 w-32 h-40 cursor-pointer" onClick={() => setOpen(true)}>
        {ext === "pdf" && <span className="text-5xl">📄</span>}
        {ext === "docx" && <span className="text-5xl">📝</span>}
        {ext === "txt" && <span className="text-5xl">📃</span>}
        <span className="text-xs mt-2 text-center break-all">{file.name}</span>
      </div>
    );
  }
  return (
    <div className="relative">
      {mode === "thumbnail" && (
        <button className="absolute top-2 right-2 z-10 bg-white/80 rounded p-1 shadow" onClick={() => { setOpen(false); onClose?.(); }}>
          ✕
        </button>
      )}
      <DocumentPreview file={file} highlights={highlights} page={page} />
    </div>
  );
};
