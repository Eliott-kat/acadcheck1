import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportReportToPDF(reportSelector: string, filename = "report.pdf") {
  const report = document.querySelector(reportSelector) as HTMLElement;
  if (!report) return;

  // Capture nette du DOM
  const canvas = await html2canvas(report, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  let position = 0;
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Découpe automatique en plusieurs pages si nécessaire
  while (position < pdfHeight) {
    pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, pdfHeight);
    position += pageHeight;
    if (position < pdfHeight) pdf.addPage();
  }

  pdf.save(filename);
}
