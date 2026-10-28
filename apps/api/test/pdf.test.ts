import { describe, expect, it } from 'vitest';
import { generateInvoicePdf } from '../src/lib/pdf';

describe('invoice pdf generator', () => {
  it('generates a valid binary PDF document', async () => {
    const pdfBytes = await generateInvoicePdf({
      organization: {
        name: 'Kost Melati Indah',
        address: 'Jl. Melati No. 12, Jakarta Selatan',
        phone: '081234567890',
        email: 'info@kostmelati.id',
      },
      invoice: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        leaseId: '123e4567-e89b-12d3-a456-426614174002',
        invoiceNumber: 'INV-202610-TEST01',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        issuedAt: new Date('2026-09-28T00:00:00Z'),
        dueDate: '2026-10-01',
        subtotal: '1500000.00',
        totalAmount: '1500000.00',
        status: 'issued',
        voidReason: null,
        createdAt: new Date('2026-09-28T00:00:00Z'),
        updatedAt: new Date('2026-09-28T00:00:00Z'),
      },
      property: {
        name: 'Gedung A',
        address: 'Jl. Melati No. 12',
      },
      room: {
        roomNumber: 'Kamar 101',
      },
      tenant: {
        name: 'Ahmad Fauzi',
        phone: '081987654321',
      },
      items: [
        {
          description: 'Sewa Kamar 101 Periode 01 Okt - 31 Okt 2026',
          quantity: '1',
          unitPrice: '1500000.00',
          amount: '1500000.00',
        },
      ],
      allocations: [
        {
          paymentNumber: 'PAY-202610-001',
          paidAt: '2026-10-01',
          method: 'bank_transfer',
          reference: 'BCA-9876',
          amount: '1500000.00',
        },
      ],
      paidAmount: '1500000.00',
      balance: '0.00',
      derivedStatus: 'paid',
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Standard PDF file header is "%PDF-"
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('handles unpaid invoices without allocations gracefully', async () => {
    const pdfBytes = await generateInvoicePdf({
      organization: {
        name: 'Kost Simple',
      },
      invoice: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        leaseId: '123e4567-e89b-12d3-a456-426614174002',
        invoiceNumber: 'INV-202611-UNPAID',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        issuedAt: new Date('2026-10-28T00:00:00Z'),
        dueDate: '2026-11-01',
        subtotal: '2000000.00',
        totalAmount: '2000000.00',
        status: 'issued',
        voidReason: null,
        createdAt: new Date('2026-10-28T00:00:00Z'),
        updatedAt: new Date('2026-10-28T00:00:00Z'),
      },
      property: {
        name: 'Kost Mawar',
      },
      room: {
        roomNumber: 'M-02',
      },
      tenant: {
        name: 'Siti Rahma',
        phone: '0855112233',
      },
      items: [],
      allocations: [],
      paidAmount: '0.00',
      balance: '2000000.00',
      derivedStatus: 'unpaid',
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
