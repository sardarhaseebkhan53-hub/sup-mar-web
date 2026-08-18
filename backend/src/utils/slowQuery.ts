import mongoose from 'mongoose';

/**
 * Registers a Mongoose plugin that logs database operations exceeding a
 * configured latency threshold (in milliseconds). Enabled only when
 * SLOW_QUERY_THRESHOLD_MS is set, so it costs nothing by default.
 *
 * Safe by design: logs the collection + operation and elapsed time, never
 * query conditions or results (which could contain private data).
 */

let thresholdMs: number | null = null;

function parseThreshold(): number | null {
  const raw = process.env.SLOW_QUERY_THRESHOLD_MS;
  if (!raw) return null;
  const ms = Number(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

function reportSlow(operation: string, context: unknown, startedAt: number | undefined, rows: number) {
  if (!startedAt || thresholdMs === null) return;
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs < thresholdMs) return;
  const modelName = (context as { model?: { modelName?: string } })?.model?.modelName || 'unknown';
  console.warn(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    type: 'slow-query',
    collection: modelName,
    operation,
    latencyMs: elapsedMs,
    rows,
  }));
}

export function installSlowQueryDetection() {
  thresholdMs = parseThreshold();
  if (thresholdMs === null) return;

  mongoose.plugin((schema: mongoose.Schema) => {
    schema.pre(['find', 'countDocuments', 'aggregate'] as never, function slowQueryStart(next) {
      (this as unknown as { __qavlioStartedAt: number }).__qavlioStartedAt = Date.now();
      next();
    });
    schema.post('find', function slowQueryFindPost(docs) {
      const startedAt = (this as unknown as { __qavlioStartedAt: number }).__qavlioStartedAt;
      reportSlow('find', this, startedAt, docs?.length ?? 0);
    });
    schema.post('countDocuments', function slowQueryCountPost(count) {
      const startedAt = (this as unknown as { __qavlioStartedAt: number }).__qavlioStartedAt;
      reportSlow('countDocuments', this, startedAt, count ?? 0);
    });
    schema.post('aggregate', function slowQueryAggregatePost(docs) {
      const startedAt = (this as unknown as { __qavlioStartedAt: number }).__qavlioStartedAt;
      reportSlow('aggregate', this, startedAt, docs?.length ?? 0);
    });
  });
}
