import { validate } from "class-validator";
import { CreateJobDto } from "./create-job.dto";

describe("CreateJobDto", () => {
  it("should validate with correct values", async () => {
    const dto = new CreateJobDto();
    dto.mediaType = "image";
    dto.processingProfile = "thumbnail";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail with invalid mediaType", async () => {
    const dto = new CreateJobDto();
    dto.mediaType = "audio" as any;
    dto.processingProfile = "thumbnail";

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should fail with invalid processingProfile", async () => {
    const dto = new CreateJobDto();
    dto.mediaType = "image";
    dto.processingProfile = "invalid" as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
