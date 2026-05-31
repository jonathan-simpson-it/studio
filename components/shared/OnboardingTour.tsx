'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const steps = [
  {
    title: 'Welcome to Studio',
    description: 'Your agency operating system. Manage leads, projects, tasks, invoices, and more — all in one place.',
    action: null,
  },
  {
    title: 'Connect Your Accounts',
    description: 'Link GitHub and Google in Settings to sync issues, calendars, and email.',
    action: { label: 'Go to Settings', href: '/settings' },
  },
  {
    title: 'Create Your First Lead',
    description: 'Add a lead to start tracking opportunities. Navigate to Leads and click "New Lead".',
    action: { label: 'Go to Leads', href: '/leads' },
  },
  {
    title: 'You\'re All Set',
    description: 'Explore the Dashboard to see your activity, projects, and tasks. Use Cmd+K to quickly navigate anywhere.',
    action: { label: 'Go to Dashboard', href: '/dashboard' },
  },
];

const STORAGE_KEY = 'studio-onboarding-complete';

export function OnboardingTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const complete = localStorage.getItem(STORAGE_KEY);
    if (!complete) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleComplete() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  }

  function handleSkip() {
    handleComplete();
  }

  function handleNext() {
    if (step < steps.length - 1) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  function handleAction() {
    const s = steps[step];
    if (s.action) router.push(s.action.href);
    handleNext();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{steps[step].title}</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              steps[step].action ? (
                <Button size="sm" onClick={handleAction}>
                  {steps[step].action.label}
                </Button>
              ) : (
                <Button size="sm" onClick={handleNext}>
                  Next
                </Button>
              )
            ) : (
              <Button size="sm" onClick={handleComplete}>
                Get Started
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
