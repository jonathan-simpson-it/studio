export interface ParsedICSEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  rrule: string | null;
}

function foldLines(text: string): string {
  return text.replace(/\r\n /g, '').replace(/\r\n\t/g, '');
}

function getPropertyValue(component: string, propName: string): string | null {
  const lines = component.split(/\r\n|\r|\n/);
  for (const line of lines) {
    if (line.startsWith(`${propName}:`) || line.startsWith(`${propName};`)) {
      return line.substring(line.indexOf(':') + 1).trim();
    }
  }
  return null;
}

function parseDateValue(value: string): Date {
  const clean = value.replace(/-/g, '').replace(/:/g, '').replace(/Z$/, '');
  
  if (clean.length >= 8) {
    const year = parseInt(clean.substring(0, 4));
    const month = parseInt(clean.substring(4, 6)) - 1;
    const day = parseInt(clean.substring(6, 8));
    const hour = clean.length >= 12 ? parseInt(clean.substring(9, 11)) : 0;
    const min = clean.length >= 14 ? parseInt(clean.substring(11, 13)) : 0;
    const sec = clean.length >= 16 ? parseInt(clean.substring(13, 15)) : 0;
    
    if (value.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day, hour, min, sec);
  }
  
  return new Date(value);
}

export function parseICS(raw: string): ParsedICSEvent[] {
  const unfolded = foldLines(raw);
  const blocks = unfolded.split('BEGIN:VEVENT');
  const result: ParsedICSEvent[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const endIdx = block.indexOf('END:VEVENT');
    if (endIdx === -1) continue;
    
    const component = block.substring(0, endIdx);
    
    const uid = getPropertyValue(component, 'UID') || `event-${i}`;
    const summary = getPropertyValue(component, 'SUMMARY') || 'Untitled Event';
    const description = getPropertyValue(component, 'DESCRIPTION');
    const location = getPropertyValue(component, 'LOCATION');
    const rrule = getPropertyValue(component, 'RRULE');
    
    const dtStart = getPropertyValue(component, 'DTSTART');
    const dtEnd = getPropertyValue(component, 'DTEND');
    
    if (!dtStart || !dtEnd) continue;
    
    result.push({
      uid,
      summary,
      description,
      location,
      start: parseDateValue(dtStart),
      end: parseDateValue(dtEnd),
      rrule,
    });
  }

  return result;
}
