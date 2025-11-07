import { Injectable, Signal, computed, signal } from "@angular/core";
import {
  Collection,
  CollectionId,
  Folder,
  FolderId,
  RequestDoc,
  RequestDocId,
} from "../models/collections.models";
import { IdbService } from "../data/idb.service";

export interface CollectionTree {
  collection: Collection;
  folders: Folder[];
  requests: RequestDoc[];
}

@Injectable({
  providedIn: "root",
})
export class CollectionsService {
  private readonly treeState = signal<CollectionTree[]>([]);
  private readonly loadingState = signal(false);

  readonly tree: Signal<CollectionTree[]> = computed(() => this.treeState());
  readonly loading: Signal<boolean> = computed(() => this.loadingState());

  constructor(private readonly idb: IdbService) {}

  async refresh(): Promise<void> {
    this.loadingState.set(true);
    try {
      const collections = await this.idb.listCollections();
      const trees: CollectionTree[] = [];
      for (const collection of collections) {
        const [folders, requests] = await Promise.all([
          this.idb.listFolders(collection.meta.id),
          this.idb.listRequests(collection.meta.id),
        ]);
        trees.push({ collection, folders, requests });
      }
      this.treeState.set(trees);
    } finally {
      this.loadingState.set(false);
    }
  }

  async ensureLoaded(): Promise<void> {
    if (!this.treeState().length) {
      await this.refresh();
    }
  }

  async createCollection(payload: {
    name: string;
    description?: string;
  }): Promise<Collection> {
    const created = await this.idb.createCollection(payload);
    await this.refresh();
    return created;
  }

  async renameCollection(
    id: CollectionId,
    updates: { name?: string; description?: string }
  ): Promise<Collection | null> {
    const updated = await this.idb.renameCollection(id, updates);
    await this.refresh();
    return updated;
  }

  async duplicateCollection(id: CollectionId): Promise<Collection | null> {
    const result = await this.idb.duplicateCollection(id);
    await this.refresh();
    return result;
  }

  async deleteCollection(id: CollectionId): Promise<void> {
    await this.idb.deleteCollection(id);
    await this.refresh();
  }

  async reorderCollections(order: Array<{ id: CollectionId; order: number }>): Promise<void> {
    await this.idb.reorderCollections(order);
    await this.refresh();
  }

  async createFolder(payload: {
    collectionId: CollectionId;
    name: string;
    parentFolderId?: FolderId;
  }): Promise<Folder> {
    const folder = await this.idb.createFolder(payload);
    await this.refresh();
    return folder;
  }

  async renameFolder(id: FolderId, name: string): Promise<Folder | null> {
    const folder = await this.idb.renameFolder(id, name);
    await this.refresh();
    return folder;
  }

  async duplicateFolder(id: FolderId): Promise<Folder | null> {
    const folder = await this.idb.duplicateFolder(id);
    await this.refresh();
    return folder;
  }

  async deleteFolder(id: FolderId): Promise<void> {
    await this.idb.deleteFolder(id);
    await this.refresh();
  }

  async reorderFolders(order: Array<{ id: FolderId; order: number }>): Promise<void> {
    await this.idb.reorderFolders(order);
    await this.refresh();
  }

  async createRequest(payload: {
    collectionId: CollectionId;
    folderId?: FolderId;
    name: string;
    method: RequestDoc["method"];
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<RequestDoc> {
    const doc = await this.idb.createRequest(payload);
    await this.refresh();
    return doc;
  }

  async renameRequest(id: RequestDocId, name: string): Promise<RequestDoc | null> {
    const doc = await this.idb.renameRequest(id, name);
    await this.refresh();
    return doc;
  }

  async duplicateRequest(id: RequestDocId): Promise<RequestDoc | null> {
    const doc = await this.idb.duplicateRequest(id);
    await this.refresh();
    return doc;
  }

  async deleteRequest(id: RequestDocId): Promise<void> {
    await this.idb.deleteRequest(id);
    await this.refresh();
  }

  async reorderRequests(order: Array<{ id: RequestDocId; order: number }>): Promise<void> {
    await this.idb.reorderRequests(order);
    await this.refresh();
  }

  getCollection(id: CollectionId): Collection | undefined {
    return this.treeState()
      .map((entry) => entry.collection)
      .find((collection) => collection.meta.id === id);
  }

  getCollectionTree(id: CollectionId): CollectionTree | undefined {
    return this.treeState().find((entry) => entry.collection.meta.id === id);
  }
}
