import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  if (typeof error === 'object' && error !== null) {
    if ('code' in error && error.code === 11000) {
      response.status(409).json({ error: 'Email already exists' });
      return;
    }

    if ('type' in error && error.type === 'entity.parse.failed') {
      response.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    if ('type' in error && error.type === 'entity.too.large') {
      response.status(413).json({ error: 'Request body is too large' });
      return;
    }

    if ('status' in error && error.status === 415) {
      response.status(415).json({ error: 'Unsupported request body encoding or charset' });
      return;
    }
  }

  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};
