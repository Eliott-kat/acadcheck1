// Utility: convert uploaded files (.pdf, .docx, .txt) into plain text in the browser
// Heavy libs are dynamically imported for performance.

// Import the pdf.js worker URL so we can set it at runtime with Vite
// @ts-ignore - Vite will resolve this to a URL string
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export async function fileToText(file: File): Promise<string> {
  const name = file.name || "";
  const ext = name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return await file.text();
  }
  if (ext === "pdf") {
    return await parsePDF(file);
  }
  if (ext === "docx") {
    return await parseDOCX(file);
  }
  throw new Error("Unsupported file type. Use .pdf, .docx or .txt");
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib: any = await import("pdfjs-dist");
  // Configure worker (required by pdf.js)
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const maxPages = pdf.numPages;
  let fullText = "";

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .filter(Boolean);
    fullText += strings.join(" ") + "\n\n";
  }
  return fullText.trim();
}

async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth: any = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value as string;
  return htmlToText(html);
}

function htmlToText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || "").replace(/\u00A0/g, " ");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
