/** Consistent API error shape: { error: { code, message } } */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static notFound(what = 'Resource') {
    return new ApiError(404, 'not_found', `${what} not found`);
  }
  static badRequest(message: string, code = 'bad_request') {
    return new ApiError(400, code, message);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'unauthorized', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'conflict', message);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, 'rate_limited', message);
  }
}
