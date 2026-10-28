import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Invoice } from '@panggora/database';
import { formatIdr, formatIndonesianDate } from '@panggora/shared';

export interface InvoicePdfData {
  organization: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  invoice: Invoice;
  property: {
    name: string;
    address?: string | null;
  };
  room: {
    roomNumber: string;
  };
  tenant: {
    name: string;
    phone: string;
  };
  notes?: string | null;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
  allocations: Array<{
    paymentNumber: string;
    paidAt: string;
    method: string;
    reference: string | null;
    amount: string;
  }>;
  paidAmount: string;
  balance: string;
  derivedStatus: string;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  // Colors
  const colorInk = rgb(0.1, 0.14, 0.12);
  const colorMuted = rgb(0.42, 0.46, 0.44);
  const colorAccent = rgb(0.05, 0.42, 0.36);
  const colorAccentSoft = rgb(0.88, 0.95, 0.93);
  const colorLine = rgb(0.88, 0.86, 0.82);
  const colorPaper = rgb(0.97, 0.96, 0.94);
  const colorWhite = rgb(1, 1, 1);
  const colorGreen = rgb(0.08, 0.52, 0.28);
  const colorRed = rgb(0.72, 0.14, 0.1);
  const colorAmber = rgb(0.66, 0.38, 0.04);

  // Helper: Draw text with bounds
  function drawText(
    text: string,
    x: number,
    yPos: number,
    options: {
      font?: typeof fontRegular;
      size?: number;
      color?: typeof colorInk;
      maxWidth?: number;
    } = {},
  ) {
    const font = options.font ?? fontRegular;
    const size = options.size ?? 10;
    const color = options.color ?? colorInk;

    let cleanText = text;
    if (options.maxWidth) {
      while (cleanText.length > 0 && font.widthOfTextAtSize(cleanText, size) > options.maxWidth) {
        cleanText = cleanText.slice(0, -1);
      }
      if (cleanText.length < text.length && cleanText.length > 3) {
        cleanText = cleanText.slice(0, -3) + '...';
      }
    }

    page.drawText(cleanText, { x, y: yPos, font, size, color });
  }

  // Helper: Text width
  function textWidth(text: string, font: typeof fontRegular, size: number): number {
    return font.widthOfTextAtSize(text, size);
  }

  // Top Accent Bar
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width: width,
    height: 6,
    color: colorAccent,
  });

  // 1. Header: Organization Info & Invoice Title
  y -= 25;
  const orgName = data.organization.name || 'Panggora Kost';
  drawText(orgName, margin, y, { font: fontBold, size: 18, color: colorAccent });

  const titleText = 'FAKTUR TAGIHAN';
  const titleWidth = textWidth(titleText, fontBold, 16);
  drawText(titleText, width - margin - titleWidth, y, {
    font: fontBold,
    size: 16,
    color: colorInk,
  });

  y -= 14;
  if (data.organization.address) {
    drawText(data.organization.address, margin, y, { size: 9, color: colorMuted, maxWidth: 300 });
  }
  const invNum = `#${data.invoice.invoiceNumber}`;
  const invNumWidth = textWidth(invNum, fontBold, 11);
  drawText(invNum, width - margin - invNumWidth, y, {
    font: fontBold,
    size: 11,
    color: colorAccent,
  });

  y -= 13;
  const contactText = [data.organization.phone, data.organization.email]
    .filter(Boolean)
    .join(' · ');
  if (contactText) {
    drawText(contactText, margin, y, { size: 9, color: colorMuted, maxWidth: 300 });
  }

  const issueDateStr = `Tgl Terbit: ${formatIndonesianDate(data.invoice.issuedAt.toISOString().slice(0, 10))}`;
  const issueDateWidth = textWidth(issueDateStr, fontRegular, 9);
  drawText(issueDateStr, width - margin - issueDateWidth, y, { size: 9, color: colorMuted });

  y -= 13;
  const dueDateStr = `Jatuh Tempo: ${formatIndonesianDate(data.invoice.dueDate)}`;
  const dueDateWidth = textWidth(dueDateStr, fontBold, 9);
  drawText(dueDateStr, width - margin - dueDateWidth, y, {
    font: fontBold,
    size: 9,
    color: colorInk,
  });

  // Divider Line
  y -= 16;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: colorLine,
  });

  // 2. Info Boxes: Ditagihkan Kepada (Bill To) & Detail Unit
  y -= 16;
  const boxHeight = 76;
  const colWidth = (contentWidth - 16) / 2;

  // Box 1: Bill To
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: colorPaper,
    borderColor: colorLine,
    borderWidth: 1,
  });

  drawText('DITAGIHKAN KEPADA:', margin + 12, y - 16, {
    font: fontBold,
    size: 8,
    color: colorMuted,
  });
  drawText(data.tenant.name, margin + 12, y - 32, {
    font: fontBold,
    size: 12,
    color: colorInk,
    maxWidth: colWidth - 24,
  });
  drawText(`No. HP: ${data.tenant.phone || '—'}`, margin + 12, y - 48, {
    size: 9,
    color: colorMuted,
  });
  drawText(
    `Periode: ${formatIndonesianDate(data.invoice.periodStart)} s/d ${formatIndonesianDate(data.invoice.periodEnd)}`,
    margin + 12,
    y - 64,
    { size: 9, color: colorInk, maxWidth: colWidth - 24 },
  );

  // Box 2: Unit / Kamar & Status
  const box2X = margin + colWidth + 16;
  page.drawRectangle({
    x: box2X,
    y: y - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: colorPaper,
    borderColor: colorLine,
    borderWidth: 1,
  });

  drawText('UNIT / KAMAR:', box2X + 12, y - 16, {
    font: fontBold,
    size: 8,
    color: colorMuted,
  });
  drawText(`${data.property.name} · Kamar ${data.room.roomNumber}`, box2X + 12, y - 32, {
    font: fontBold,
    size: 11,
    color: colorInk,
    maxWidth: colWidth - 24,
  });

  // Status Badge
  const statusLabel =
    data.derivedStatus === 'paid'
      ? 'LUNAS'
      : data.derivedStatus === 'partial'
        ? 'DIBAYAR SEBAGIAN'
        : data.derivedStatus === 'overdue'
          ? 'TERLAMBAT'
          : data.derivedStatus === 'void'
            ? 'DIBATALKAN'
            : 'BELUM LUNAS';

  const badgeColor =
    data.derivedStatus === 'paid'
      ? colorGreen
      : data.derivedStatus === 'overdue'
        ? colorRed
        : data.derivedStatus === 'partial'
          ? colorAmber
          : data.derivedStatus === 'void'
            ? colorMuted
            : colorAmber;

  const badgeWidth = textWidth(statusLabel, fontBold, 9) + 16;
  page.drawRectangle({
    x: box2X + 12,
    y: y - 66,
    width: badgeWidth,
    height: 18,
    color: colorWhite,
    borderColor: badgeColor,
    borderWidth: 1,
  });
  drawText(statusLabel, box2X + 20, y - 61, { font: fontBold, size: 9, color: badgeColor });

  y -= boxHeight + 24;

  // 3. Table Header
  const tableHeaderHeight = 24;
  page.drawRectangle({
    x: margin,
    y: y - tableHeaderHeight,
    width: contentWidth,
    height: tableHeaderHeight,
    color: colorAccentSoft,
  });

  drawText('NO', margin + 10, y - 16, { font: fontBold, size: 9, color: colorAccent });
  drawText('DESKRIPSI', margin + 40, y - 16, { font: fontBold, size: 9, color: colorAccent });
  drawText('JUMLAH', margin + 310, y - 16, { font: fontBold, size: 9, color: colorAccent });
  drawText('HARGA SATUAN', margin + 370, y - 16, { font: fontBold, size: 9, color: colorAccent });
  const totalHeaderW = textWidth('TOTAL', fontBold, 9);
  drawText('TOTAL', width - margin - 10 - totalHeaderW, y - 16, {
    font: fontBold,
    size: 9,
    color: colorAccent,
  });

  y -= tableHeaderHeight;

  // 4. Table Rows
  const items =
    data.items.length > 0
      ? data.items
      : [
          {
            description: `Sewa kamar ${data.room.roomNumber}`,
            quantity: '1',
            unitPrice: data.invoice.totalAmount,
            amount: data.invoice.totalAmount,
          },
        ];

  let rowIndex = 0;
  for (const item of items) {
    const rowHeight = 26;
    rowIndex++;

    // Alternating background
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: colorPaper,
      });
    }

    drawText(String(rowIndex), margin + 10, y - 17, { size: 9, color: colorMuted });
    drawText(item.description, margin + 40, y - 17, {
      size: 9,
      font: fontBold,
      color: colorInk,
      maxWidth: 260,
    });
    drawText(item.quantity ? `${item.quantity}x` : '1x', margin + 310, y - 17, {
      size: 9,
      color: colorMuted,
    });
    drawText(formatIdr(item.unitPrice || item.amount), margin + 370, y - 17, {
      size: 9,
      color: colorMuted,
    });

    const itemTotalFormatted = formatIdr(item.amount);
    const itemTotalW = textWidth(itemTotalFormatted, fontBold, 9);
    drawText(itemTotalFormatted, width - margin - 10 - itemTotalW, y - 17, {
      font: fontBold,
      size: 9,
      color: colorInk,
    });

    // Row bottom border
    page.drawLine({
      start: { x: margin, y: y - rowHeight },
      end: { x: width - margin, y: y - rowHeight },
      thickness: 0.5,
      color: colorLine,
    });

    y -= rowHeight;
  }

  // 5. Summary Section (Subtotal, Total, Paid, Balance)
  y -= 14;
  const summaryWidth = 220;
  const summaryX = width - margin - summaryWidth;

  function drawSummaryRow(label: string, value: string, isBold = false, valColor = colorInk) {
    const f = isBold ? fontBold : fontRegular;
    drawText(label, summaryX, y, { font: f, size: 9, color: isBold ? colorInk : colorMuted });
    const valW = textWidth(value, f, 9);
    drawText(value, width - margin - 10 - valW, y, { font: f, size: 9, color: valColor });
    y -= 16;
  }

  drawSummaryRow('Subtotal:', formatIdr(data.invoice.subtotal));

  // Grand Total Box
  y -= 4;
  page.drawRectangle({
    x: summaryX - 8,
    y: y - 8,
    width: summaryWidth + 18,
    height: 24,
    color: colorAccentSoft,
  });
  drawText('TOTAL TAGIHAN:', summaryX, y - 2, { font: fontBold, size: 10, color: colorAccent });
  const totalFormatted = formatIdr(data.invoice.totalAmount);
  const totalW = textWidth(totalFormatted, fontBold, 11);
  drawText(totalFormatted, width - margin - 10 - totalW, y - 2, {
    font: fontBold,
    size: 11,
    color: colorAccent,
  });

  y -= 26;
  drawSummaryRow('Sudah Dibayar:', formatIdr(data.paidAmount), false, colorGreen);
  const balanceColor = Number(data.balance) > 0 ? colorRed : colorMuted;
  drawSummaryRow('Sisa Tagihan:', formatIdr(data.balance), true, balanceColor);

  // 6. Payment Allocations (if any)
  if (data.allocations.length > 0) {
    y -= 10;
    drawText('RIWAYAT PEMBAYARAN:', margin, y, { font: fontBold, size: 8, color: colorMuted });
    y -= 14;

    for (const alloc of data.allocations) {
      const methodLabel = alloc.method === 'cash' ? 'Tunai' : 'Transfer Bank';
      const paymentLine = `• ${formatIndonesianDate(alloc.paidAt)}: ${alloc.paymentNumber} via ${methodLabel}${alloc.reference ? ` (${alloc.reference})` : ''} — ${formatIdr(alloc.amount)}`;
      drawText(paymentLine, margin + 4, y, {
        size: 8.5,
        color: colorMuted,
        maxWidth: contentWidth,
      });
      y -= 12;
    }
  }

  // 7. Footer & Notes
  y = Math.min(y - 20, 140);

  // Divider
  page.drawLine({
    start: { x: margin, y: y + 10 },
    end: { x: width - margin, y: y + 10 },
    thickness: 1,
    color: colorLine,
  });

  // Notes left column
  drawText('CATATAN / INFORMASI PEMBAYARAN:', margin, y, {
    font: fontBold,
    size: 8,
    color: colorMuted,
  });
  y -= 12;
  const defaultNote =
    data.notes ||
    'Pembayaran tagihan sewa harap ditransfer sebelum tanggal jatuh tempo. Hubungi pengelola untuk konfirmasi transfer.';
  drawText(defaultNote, margin, y, { size: 8, color: colorMuted, maxWidth: 320 });

  // Signature Block right column
  const signX = width - margin - 140;
  drawText('Pengelola Kost,', signX, y + 12, { font: fontRegular, size: 8.5, color: colorMuted });

  // Space for signature/stamp
  drawText(`( ${data.organization.name} )`, signX, y - 36, {
    font: fontBold,
    size: 9,
    color: colorInk,
    maxWidth: 140,
  });

  // Bottom watermark / system tag
  page.drawText('Dokumen ini diterbitkan secara otomatis oleh Panggora Management System.', {
    x: margin,
    y: 20,
    font: fontOblique,
    size: 7.5,
    color: colorMuted,
  });

  const printedDate = `Dicetak: ${formatIndonesianDate(new Date().toISOString().slice(0, 10))}`;
  const printedDateW = textWidth(printedDate, fontOblique, 7.5);
  page.drawText(printedDate, {
    x: width - margin - printedDateW,
    y: 20,
    font: fontOblique,
    size: 7.5,
    color: colorMuted,
  });

  return doc.save();
}
