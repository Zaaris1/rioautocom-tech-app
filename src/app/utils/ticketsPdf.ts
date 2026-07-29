import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Ticket } from "../api";

type PdfFilters = {
  networkName?: string;
  storeName?: string;
  status?: string;
  hideConcluded?: boolean;
};

type ExportTicketsPdfOptions = {
  tickets: Ticket[];
  filters: PdfFilters;
  generatedBy?: string;
};

const STATUS_LABELS: Record<string, string> = {
  ABERTO: "Aberto",
  ATRIBUIDO: "Atribuído",
  EM_ATENDIMENTO: "Em atendimento",
  PENDENTE: "Pendente",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const TYPE_LABELS: Record<string, string> = {
  REPARO: "Reparo",
  INSTALACAO: "Instalação",
  SERVICO: "Serviço",
  VISITA_TECNICA: "Visita técnica",
  SUPORTE: "Suporte",
  VISITA: "Visita",
  MANUTENCAO: "Manutenção",
  OUTRO: "Outro",
};

function clean(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shortId(id: string) {
  return clean(id).slice(-8).toUpperCase() || "—";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function oneLine(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

function filterLabel(filters: PdfFilters) {
  const items = [
    filters.networkName ? `Rede: ${filters.networkName}` : "Todas as redes",
    filters.storeName ? `Loja: ${filters.storeName}` : "Todas as lojas",
    filters.status ? `Status: ${STATUS_LABELS[filters.status] || filters.status}` : "Todos os status",
  ];
  if (filters.hideConcluded && !filters.status) items.push("Concluídos ocultos");
  return items.join("  •  ");
}

export function exportTicketsToPdf({ tickets, filters, generatedBy }: ExportTicketsPdfOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const issuedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const concluded = tickets.filter((ticket) => ticket.status === "CONCLUIDO").length;
  const pending = tickets.filter((ticket) => ticket.status === "PENDENTE").length;

  doc.setProperties({
    title: "Relatório de Ordens de Serviço | RioAutocom Tech",
    subject: "Ordens de serviço pesquisadas",
    author: "RioAutocom Tech",
  });

  doc.setFillColor(9, 24, 53);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setFillColor(11, 95, 255);
  doc.rect(0, 32, pageWidth, 3, "F");
  doc.setFillColor(11, 95, 255);
  doc.circle(18, 17.5, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RA", 18, 20.4, { align: "center" });
  doc.setFontSize(16);
  doc.text("RIOAUTOCOM TECH", 31, 15.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("RELATÓRIO DE ORDENS DE SERVIÇO", 31, 22);
  doc.setFontSize(8);
  doc.text(`Emitido em ${issuedAt}`, pageWidth - 12, 15.5, { align: "right" });
  if (generatedBy) doc.text(`Responsável: ${generatedBy}`, pageWidth - 12, 21.5, { align: "right" });

  doc.setTextColor(34, 48, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(filterLabel(filters), 12, 43);

  const summary = [
    { label: "ORDENS ENCONTRADAS", value: String(tickets.length), color: [11, 95, 255] },
    { label: "CONCLUÍDAS", value: String(concluded), color: [46, 161, 102] },
    { label: "PENDENTES", value: String(pending), color: [211, 139, 22] },
  ];
  summary.forEach((item, index) => {
    const x = 12 + index * 53;
    doc.setFillColor(245, 248, 253);
    doc.roundedRect(x, 49, 47, 20, 2, 2, "F");
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(x, 49, 2, 20, "F");
    doc.setTextColor(95, 110, 135);
    doc.setFontSize(7);
    doc.text(item.label, x + 6, 56);
    doc.setTextColor(25, 42, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(item.value, x + 6, 65);
    doc.setFont("helvetica", "normal");
  });

  autoTable(doc, {
    startY: 77,
    margin: { left: 12, right: 12, bottom: 18 },
    tableWidth: pageWidth - 24,
    theme: "grid",
    head: [["OS", "ABERTURA", "LOJA / LOCAL", "SOLICITANTE", "SERVIÇO SOLICITADO", "PRIORIDADE", "SITUAÇÃO"]],
    body: tickets.map((ticket) => [
      `#${shortId(ticket.id)}`,
      formatDate(ticket.opened_at || ticket.created_at),
      `${clean(ticket.store_name) || clean(ticket.store_id) || "—"}\n${clean(ticket.local) || "Local não informado"}`,
      clean(ticket.requester_name) || "Não informado",
      `${TYPE_LABELS[ticket.type] || ticket.type}\n${oneLine(clean(ticket.problem) || "Sem descrição", 190)}`,
      ticket.priority === "URGENTE" ? "Urgente" : "Normal",
      STATUS_LABELS[ticket.status] || ticket.status,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 7.4,
      cellPadding: 2.4,
      textColor: [42, 56, 82],
      lineColor: [220, 228, 240],
      lineWidth: 0.15,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [17, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.1,
      cellPadding: 2.7,
    },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 27 },
      2: { cellWidth: 41 },
      3: { cellWidth: 31 },
      4: { cellWidth: 88 },
      5: { cellWidth: 24, halign: "center" },
      6: { cellWidth: 31, halign: "center", fontStyle: "bold" },
    },
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      doc.setDrawColor(218, 226, 239);
      doc.line(12, pageHeight - 13, pageWidth - 12, pageHeight - 13);
      doc.setTextColor(100, 113, 137);
      doc.setFontSize(7);
      doc.text("RioAutocom Tech  •  Documento gerado para acompanhamento do cliente", 12, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - 12, pageHeight - 8, { align: "right" });
    },
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`rioautocom-ordens-de-servico-${timestamp}.pdf`);
}
