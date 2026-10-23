import { formatIdr } from '@kost/shared';
import { reportQuery } from '@kost/validation';
import { Hono } from 'hono';
import { assertPropertyAccess } from '../lib/access';
import { buildReport } from '../lib/reporting';
import { parseQuery } from '../lib/http';
import type { AppVariables } from '../types';

export const reportRoutes = new Hono<{ Variables: AppVariables }>();

reportRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, reportQuery);
  if (query.propertyId) assertPropertyAccess(ctx, query.propertyId);
  const report = await buildReport(ctx, query);
  return c.json({ data: report });
});

reportRoutes.get('/export.csv', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, reportQuery);
  if (query.propertyId) assertPropertyAccess(ctx, query.propertyId);
  const report = await buildReport(ctx, query);

  const header = [
    'properti',
    'total_kamar',
    'kamar_terisi',
    'kamar_kosong',
    'tingkat_hunian_persen',
    'penerimaan_kas',
    'invoice_diterbitkan',
    'jumlah_invoice',
    'piutang',
    'tunggakan',
    'pengeluaran',
    'kas_bersih',
    'deposit_diterima',
    'deposit_direfund',
  ].join(',');

  const rows = report.properties.map((row) =>
    [
      `"${row.propertyName.replaceAll('"', '""')}"`,
      row.totalRooms,
      row.occupiedRooms,
      row.vacantRooms,
      row.occupancyRate,
      row.cashReceipts,
      row.invoicesIssued,
      row.invoicesCount,
      row.outstanding,
      row.overdue,
      row.expenses,
      row.netCash,
      row.depositReceived,
      row.depositRefunded,
    ].join(','),
  );

  const summary = [
    'TOTAL',
    report.totals.totalRooms,
    report.totals.occupiedRooms,
    report.totals.vacantRooms,
    report.totals.occupancyRate,
    report.totals.cashReceipts,
    report.totals.invoicesIssued,
    report.totals.invoicesCount,
    report.totals.outstanding,
    report.totals.overdue,
    report.totals.expenses,
    report.totals.netCash,
    report.totals.depositReceived,
    report.totals.depositRefunded,
  ].join(',');

  const csv = [header, ...rows, summary].join('\n');
  return c.body(csv, 200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="laporan-${query.from}-${query.to}.csv"`,
  });
});

reportRoutes.get('/summary-text', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, reportQuery);
  if (query.propertyId) assertPropertyAccess(ctx, query.propertyId);
  const report = await buildReport(ctx, query);
  return c.text(
    [
      `Penerimaan kas: ${formatIdr(report.totals.cashReceipts)}`,
      `Invoice diterbitkan: ${formatIdr(report.totals.invoicesIssued)}`,
      `Piutang: ${formatIdr(report.totals.outstanding)}`,
      `Tunggakan: ${formatIdr(report.totals.overdue)}`,
      `Pengeluaran: ${formatIdr(report.totals.expenses)}`,
      `Kas bersih: ${formatIdr(report.totals.netCash)}`,
      `Deposit diterima: ${formatIdr(report.totals.depositReceived)}`,
      `Deposit direfund: ${formatIdr(report.totals.depositRefunded)}`,
    ].join('\n'),
  );
});
