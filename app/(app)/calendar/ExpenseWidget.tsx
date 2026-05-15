'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/db/actions/settings';
import { getDailyExpenses, createDailyExpense, deleteDailyExpense } from '@/lib/db/actions/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DollarSign, Plus, Trash2, Sparkles } from 'lucide-react';
import type { DailyExpense } from '@/types';
import { parseExpense } from '@/lib/parser/nlp';

const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Supplies',
  'Software',
  'Travel',
  'Entertainment',
  'Health',
  'Education',
  'Utilities',
  'Other',
];

interface ExpenseWidgetProps {
  date: Date;
  view: 'month' | 'week' | 'year';
}

export function ExpenseWidget({ date, view }: ExpenseWidgetProps) {
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [open, setOpen] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [note, setNote] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(date, 'yyyy-MM-dd'));

  async function loadExpenses() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = await getDailyExpenses(today);
    if (data) setExpenses(data);
  }

  useEffect(() => {
    loadExpenses();
  }, [date, view]);

  function handleParse() {
    if (!nlInput.trim()) return;
    const result = parseExpense(nlInput);
    if (result.amount) setAmount(result.amount.toString());
    if (result.category) setCategory(result.category);
    if (result.date) setExpenseDate(result.date);
    if (result.note) setNote(result.note);
  }

  async function addExpense() {
    if (!amount || parseFloat(amount) <= 0) return;
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      toast.error('Authentication required');
      return;
    }

    try {
      await createDailyExpense({
        amount: parseFloat(amount),
        category,
        note: note || null,
        date: expenseDate,
        user_id: currentUser.id,
      });
      toast.success('Expense added');
      setAmount('');
      setCategory('Other');
      setNote('');
      setNlInput('');
      setOpen(false);
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    }
  }

  async function deleteExpense(id: string) {
    try {
      await deleteDailyExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  }

  const todayExpenses = expenses.filter((e) => e.date === format(date, 'yyyy-MM-dd'));
  const dailyTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="w-64 flex-shrink-0">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Expenses
          </h3>
          <span className="text-xs text-muted-foreground">{format(date, 'MMM d')}</span>
        </div>

        {todayExpenses.length > 0 && (
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Today's total</p>
            <p className="text-lg font-bold text-emerald-600">HK${dailyTotal.toLocaleString()}</p>
          </div>
        )}

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {expenses.slice(0, 10).map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-accent/50"
            >
              <div>
                <p className="font-medium">{exp.category}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(exp.date), 'MMM d')} {exp.note && `— ${exp.note}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">HK${exp.amount.toLocaleString()}</span>
                <button
                  onClick={() => deleteExpense(exp.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No expenses yet
            </p>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-3 w-3" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Add Daily Expense</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addExpense();
              }}
              className="space-y-3 pt-2"
            >
              <div className="space-y-2">
                <Label>Natural language</Label>
                <div className="flex gap-2">
                  <Input
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                    placeholder="HK$150 lunch today"
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" size="icon" onClick={handleParse}>
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Try: &quot;50 transport yesterday&quot; or &quot;HK$200 dinner last night with client&quot;
                </p>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (HKD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
