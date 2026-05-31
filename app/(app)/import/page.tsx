'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createLead } from '@/lib/db/actions/leads';
import { Upload, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  const fieldOptions = [
    { value: 'company_name', label: 'Company Name' },
    { value: 'contact_name', label: 'Contact Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'source', label: 'Source' },
    { value: 'estimated_value', label: 'Estimated Value' },
    { value: 'currency', label: 'Currency' },
    { value: 'notes', label: 'Notes' },
    { value: '', label: '— Skip —' },
  ];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }
      const hdrs = parseCSVLine(lines[0]);
      const data = lines.slice(1).map(parseCSVLine).filter((r) => r.some((c) => c.trim()));
      setHeaders(hdrs);
      setRows(data);
      setStep('preview');

      const auto: Record<string, string> = {};
      hdrs.forEach((h) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const match = fieldOptions.find((f) => lower.includes(f.value));
        if (match && match.value) auto[h] = match.value;
      });
      setMapping(auto);
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    setImporting(true);
    let imported = 0;
    let errors = 0;
    for (const row of rows) {
      const obj: Record<string, unknown> = {};
      let hasValue = false;
      headers.forEach((h, i) => {
        const field = mapping[h];
        if (field && row[i]?.trim()) {
          obj[field] = field === 'estimated_value' ? parseFloat(row[i]) || 0 : row[i].trim();
          hasValue = true;
        }
      });
      if (!hasValue) { errors++; continue; }
      try {
        await createLead(obj as Record<string, unknown>);
        imported++;
      } catch {
        errors++;
      }
    }
    setResult({ imported, errors });
    setStep('done');
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    if (imported > 0) toast.success(`Imported ${imported} leads`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {step !== 'upload' && (
          <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setResult(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <h2 className="text-xl font-semibold">Import Leads</h2>
      </div>

      {step === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div
              className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Upload a CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">Drag and drop, or click to browse</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <Button variant="outline" size="sm">Select File</Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Expected headers: Company Name, Contact Name, Email, Phone, Source, Estimated Value, Currency, Notes
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Preview ({rows.length} rows)</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-xs truncate max-w-[200px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Column Mapping</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm w-40 shrink-0 font-medium">{h}</span>
                  <select
                    className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                    value={mapping[h] || ''}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  >
                    {fieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setStep('upload'); setResult(null); }}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Import {rows.length} Rows
            </Button>
          </div>
        </>
      )}

      {step === 'done' && result && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            {result.errors === 0 ? (
              <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            ) : (
              <AlertCircle className="h-12 w-12 mx-auto text-warning" />
            )}
            <div>
              <p className="text-lg font-semibold">{result.imported} imported</p>
              {result.errors > 0 && <p className="text-sm text-muted-foreground">{result.errors} rows had errors</p>}
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={() => { setStep('upload'); setResult(null); setFile(null); }}>Import Another</Button>
              <Button variant="outline" onClick={() => window.location.href = '/leads'}>View Leads</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
