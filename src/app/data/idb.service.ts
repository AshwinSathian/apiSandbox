import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase, DBSchema, IDBPObjectStore } from 'idb';
import { PastRequest, PastRequestKey } from '../models/history.models';

interface ApiSandboxDB extends DBSchema {
  pastRequests: {
    key: PastRequestKey;
    value: PastRequest & { id: PastRequestKey };
    indexes: {
      'by-createdAt': number;
      'by-url': string;
      'by-method': PastRequest['method'];
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class IdbService {
  private dbPromise?: Promise<IDBPDatabase<ApiSandboxDB>>;
  private initialized = false;
  private useMemoryFallback = false;
  private memoryStore: (PastRequest & { id: PastRequestKey })[] = [];
  private memorySequence = 1;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (typeof indexedDB === 'undefined') {
      this.logError('indexedDB is not available in this environment. Falling back to in-memory store.');
      this.enableMemoryFallback();
      return;
    }

    try {
      this.dbPromise = openDB<ApiSandboxDB>('api-sandbox', 3, {
        /* istanbul ignore next -- IndexedDB upgrade logic is environment specific */
        upgrade: async (db, oldVersion, _newVersion, transaction) => {
          let store: IDBPObjectStore<ApiSandboxDB, ['pastRequests'], 'pastRequests', 'versionchange'>;
          /* istanbul ignore else -- requires native IndexedDB upgrade */
          if (!db.objectStoreNames.contains('pastRequests')) {
            store = db.createObjectStore('pastRequests', { keyPath: 'id', autoIncrement: true });
            store.createIndex('by-createdAt', 'createdAt');
            store.createIndex('by-url', 'url');
            store.createIndex('by-method', 'method');
          } else {
            store = transaction.objectStore('pastRequests');
            if (!store.indexNames.contains('by-createdAt')) {
              store.createIndex('by-createdAt', 'createdAt');
            }
            if (!store.indexNames.contains('by-url')) {
              store.createIndex('by-url', 'url');
            }
            if (oldVersion < 3 && !store.indexNames.contains('by-method')) {
              store.createIndex('by-method', 'method');
            }
          }

          /* istanbul ignore next */
          if (oldVersion < 2) {
            await this.ensureFields(store, { status: undefined, durationMs: undefined });
          }
          /* istanbul ignore next */
          if (oldVersion < 3) {
            await this.ensureFields(store, { error: undefined, method: 'GET' });
          }
        }
      });

      await this.dbPromise;
      this.initialized = true;
    } catch (error) {
      this.logError('Failed to open IndexedDB. Falling back to in-memory store.', error);
      this.enableMemoryFallback();
    }
  }

  async add(req: PastRequest): Promise<PastRequestKey | null> {
    try {
      const item: PastRequest = {
        ...req,
        createdAt: req.createdAt ?? Date.now()
      };

      if (this.useMemoryFallback) {
        const record = { ...item, id: this.memorySequence++ };
        this.memoryStore.push(record);
        this.sortMemoryStore();
        return record.id;
      }

      const db = await this.getDatabase();
      if (!db) {
        const record = { ...item, id: this.memorySequence++ };
        this.memoryStore.push(record);
        this.sortMemoryStore();
        return record.id;
      }

      const tx = db.transaction('pastRequests', 'readwrite');
      const key = await tx.store.add(item as PastRequest & { id: PastRequestKey });
      await tx.done;
      return key;
    } catch (error) {
      this.logError('add operation failed.', error);
      return null;
    }
  }

  async get(id: PastRequestKey): Promise<PastRequest | null> {
    try {
      if (this.useMemoryFallback) {
        return this.memoryStore.find(item => item.id === id) ?? null;
      }

      const db = await this.getDatabase();
      if (!db) {
        return this.memoryStore.find(item => item.id === id) ?? null;
      }

      const tx = db.transaction('pastRequests', 'readonly');
      const result = await tx.store.get(id);
      await tx.done;
      return result ?? null;
    } catch (error) {
      this.logError('get operation failed.', error);
      return null;
    }
  }

  async getLatest(limit = 50): Promise<PastRequest[]> {
    try {
      if (this.useMemoryFallback) {
        return this.memoryStore.slice(0, limit);
      }

      const db = await this.getDatabase();
      if (!db) {
        return this.memoryStore.slice(0, limit);
      }

      const tx = db.transaction('pastRequests', 'readonly');
      const index = tx.store.index('by-createdAt');
      const results: PastRequest[] = [];
      let cursor = await index.openCursor(null, 'prev');
      while (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor = await cursor.continue();
      }
      await tx.done;
      return results;
    } catch (error) {
      this.logError('getLatest operation failed.', error);
      return this.memoryStore.slice(0, limit);
    }
  }

  async findByUrl(url: string, limit = 20): Promise<PastRequest[]> {
    try {
      if (this.useMemoryFallback) {
        return this.memoryStore.filter(item => item.url === url).slice(0, limit);
      }

      const db = await this.getDatabase();
      if (!db) {
        return this.memoryStore.filter(item => item.url === url).slice(0, limit);
      }

      const tx = db.transaction('pastRequests', 'readonly');
      const index = tx.store.index('by-url');
      const results: PastRequest[] = [];
      const range = IDBKeyRange.only(url);
      let cursor = await index.openCursor(range, 'prev');

      while (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor = await cursor.continue();
      }

      await tx.done;
      return results;
    } catch (error) {
      this.logError('findByUrl operation failed.', error);
      return this.memoryStore.filter(item => item.url === url).slice(0, limit);
    }
  }

  async delete(id: PastRequestKey): Promise<void> {
    try {
      if (this.useMemoryFallback) {
        this.memoryStore = this.memoryStore.filter(item => item.id !== id);
        return;
      }

      const db = await this.getDatabase();
      if (!db) {
        this.memoryStore = this.memoryStore.filter(item => item.id !== id);
        return;
      }

      const tx = db.transaction('pastRequests', 'readwrite');
      await tx.store.delete(id);
      await tx.done;
    } catch (error) {
      this.logError('delete operation failed.', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.useMemoryFallback) {
        this.memoryStore = [];
        this.memorySequence = 1;
        return;
      }

      const db = await this.getDatabase();
      if (!db) {
        this.memoryStore = [];
        this.memorySequence = 1;
        return;
      }

      const tx = db.transaction('pastRequests', 'readwrite');
      await tx.store.clear();
      await tx.done;
    } catch (error) {
      this.logError('clear operation failed.', error);
    }
  }

  private async getDatabase(): Promise<IDBPDatabase<ApiSandboxDB> | null> {
    await this.init();

    if (this.useMemoryFallback) {
      return null;
    }

    try {
      return await this.dbPromise!;
    } catch (error) {
      this.logError('Failed to resolve database instance. Switching to in-memory store.', error);
      this.enableMemoryFallback();
      return null;
    }
  }

  /* istanbul ignore next -- helper invoked only during IndexedDB migrations */
  private async ensureFields(
    store: IDBPObjectStore<ApiSandboxDB, ['pastRequests'], 'pastRequests', 'versionchange'>,
    defaults: Record<string, unknown>
  ): Promise<void> {
    let cursor = await store.openCursor();
    while (cursor) {
      const value = { ...cursor.value } as PastRequest & { id: PastRequestKey };
      let updated = false;

      const mutableValue = value as unknown as Record<string, unknown>;

      Object.entries(defaults).forEach(([field, defaultValue]) => {
        if (!(field in mutableValue)) {
          mutableValue[field] = defaultValue;
          updated = true;
        }
      });

      if (updated) {
        await cursor.update(value);
      }

      cursor = await cursor.continue();
    }
  }

  private enableMemoryFallback(): void {
    this.useMemoryFallback = true;
    this.initialized = true;
    this.dbPromise = undefined;
    this.memoryStore.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const maxId = this.memoryStore.reduce((max, item) => Math.max(max, item.id ?? 0), 0);
    this.memorySequence = maxId + 1;
  }

  private sortMemoryStore(): void {
    this.memoryStore.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  private logError(message: string, error?: unknown): void {
    if (error) {
      console.error(`[IDB] ${message}`, error);
    } else {
      console.warn(`[IDB] ${message}`);
    }
  }
}
