import { Types } from 'mongoose';
import { HttpError } from './http';

export function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} must be a non-empty string`);
  }
  return value.trim();
}

export function objectId(value: unknown, field: string): Types.ObjectId {
  if (typeof value !== 'string' || !/^[0-9a-f]{24}$/i.test(value)) {
    throw new HttpError(400, `${field} must be a valid ObjectId`);
  }
  return new Types.ObjectId(value);
}

const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

export function sessionDate(value: unknown, field: string): Date {
  if (typeof value === 'string') {
    const parts = isoDateTime.exec(value);
    if (parts) {
      const date = new Date(value);
      const calendarDate = value.slice(0, 10);
      if (Number.isFinite(date.getTime()) &&
          new Date(`${calendarDate}T00:00:00Z`).toISOString().startsWith(calendarDate)) {
        return date;
      }
    }
  }
  throw new HttpError(400, `${field} must be an ISO 8601 date-time with a timezone`);
}

export function utcDay(value: unknown): { $gte: Date; $lt: Date } {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
    throw new HttpError(400, 'dateTimestamp must be a Unix timestamp in milliseconds');
  }
  const timestamp = Number(value);
  const start = new Date(timestamp);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(end.getTime())) {
    throw new HttpError(400, 'dateTimestamp is outside the supported date range');
  }
  return { $gte: start, $lt: end };
}
