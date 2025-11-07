import {
  Collection,
  CollectionExport,
  Folder,
  RequestDoc,
} from "../../models/collections.models";
import { CollectionTree } from "../../services/collections.service";

export interface ValidationResult {
  path: string;
  message: string;
}

export function validateCollectionExport(payload: unknown): ValidationResult[] {
  const errors: ValidationResult[] = [];
  if (typeof payload !== "object" || payload === null) {
    errors.push({ path: "root", message: "Export must be an object." });
    return errors;
  }
  const value = payload as Record<string, unknown>;
  if (!value["collection"]) {
    errors.push({ path: "collection", message: "Missing collection payload." });
  }
  if (!Array.isArray(value["folders"])) {
    errors.push({ path: "folders", message: "Folders must be an array." });
  }
  if (!Array.isArray(value["requests"])) {
    errors.push({ path: "requests", message: "Requests must be an array." });
  }
  return errors;
}

export function serializeDeterministic(tree: CollectionTree): string {
  const exportPayload: CollectionExport = {
    meta: tree.collection.meta,
    collection: tree.collection,
    folders: tree.folders,
    requests: tree.requests,
  };
  const ordered = deepSort(exportPayload);
  return JSON.stringify(ordered, null, 2);
}

export interface ImportableCollection {
  name: string;
  payload: CollectionExport;
}

export function parseCollectionImport(text: string): {
  payload?: CollectionExport;
  errors?: ValidationResult[];
} {
  try {
    const payload = JSON.parse(text) as CollectionExport;
    const errors = validateCollectionExport(payload);
    if (errors.length) {
      return { errors };
    }
    return { payload };
  } catch {
    return { errors: [{ path: "root", message: "Invalid JSON file." }] };
  }
}

function deepSort<T>(value: T): T {
  if (Array.isArray(value)) {
    const items = [...value];
    if (items.length && typeof items[0] === "object" && items[0] !== null) {
      items.sort((a: any, b: any) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const idA = a?.meta?.id ?? "";
        const idB = b?.meta?.id ?? "";
        return idA.localeCompare(idB);
      });
    }
    return items.map((item) => deepSort(item)) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = deepSort(val);
    }
    return result as T;
  }
  return value;
}
