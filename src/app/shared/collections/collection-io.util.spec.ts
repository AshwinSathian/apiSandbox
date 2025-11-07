import { CollectionTree } from "../../services/collections.service";
import { serializeDeterministic, validateCollectionExport } from "./collection-io.util";

describe("collection-io.util", () => {
  it("serializes collections deterministically", () => {
    const tree: CollectionTree = {
      collection: {
        meta: { id: "c2", createdAt: 1, updatedAt: 2, version: 1 },
        name: "Sample",
        description: "Desc",
        order: 2,
      },
      folders: [
        {
          meta: { id: "f2", createdAt: 1, updatedAt: 2, version: 1 },
          collectionId: "c2",
          name: "Folder B",
          order: 2,
        },
        {
          meta: { id: "f1", createdAt: 1, updatedAt: 2, version: 1 },
          collectionId: "c2",
          name: "Folder A",
          order: 1,
        },
      ],
      requests: [
        {
          meta: { id: "r2", createdAt: 1, updatedAt: 2, version: 1 },
          collectionId: "c2",
          name: "Request B",
          order: 2,
          method: "GET",
          url: "https://example-b.com",
          headers: {},
        },
        {
          meta: { id: "r1", createdAt: 1, updatedAt: 2, version: 1 },
          collectionId: "c2",
          name: "Request A",
          order: 1,
          method: "GET",
          url: "https://example-a.com",
          headers: {},
        },
      ],
    };

    const json = serializeDeterministic(tree);
    const parsed = JSON.parse(json);
    expect(parsed.folders[0].meta.id).toBe("f1");
    expect(parsed.requests[0].meta.id).toBe("r1");
  });

  it("validates export payloads", () => {
    const errors = validateCollectionExport(null);
    expect(errors.length).toBeGreaterThan(0);
    const ok = validateCollectionExport({
      collection: {},
      folders: [],
      requests: [],
    });
    expect(ok.length).toBe(0);
  });
});
