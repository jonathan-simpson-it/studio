import { Badge } from '@/components/ui/badge';

const currencyLabels: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' }> = {
  HKD: { label: 'HKD', variant: 'default' },
  GBP: { label: 'GBP', variant: 'secondary' },
  IDR: { label: 'IDR', variant: 'outline' },
};

export function CurrencyBadge({ currency }: { currency: string }) {
  const config = currencyLabels[currency] || { label: currency, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className="text-[10px]">
      {config.label}
    </Badge>
  );
}
