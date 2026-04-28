export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

export function classifyError(error: unknown): NonRetryableError | RetryableError {
  if (error instanceof NonRetryableError || error instanceof RetryableError) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes("unsupported") ||
      msg.includes("invalid") ||
      msg.includes("unsupported processing profile") ||
      msg.includes("corrupt")
    ) {
      return new NonRetryableError(error.message);
    }

    return new RetryableError(error.message);
  }

  return new RetryableError(String(error));
}
