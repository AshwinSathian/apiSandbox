import { PastRequest } from "./history.models";

export type UUID = string;

export interface Meta {
  id: UUID;
  createdAt: number;
  updatedAt: number;
  version: 1;
}

export const META_VERSION: Meta["version"] = 1;

export interface HttpAuthPlaceholder {
  type: "none" | "basic" | "bearer" | "custom";
  label?: string;
  config?: Record<string, unknown>;
}

interface BaseDocument {
  meta: Meta;
}

export interface Collection extends BaseDocument {
  name: string;
  description?: string;
  order: number;
}

export interface Folder extends BaseDocument {
  collectionId: UUID;
  parentFolderId?: UUID;
  name: string;
  order: number;
}

export interface RequestDoc extends BaseDocument {
  collectionId: UUID;
  folderId?: UUID;
  name: string;
  order: number;
  method: PastRequest["method"];
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  auth?: HttpAuthPlaceholder;
}

export type CollectionId = UUID;
export type FolderId = UUID;
export type RequestDocId = UUID;

export interface CollectionExport {
  meta: Meta;
  collection: Collection;
  folders: Folder[];
  requests: RequestDoc[];
}
