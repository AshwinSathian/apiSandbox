import { IdbService } from "./idb.service";

describe("IdbService migrations", () => {
  it("exposes migrateV1toV2 scaffold", async () => {
    const service = new IdbService();
    await (service as any).migrateV1toV2();
  });

  it("keeps in-memory history untouched when migration is a no-op", async () => {
    const service = new IdbService();
    (service as any).memoryStore = [
      { id: 1, method: "GET", url: "https://example.com", headers: {}, createdAt: Date.now() },
    ];
    await (service as any).migrateV1toV2();
    expect((service as any).memoryStore.length).toBe(1);
    expect((service as any).memoryStore[0].url).toBe("https://example.com");
  });
});
