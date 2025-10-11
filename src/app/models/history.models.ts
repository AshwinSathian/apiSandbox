export interface PastRequest {
  id?: number;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  createdAt: number;
  status?: number;
  durationMs?: number;
  error?: string;
}

export type PastRequestKey = number;
