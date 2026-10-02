import PDFDocument from "pdfkit";
import { MONTH_NAMES, formatMinutes } from "@/lib/timezone";
import type { GeneralReport, IndividualReport } from "./generate-report";

type Column = { label: string; width: number; align?: "left" | "center" | "right" };

const MARGIN = 36;

function build(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    draw(doc);
    doc.end();
  });
}

function table(doc: PDFKit.PDFDocument, columns: Column[], rows: string[][], rowHeight: number) {
  const left = MARGIN;
  const width = columns.reduce((a, c) => a + c.width, 0);
  const line = (cells: string[], bold: boolean) => {
    if (doc.y + rowHeight > doc.page.height - MARGIN) doc.addPage();
    const top = doc.y;
    let x = left;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    columns.forEach((c, i) => {
      doc.rect(x, top, c.width, rowHeight).stroke();
      doc.text(cells[i] ?? "", x + 4, top + 4, { width: c.width - 8, height: rowHeight - 4, align: c.align ?? "left", lineBreak: false });
      x += c.width;
    });
    doc.y = top + rowHeight;
    doc.x = left;
  };
  line(columns.map((c) => c.label), true);
  rows.forEach((r) => line(r, false));
  return width;
}

export const individualPdf = (r: IndividualReport) =>
  build((doc) => {
    doc.font("Helvetica-Bold").fontSize(16).text("FOLHA DE PONTO", { align: "center" }).moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Mês/Ano: ${String(r.month).padStart(2, "0")}/${r.year}`);
    doc.text(`Nome do Funcionário: ${r.employee.fullName}  (Mat. ${r.employee.employeeCode})`);
    doc.text(`Cargo: ${r.employee.position}`);
    doc.text(`Setor: ${r.employee.department}`).moveDown(0.5);

    table(
      doc,
      [
        { label: "Dia", width: 40, align: "center" },
        { label: "Entrada", width: 80, align: "center" },
        { label: "Saída", width: 80, align: "center" },
        { label: "Hora extra", width: 80, align: "center" },
        { label: "Assinatura", width: 283 },
      ],
      r.rows.map((x) => [x.day, x.entry, x.exit, x.overtime, ""]),
      15,
    );

    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(10);
    doc.text(`Total de horas trabalhadas: ${formatMinutes(r.totals.worked)}`);
    doc.text(`Total de horas extras: ${formatMinutes(r.totals.overtime)}`);
    doc.text(`Total de horas previstas: ${formatMinutes(r.totals.expected)}`);
    doc.text(`Total de déficit: ${formatMinutes(r.totals.deficit)}`);

    if (doc.y + 70 > doc.page.height - MARGIN) doc.addPage();
    const y = doc.y + 40;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + 240, y).stroke();
    doc.moveTo(MARGIN + 280, y).lineTo(MARGIN + 520, y).stroke();
    doc.font("Helvetica").fontSize(9);
    doc.text("ASS FUNCIONÁRIO", MARGIN, y + 4, { width: 240, align: "center" });
    doc.text("ASS SUPERVISOR", MARGIN + 280, y + 4, { width: 240, align: "center" });
  });

export const generalPdf = (r: GeneralReport) =>
  build((doc) => {
    doc.font("Helvetica-Bold").fontSize(16).text("RELATÓRIO GERAL DE PONTO", { align: "center" });
    doc.fontSize(11).text(`${MONTH_NAMES[r.month - 1]!.toUpperCase()}/${r.year}`, { align: "center" }).moveDown();
    table(
      doc,
      [
        { label: "Funcionário", width: 160 },
        { label: "Setor", width: 110 },
        { label: "Dias", width: 40, align: "center" },
        { label: "Trabalhadas", width: 80, align: "center" },
        { label: "Extras", width: 70, align: "center" },
        { label: "Déficit", width: 63, align: "center" },
      ],
      r.rows.map((x) => [x.name, x.department, String(x.days), formatMinutes(x.worked), formatMinutes(x.overtime), formatMinutes(x.deficit)]),
      18,
    );
  });
