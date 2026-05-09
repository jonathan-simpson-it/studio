export interface OcrExtractionResult {
  rawText: string;
  blockCount: number;
  method: 'text' | 'ocr' | 'vision';
}

export interface ParsedScheduleEvent {
  summary: string;
  location: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  recurrence: string | null;
  description: string | null;
}

export interface OcrParseResult {
  events: ParsedScheduleEvent[];
  rawResponse: string;
}
