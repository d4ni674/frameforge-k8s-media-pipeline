import { NonRetryableError, RetryableError, classifyError } from "./errors";

describe("classifyError", () => {
  it("should pass through NonRetryableError", () => {
    const err = new NonRetryableError("bad");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toBe("bad");
  });

  it("should pass through RetryableError", () => {
    const err = new RetryableError("temp");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(RetryableError);
  });

  it("should classify unsupported as NonRetryableError", () => {
    const err = new Error("unsupported format");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it("should classify invalid as NonRetryableError", () => {
    const err = new Error("invalid profile");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it("should classify corrupt as NonRetryableError", () => {
    const err = new Error("corrupt file");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NonRetryableError);
  });

  it("should classify generic Error as RetryableError", () => {
    const err = new Error("network timeout");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(RetryableError);
  });

  it("should classify non-Error as RetryableError", () => {
    const result = classifyError("string error");
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toBe("string error");
  });
});
