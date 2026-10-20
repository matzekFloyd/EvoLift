/** Intentional, user-facing API failures (validation, 404, auth). */
export class ApiHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

/** Stable client copy for unexpected failures. Do not put Postgres or stack text here. */
export const API_UNEXPECTED_ERROR_MESSAGE =
  "Something went wrong. Please try again.";
