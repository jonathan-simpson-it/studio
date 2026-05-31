import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  // Leads
  New: { label: 'New', variant: 'info' },
  Contacted: { label: 'Contacted', variant: 'secondary' },
  Discovery: { label: 'Discovery', variant: 'outline' },
  'Proposal Sent': { label: 'Proposal Sent', variant: 'outline' },
  Negotiation: { label: 'Negotiation', variant: 'outline' },
  Won: { label: 'Won', variant: 'success' },
  Lost: { label: 'Lost', variant: 'destructive' },
  // Tickets
  Open: { label: 'Open', variant: 'info' },
  Resolved: { label: 'Resolved', variant: 'success' },
  Closed: { label: 'Closed', variant: 'secondary' },
  // Projects
  Planning: { label: 'Planning', variant: 'secondary' },
  'In Progress': { label: 'In Progress', variant: 'info' },
  'Waiting on Client': { label: 'Waiting', variant: 'outline' },
  Review: { label: 'Review', variant: 'outline' },
  Completed: { label: 'Completed', variant: 'success' },
  // Proposals
  Draft: { label: 'Draft', variant: 'secondary' },
  Sent: { label: 'Sent', variant: 'info' },
  Viewed: { label: 'Viewed', variant: 'outline' },
  Accepted: { label: 'Accepted', variant: 'success' },
  Rejected: { label: 'Rejected', variant: 'destructive' },
  Expired: { label: 'Expired', variant: 'destructive' },
  // Invoices
  Paid: { label: 'Paid', variant: 'success' },
  Overdue: { label: 'Overdue', variant: 'destructive' },
  Cancelled: { label: 'Cancelled', variant: 'secondary' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className="text-[10px]">
      {config.label}
    </Badge>
  );
}
