# Leads Section + Full CRUD Cleanup Plan

## 1. Server Actions (Backend)

### leads.ts — add `updateLead` and `deleteLead`
- `updateLead(id, data)` — generic field updater via `findByIdAndUpdate`
- `deleteLead(id)` — `findByIdAndDelete`

### clients.ts — add `updateClient` and `deleteClient`
- `updateClient(id, data)`, `deleteClient(id)` — same pattern

### projects.ts — add `deleteProject`, `updateMilestone`, `deleteMilestone`, `deleteTask`
- `deleteProject(id)` — cascade: delete milestones, tasks, notes, repos, synced issues, then the project itself
- `updateMilestone(id, data)`, `deleteMilestone(id)` — simple CRUD
- `deleteTask(id)` — simple CRUD

### invoices.ts — add `deleteProposal` and `deleteInvoice`
- `deleteProposal(id)`, `deleteInvoice(id)` — simple CRUD

### notes.ts — add `deleteNote`
- `deleteNote(id)` — simple CRUD (updateNote already exists)

## 2. Reusable ConfirmDeleteDialog Component

Create `components/shared/ConfirmDeleteDialog.tsx`:
```
Props: { open, onOpenChange, entityName, entityType, onConfirm }
- Shows a Dialog with:
  - Title: "Delete {entityType}"
  - Description: warning text
  - Input field: "Type {entityName} to confirm"
  - Confirm button (destructive variant), disabled until text matches exactly
  - Cancel button
```

## 3. Fix Leads Detail Page (app/(app)/leads/[id]/page.tsx)

**Bug fix:** `handleSave` for non-stage fields currently does NOT persist. Change lines 80-87:
```
// Before (buggy):
} else {
  try {
    const { listLeads } = await import('@/lib/db/actions/leads');
    toast.success('Lead updated');
  } catch (err) { ... }
}

// After (fixed):
} else {
  try {
    await updateLead(lead.id, { [field]: value, updated_at: new Date().toISOString() });
    toast.success('Lead updated');
  } catch (err) { ... }
}
```

Import `updateLead` and `deleteLead` from `@/lib/db/actions/leads`.

**Add delete button:**
- Add state: `const [showDelete, setShowDelete] = useState(false)`
- Import `ConfirmDeleteDialog` and `Trash2` icon
- Add a destructive `<Button>` in the header next to the "Draft email" button:
  ```
  <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
    <Trash2 className="mr-2 h-4 w-4" /> Delete
  </Button>
  ```
- Add `ConfirmDeleteDialog` component:
  ```
  <ConfirmDeleteDialog
    open={showDelete}
    onOpenChange={setShowDelete}
    entityName={lead.company_name}
    entityType="Lead"
    onConfirm={async () => {
      await deleteLead(lead.id);
      toast.success('Lead deleted');
      router.push('/leads');
    }}
  />
  ```

## 4. Clients Detail Page (app/(app)/clients/[id]/page.tsx)

**Add inline editing:**
- Import `updateClient`, `deleteClient` from `@/lib/db/actions/clients`
- Import `ConfirmDeleteDialog`, `Input`, `Label`, `Select`, `Trash2`
- Convert the static `<Card>` with read-only fields to editable `Input`/`Select` fields with `handleSave` (same pattern as leads detail page)
- Fields to make editable:
  - `company_name` — Input
  - `contact_name` — Input
  - `email` — Input
  - `phone` — Input
  - `currency_preference` — Select with ['HKD', 'GBP', 'IDR']

**Add delete button:**
- Add `const [showDelete, setShowDelete] = useState(false)`
- Add delete button in header with Trash2 icon
- Add `ConfirmDeleteDialog` — requires typing `company_name`

## 5. Projects Detail Page (app/(app)/projects/[id]/page.tsx)

**Add inline editing for project fields:**
- Import `updateProject`, `deleteProject`, `updateMilestone`, `deleteMilestone`, `deleteTask` from `@/lib/db/actions/projects`
- Import `ConfirmDeleteDialog`, `Trash2`
- Make project fields editable in the header/overview:
  - `name` — Input
  - `status` — Select ['Planning', 'In Progress', 'On Hold', 'Completed']
  - `description` — textarea

**Add edit/delete to tasks (in Kanban cards):**
- Each task card gets a small Trash2 button to delete
- Each task card gets a click handler that opens a small dialog/sheet to edit status, title, priority

**Add edit/delete to milestones:**
- Each milestone card gets edit (text for title + date for due_date + select for status) and delete (Trash2 icon)

**Add delete button for the project itself:**
- In the header, add destructive delete button
- ConfirmDeleteDialog requires typing project `name`

## 6. Proposals Detail Page (app/(app)/proposals/[id]/page.tsx)

**Add delete button only** (already has full inline editing):
- Import `deleteProposal` from `@/lib/db/actions/invoices`
- Import `ConfirmDeleteDialog`, `Trash2`
- Add delete button in the header button group
- ConfirmDeleteDialog requires typing `proposal.proposal_number`

## 7. Invoices Detail Page (app/(app)/invoices/[id]/page.tsx)

**Add delete button only** (already has full inline editing):
- Import `deleteInvoice` from `@/lib/db/actions/invoices`
- Import `ConfirmDeleteDialog`, `Trash2`
- Add delete button in the header button group
- ConfirmDeleteDialog requires typing `invoice.invoice_number`

## 8. Verification
Run `npm run build` (or lint/typecheck) to verify all changes compile cleanly.
