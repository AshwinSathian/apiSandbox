import { IdbService } from './idb.service';
import { PastRequest } from '../models/history.models';

const createRequest = (overrides: Partial<PastRequest> = {}): PastRequest => ({
  method: 'GET',
  url: 'https://example.com/api',
  headers: {},
  createdAt: Date.now(),
  ...overrides,
});

describe('IdbService', () => {
  let service: IdbService;

  beforeEach(async () => {
    service = new IdbService();
    await service.init();
    await service.clear();
  });

  it('adds and retrieves requests by id', async () => {
    const key = await service.add(createRequest({ url: 'https://example.com/1' }));
    expect(typeof key).toBe('number');

    const stored = await service.get(key!);
    expect(stored?.url).toBe('https://example.com/1');
  });

  it('returns latest requests ordered by createdAt', async () => {
    await service.add(createRequest({ url: 'https://example.com/old', createdAt: 1 }));
    await service.add(createRequest({ url: 'https://example.com/new', createdAt: 5 }));

    const latest = await service.getLatest();
    expect(latest[0]?.url).toBe('https://example.com/new');
    expect(latest[1]?.url).toBe('https://example.com/old');
  });

  it('filters requests by url', async () => {
    await service.add(createRequest({ url: 'https://match.me' }));
    await service.add(createRequest({ url: 'https://other.com' }));
    await service.add(createRequest({ url: 'https://match.me', createdAt: 999 }));

    const matches = await service.findByUrl('https://match.me');
    expect(matches.length).toBe(2);
    expect(matches[0]?.url).toBe('https://match.me');
  });

  it('deletes and clears requests', async () => {
    const key = await service.add(createRequest({ url: 'https://delete.me' }));
    await service.delete(key!);
    expect(await service.get(key!)).toBeNull();

    await service.add(createRequest({ url: 'https://clear.me' }));
    await service.clear();
    expect(await service.getLatest()).toEqual([]);
  });

  it('falls back to memory branches when database handles return null', async () => {
    const svc = new IdbService();
    spyOn(svc, 'init').and.returnValue(Promise.resolve());
    (svc as any).useMemoryFallback = false;
    spyOn(svc as any, 'getDatabase').and.resolveTo(null);

    const key = await svc.add(createRequest({ url: 'https://fallback-again' }));
    expect(key).toBe(1);
    expect((await svc.getLatest()).length).toBe(1);

    await svc.delete(key!);
    expect(await svc.getLatest()).toEqual([]);

    await svc.add(createRequest({ url: 'https://refill' }));
    await svc.clear();
    expect(await svc.getLatest()).toEqual([]);
  });

  it('logs errors when IDB operations throw', async () => {
    const svc = new IdbService();
    spyOn(svc, 'init').and.returnValue(Promise.resolve());
    (svc as any).useMemoryFallback = false;
    const error = new Error('boom');
    const originalError = console.error;
    const errorSpy = spyOn(console, 'error');
    spyOn(svc as any, 'getDatabase').and.rejectWith(error);

    expect(await svc.get(1)).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[IDB] get operation failed.', error);
    errorSpy.calls.reset();

    await svc.getLatest();
    expect(console.error).toHaveBeenCalledWith('[IDB] getLatest operation failed.', error);
    errorSpy.calls.reset();

    await svc.findByUrl('https://example.com');
    expect(console.error).toHaveBeenCalledWith('[IDB] findByUrl operation failed.', error);
    errorSpy.calls.reset();

    await svc.delete(1);
    expect(console.error).toHaveBeenCalledWith('[IDB] delete operation failed.', error);
    errorSpy.calls.reset();

    await svc.clear();
    expect(console.error).toHaveBeenCalledWith('[IDB] clear operation failed.', error);
    errorSpy.and.callThrough();
    console.error = originalError;
  });

  it('handles rejected database promises by switching to memory', async () => {
    const svc = new IdbService();
    spyOn(svc, 'init').and.returnValue(Promise.resolve());
    (svc as any).useMemoryFallback = false;
    const error = new Error('resolve failed');
    const originalError = console.error;
    const errorSpy = spyOn(console, 'error');
    (svc as any).dbPromise = Promise.reject(error);

    const result = await (svc as any).getDatabase();
    expect(result).toBeNull();
    expect(errorSpy.calls.mostRecent().args[0]).toBe('[IDB] Failed to resolve database instance. Switching to in-memory store.');
    errorSpy.and.callThrough();
    console.error = originalError;
  });
});

describe('IdbService memory fallback', () => {
  const originalIndexedDB = globalThis.indexedDB;

  afterEach(() => {
    (globalThis as any).indexedDB = originalIndexedDB;
  });

  it('uses in-memory storage when indexedDB is unavailable', async () => {
    delete (globalThis as unknown as Record<string, unknown>).indexedDB;
    const service = new IdbService();

    await service.init();
    const key = await service.add(createRequest({ url: 'https://memory-only', createdAt: 42 }));
    expect(key).toBe(1);

    const latest = await service.getLatest();
    expect(latest.length).toBe(1);
    expect(latest[0]?.url).toBe('https://memory-only');

    await service.delete(key!);
    expect(await service.getLatest()).toEqual([]);
  });
});
