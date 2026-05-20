import React from 'react';
import ReactPDF, { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { Invoice, Proposal, LineItem } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f98a3',
  },
  docNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    marginBottom: 4,
  },
  table: {
    marginVertical: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colService: { flex: 2 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colRate: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totals: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  totalLabel: { width: 100, textAlign: 'right', marginRight: 10 },
  totalValue: { width: 100, textAlign: 'right' },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 10,
  },
  textBlock: {
    marginBottom: 6,
    lineHeight: 1.5,
  },
  billTo: {
    marginBottom: 20,
  },
});

function LineItemsTable({ lineItems }: { lineItems: LineItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.colService}>Service</Text>
        <Text style={styles.colDesc}>Description</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colRate}>Unit Price</Text>
        <Text style={styles.colTotal}>Total</Text>
      </View>
      {lineItems.map((item, i) => (
        <View style={styles.tableRow} key={i}>
          <Text style={styles.colService}>{item.service}</Text>
          <Text style={styles.colDesc}>{item.description}</Text>
          <Text style={styles.colQty}>{item.quantity}</Text>
          <Text style={styles.colRate}>{item.unit_price.toFixed(2)}</Text>
          <Text style={styles.colTotal}>{item.total.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { HKD: 'HK$', GBP: '£', IDR: 'Rp' };
  return `${symbols[currency] || currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.agencyName}>Jonathan Simpson & Co.</Text>
          </View>
          <View>
            <Text style={styles.docNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.value}>Status: {invoice.status}</Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={styles.value}>{/* client name */}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 40, marginBottom: 20 }}>
          <View>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={styles.value}>{invoice.issue_date}</Text>
          </View>
          {invoice.due_date && (
            <View>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{invoice.due_date}</Text>
            </View>
          )}
        </View>

        <LineItemsTable lineItems={invoice.line_items as LineItem[]} />

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{invoice.subtotal.toFixed(2)}</Text>
          </View>
          {invoice.discount_percent > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount ({invoice.discount_percent}%)</Text>
              <Text style={styles.totalValue}>
                -{(invoice.subtotal * invoice.discount_percent / 100).toFixed(2)}
              </Text>
            </View>
          )}
          {invoice.tax_percent > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{invoice.tax_label || 'Tax'} ({invoice.tax_percent}%)</Text>
              <Text style={styles.totalValue}>
                {(invoice.total * invoice.tax_percent / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.payment_terms && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Terms</Text>
            <Text style={styles.textBlock}>{invoice.payment_terms}</Text>
          </View>
        )}

        {invoice.payment_notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Notes</Text>
            <Text style={styles.textBlock}>{invoice.payment_notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Generated by Studio — Jonathan Simpson & Co.</Text>
      </Page>
    </Document>
  );

  return Buffer.from(await ReactPDF.renderToStream(doc) as unknown as ArrayBuffer);
}

export async function generateProposalPDF(proposal: Proposal): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.agencyName}>Jonathan Simpson & Co.</Text>
          </View>
          <View>
            <Text style={styles.docNumber}>{proposal.proposal_number}</Text>
            <Text style={styles.value}>Status: {proposal.status}</Text>
          </View>
        </View>

        {proposal.cover_note && (
          <View style={styles.section}>
            <Text style={styles.label}>Cover Note</Text>
            <Text style={styles.textBlock}>{proposal.cover_note}</Text>
          </View>
        )}

        {proposal.scope_of_work && (
          <View style={styles.section}>
            <Text style={styles.label}>Scope of Work</Text>
            <Text style={styles.textBlock}>{proposal.scope_of_work}</Text>
          </View>
        )}

        {proposal.timeline && (
          <View style={styles.section}>
            <Text style={styles.label}>Timeline</Text>
            <Text style={styles.textBlock}>{proposal.timeline}</Text>
          </View>
        )}

        {(proposal.line_items as LineItem[]).length > 0 && (
          <>
            <Text style={styles.label}>Pricing</Text>
            <LineItemsTable lineItems={proposal.line_items as LineItem[]} />
          </>
        )}

        {proposal.payment_terms && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Terms</Text>
            <Text style={styles.textBlock}>{proposal.payment_terms}</Text>
          </View>
        )}

        {proposal.expires_at && (
          <View style={styles.section}>
            <Text style={styles.label}>Expires</Text>
            <Text style={styles.value}>{proposal.expires_at}</Text>
          </View>
        )}

        <Text style={styles.footer}>Generated by Studio — Jonathan Simpson & Co.</Text>
      </Page>
    </Document>
  );

  return Buffer.from(await ReactPDF.renderToStream(doc) as unknown as ArrayBuffer);
}
