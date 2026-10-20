// Natural language date/time parser for appointments
// Supports English and Arabic natural language date references

const monthNames = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const monthAbbrevs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const arabicMonths: Record<string, number> = {
  'يناير': 0, 'فبراير': 1, 'مارس': 2, 'أبريل': 3, 'ابريل': 3, 'مايو': 4, 'يونيو': 5,
  'يوليو': 6, 'يوليه': 6, 'أغسطس': 7, 'اغسطس': 7, 'سبتمبر': 8, 'أكتوبر': 9, 'اكتوبر': 9,
  'نوفمبر': 10, 'ديسمبر': 11,
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const arabicDays: Record<string, number> = {
  'الأحد': 0, 'الاحد': 0,
  'الاثنين': 1, 'الاثنين ': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3, 'الاربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6,
};

function findMonth(text: string): number | null {
  const lower = text.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lower.includes(monthNames[i]) || lower.includes(monthAbbrevs[i])) return i;
  }
  for (const [name, idx] of Object.entries(arabicMonths)) {
    if (text.includes(name)) return idx;
  }
  return null;
}

function findDayOfMonth(text: string): number | null {
  // Match "5", "5th", "the 5th", ordinal numbers
  const ordinalMatch = text.match(/(\d+)(?:st|nd|rd|th)?/i);
  if (ordinalMatch) {
    const num = parseInt(ordinalMatch[1], 10);
    if (num >= 1 && num <= 31) return num;
  }
  return null;
}

function findDayOfWeek(text: string): number | null {
  const lower = text.toLowerCase();
  for (let i = 0; i < 7; i++) {
    if (lower.includes(dayNames[i])) return i;
  }
  for (const [name, idx] of Object.entries(arabicDays)) {
    if (text.includes(name)) return idx;
  }
  return null;
}

function findTime(text: string): { hours: number; minutes: number } | null {
  const lower = text.toLowerCase();

  // "5 pm", "5:30 pm", "17:00", "5 o'clock"
  const timeMatch = lower.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3];

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
    return { hours, minutes };
  }

  // Arabic time words
  if (lower.includes('صباحا') || lower.includes('الصباح')) {
    return { hours: hours < 12 ? hours : hours - 12, minutes };
  }
  if (lower.includes('مساء') || lower.includes('المساء') || lower.includes('مساءً')) {
    return { hours: hours < 12 ? hours + 12 : hours, minutes };
  }

  return null;
}

function findRelativeDays(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes('today') || text.includes('اليوم')) return 0;
  if (lower.includes('tomorrow') || text.includes('غدا') || text.includes('بكرة')) return 1;
  if (lower.includes('day after tomorrow') || text.includes('بعد غد') || text.includes('بعد بكرة')) return 2;
  if (lower.includes('next week') || text.includes('الأسبوع القادم') || text.includes('الاسبوع القادم')) return 7;
  if (lower.includes('next month') || text.includes('الشهر القادم')) return 30;
  return null;
}

export interface ParsedDate {
  date: Date | null;
  confidence: number;
  rawTime: string;
}

export function parseNaturalDate(text: string): ParsedDate {
  const now = new Date();
  const result = new Date(now);
  let confidence = 0;

  // Check for relative days
  const relDays = findRelativeDays(text);
  if (relDays !== null) {
    result.setDate(result.getDate() + relDays);
    confidence = 0.8;
  }

  // Check for specific month + day
  const month = findMonth(text);
  const dayOfMonth = findDayOfMonth(text);

  if (month !== null && dayOfMonth !== null) {
    result.setMonth(month, dayOfMonth);
    result.setFullYear(now.getFullYear());
    // If the date has already passed this year, move to next year
    if (result < now && relDays === null) {
      result.setFullYear(now.getFullYear() + 1);
    }
    confidence = 0.9;
  } else if (month !== null) {
    result.setMonth(month);
    confidence = 0.5;
  }

  // Check for day of week
  const dayOfWeek = findDayOfWeek(text);
  if (dayOfWeek !== null && relDays === null && month === null) {
    const currentDay = now.getDay();
    let diff = dayOfWeek - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    result.setDate(now.getDate() + diff);
    confidence = 0.7;
  }

  // Check for "in X days/weeks"
  const inMatch = text.toLowerCase().match(/in\s+(\d+)\s+(day|days|week|weeks)/);
  if (inMatch) {
    const num = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    if (unit.startsWith('week')) {
      result.setDate(now.getDate() + num * 7);
    } else {
      result.setDate(now.getDate() + num);
    }
    confidence = 0.85;
  }

  // Apply time
  const time = findTime(text);
  if (time) {
    result.setHours(time.hours, time.minutes, 0, 0);
    confidence = Math.min(confidence + 0.1, 1);
  } else if (confidence > 0) {
    // Default to 9 AM if no time specified
    result.setHours(9, 0, 0, 0);
  }

  // If no date info found at all
  if (confidence === 0) {
    return { date: null, confidence: 0, rawTime: text };
  }

  return { date: result, confidence, rawTime: text };
}

export function formatCountdown(target: Date): string {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
