const API_BASE = process.env.API_BASE ?? "http://localhost:3000";

function createTestPng(): Buffer {
  // 1x1 red PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

async function uploadJob(
  file: Buffer,
  mediaType: string,
  processingProfile: string,
): Promise<{ id: string; status: string; mediaType: string; processingProfile: string }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: "image/png" }), "test.png");
  form.append("mediaType", mediaType);
  form.append("processingProfile", processingProfile);

  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function getJob(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/jobs/${id}`);
  if (!res.ok) throw new Error(`Get job failed: ${res.status}`);
  return res.json();
}

async function getJobStatus(id: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/jobs/${id}/status`);
  if (!res.ok) throw new Error(`Get status failed: ${res.status}`);
  return res.json();
}

async function pollForStatus(
  id: string,
  target: string[],
  maxAttempts = 15,
  delayMs = 2000,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const { status } = await getJobStatus(id);
    if (target.includes(status)) return status;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Timeout waiting for status ${target.join("/")}`);
}

describe("End-to-end upload flow", () => {
  it("should upload an image and process it to thumbnail", async () => {
    const file = createTestPng();
    const result = await uploadJob(file, "image", "thumbnail");

    expect(result.id).toBeDefined();
    expect(result.status).toBe("queued");
    expect(result.mediaType).toBe("image");
    expect(result.processingProfile).toBe("thumbnail");

    const finalStatus = await pollForStatus(result.id, ["done", "failed"]);
    expect(finalStatus).toBe("done");

    const job = await getJob(result.id);
    expect(job.status).toBe("done");
    expect(job.outputManifest).toBeDefined();
    expect((job.outputManifest as Record<string, string>).thumbnail).toContain("outputs/");

    // Verify output manifest contains expected key
    const thumbKey = (job.outputManifest as Record<string, string>).thumbnail;
    expect(thumbKey).toContain("outputs/");
    expect(thumbKey).toContain(result.id);
  });

  it("should upload an image and process it to resized-800", async () => {
    const file = createTestPng();
    const result = await uploadJob(file, "image", "resized-800");

    const finalStatus = await pollForStatus(result.id, ["done", "failed"]);
    expect(finalStatus).toBe("done");

    const job = await getJob(result.id);
    expect((job.outputManifest as Record<string, string>)["resized-800"]).toBeDefined();
  });

  it("should upload an image and process it to webp", async () => {
    const file = createTestPng();
    const result = await uploadJob(file, "image", "webp");

    const finalStatus = await pollForStatus(result.id, ["done", "failed"]);
    expect(finalStatus).toBe("done");

    const job = await getJob(result.id);
    expect((job.outputManifest as Record<string, string>).webp).toBeDefined();
  });

  it("should reject unsupported file types", async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(Buffer.from("not an image"))]), "test.txt");
    form.append("mediaType", "image");
    form.append("processingProfile", "thumbnail");

    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(400);
  });

  it("should reject video media type in MVP", async () => {
    const file = createTestPng();
    const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: "image/png" }), "test.png");
    form.append("mediaType", "video");
    form.append("processingProfile", "thumbnail");

    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(400);
  });
});
