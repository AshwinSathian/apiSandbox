import { Injectable, Signal, signal } from "@angular/core";

export interface ResponseTimingPhases {
  redirect?: number;
  dns?: number;
  tcp?: number;
  tls?: number;
  request?: number;
  ttfb?: number;
  content?: number;
}

export interface ResponseTimingSizes {
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
}

export interface ResponseInspection {
  id: string;
  url: string;
  startTime: number;
  startEpoch: number;
  endTime: number;
  duration: number;
  phases?: ResponseTimingPhases;
  sizes?: ResponseTimingSizes;
  limitedByCors?: boolean;
}

interface PendingRequest {
  id: string;
  url: string;
  startTime: number;
  startEpoch: number;
}

@Injectable({
  providedIn: "root",
})
export class ResponseInspectorService {
  private readonly requests = new Map<string, PendingRequest>();
  private readonly inspectionSignal = signal<ResponseInspection | null>(null);

  get latest(): Signal<ResponseInspection | null> {
    return this.inspectionSignal.asReadonly();
  }

  markRequest(id: string, url: string): void {
    const startTime = performance.now();
    const startEpoch = performance.timeOrigin + startTime;
    this.requests.set(id, { id, url, startTime, startEpoch });
  }

  markResponse(id: string, url: string): void {
    const endTime = performance.now();
    const pending = this.requests.get(id) ?? {
      id,
      url,
      startTime: endTime,
      startEpoch: performance.timeOrigin + endTime,
    };

    const inspection: ResponseInspection = {
      id: pending.id,
      url: pending.url,
      startTime: pending.startTime,
      startEpoch: pending.startEpoch,
      endTime,
      duration: Math.max(0, endTime - pending.startTime),
    };

    const entry = this.findTimingEntry(url, endTime);
    if (entry) {
      const phases = this.buildPhases(entry);
      const sizes = this.buildSizes(entry);
      const duration = entry.responseEnd - entry.startTime;

      if (Number.isFinite(duration) && duration >= 0) {
        inspection.duration = duration;
      }

      if (phases) {
        inspection.phases = phases;
        inspection.limitedByCors = this.isCorsLimited(phases);
      } else {
        inspection.limitedByCors = true;
      }

      if (
        sizes.transferSize !== undefined ||
        sizes.encodedBodySize !== undefined ||
        sizes.decodedBodySize !== undefined
      ) {
        inspection.sizes = sizes;
      }
    } else {
      inspection.limitedByCors = true;
    }

    this.requests.delete(id);
    this.inspectionSignal.set(inspection);
  }

  private findTimingEntry(
    url: string,
    responseEndTime: number
  ): PerformanceResourceTiming | undefined {
    if (
      typeof performance.getEntriesByName !== "function" ||
      typeof performance.getEntriesByType !== "function"
    ) {
      return undefined;
    }

    const byName = performance
      .getEntriesByName(url)
      .filter((entry): entry is PerformanceResourceTiming =>
        this.isResourceTimingEntry(entry)
      );

    const entries =
      byName.length > 0
        ? byName
        : performance
            .getEntriesByType("resource")
            .filter((entry): entry is PerformanceResourceTiming =>
              this.isResourceTimingEntry(entry, url)
            );

    let closest: PerformanceResourceTiming | undefined;
    let smallestDelta = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
      const delta = Math.abs(entry.responseEnd - responseEndTime);
      if (delta < smallestDelta) {
        smallestDelta = delta;
        closest = entry;
      }
    }

    return closest;
  }

  private isResourceTimingEntry(
    entry: PerformanceEntry,
    url?: string
  ): entry is PerformanceResourceTiming {
    if (entry.entryType !== "resource") {
      return false;
    }
    if (!url) {
      return true;
    }
    return (
      entry.name === url ||
      entry.name === decodeURIComponent(url) ||
      entry.name.startsWith(url) ||
      url.startsWith(entry.name)
    );
  }

  private buildPhases(entry: PerformanceResourceTiming): ResponseTimingPhases | undefined {
    const phases: ResponseTimingPhases = {};

    const redirect = this.delta(entry.redirectStart, entry.redirectEnd);
    if (redirect > 0) {
      phases.redirect = redirect;
    }

    const dns = this.delta(entry.domainLookupStart, entry.domainLookupEnd);
    if (dns > 0) {
      phases.dns = dns;
    }

    const tcp = this.delta(entry.connectStart, entry.connectEnd);
    if (tcp > 0) {
      phases.tcp = tcp;
    }

    if (entry.secureConnectionStart > 0) {
      const tls = this.delta(entry.secureConnectionStart, entry.connectEnd);
      if (tls > 0) {
        phases.tls = tls;
      }
    }

    const request = this.delta(entry.connectEnd, entry.requestStart);
    if (request > 0) {
      phases.request = request;
    }

    const ttfb = this.delta(entry.requestStart, entry.responseStart);
    if (ttfb > 0) {
      phases.ttfb = ttfb;
    }

    const content = this.delta(entry.responseStart, entry.responseEnd);
    if (content > 0) {
      phases.content = content;
    }

    return Object.keys(phases).length ? phases : undefined;
  }

  private buildSizes(entry: PerformanceResourceTiming): ResponseTimingSizes {
    const sizes: ResponseTimingSizes = {};

    if (entry.transferSize && entry.transferSize > 0) {
      sizes.transferSize = entry.transferSize;
    }
    if (entry.encodedBodySize && entry.encodedBodySize > 0) {
      sizes.encodedBodySize = entry.encodedBodySize;
    }
    if (entry.decodedBodySize && entry.decodedBodySize > 0) {
      sizes.decodedBodySize = entry.decodedBodySize;
    }

    return sizes;
  }

  private delta(start: number, end: number): number {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return 0;
    }
    const value = end - start;
    return value > 0 ? value : 0;
  }

  private isCorsLimited(phases: ResponseTimingPhases): boolean {
    const granularKeys: (keyof ResponseTimingPhases)[] = [
      "redirect",
      "dns",
      "tcp",
      "tls",
      "request",
      "ttfb",
      "content",
    ];

    const available = granularKeys.filter((key) => phases[key] && phases[key]! > 0);
    return available.length <= 1;
  }
}
