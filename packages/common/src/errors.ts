/** An error that already knows which HTTP response it should become. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, 'BAD_REQUEST', msg);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Not found') => new HttpError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string) => new HttpError(409, 'CONFLICT', msg);
