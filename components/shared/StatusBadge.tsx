import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  // Leads
  New: { label: 'New', variant: 'default' },
  Contacted: { label: 'Contacted', variant: 'secondary' },
  Discovery: { label: 'Discovery', variant: 'outline' },
  'Proposal Sent': { label: 'Proposal Sent', variant: 'outline' },
  Negotiation: { label: 'Negotiation', variant: 'outline' },
  Won: { label: 'Won', variant: 'default' },
  Lost: { label: 'Lost', variant: 'destructive' },
  // Projects
  Planning: { label: 'Planning', variant: 'secondary' },
  'In Progress': { label: 'In Progress', variant: 'default' },
  'Waiting on Client': { label: 'Waiting', variant: 'outline' },
  Review: { label: 'Review', variant: 'outline' },
  Completed: { label: 'Completed', variant: 'default' },
  // Proposals
  Draft: { label: 'Draft', variant: 'secondary' },
  Sent: { label: 'Sent', variant: 'default' },
  Viewed: { label: 'Viewed', variant: 'outline' },
  Accepted: { label: 'Accepted', variant: 'default' },
  Rejected: { label: 'Rejected', variant: 'destructive' },
  Expired: { label: 'Expired', variant: 'destructive' },
  // Invoices
  Paid: { label: 'Paid', variant: 'default' },
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
