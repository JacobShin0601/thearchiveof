/** Summarize path-classified 4xx/5xx rows for ops dashboards and tests. */
export function summarizeErrorOps({ detailRows = [], serverRows = [] } = {}) {
  const byClass = new Map();
  const byStatus = new Map();
  for (const row of detailRows) {
    const requests = Number(row.requests ?? 0);
    const klass = row.class || 'other';
    const status = Number(row.status);
    byClass.set(klass, (byClass.get(klass) ?? 0) + requests);
    if (Number.isInteger(status)) byStatus.set(status, (byStatus.get(status) ?? 0) + requests);
  }
  const serverTotal = serverRows.reduce((sum, row) => sum + Number(row.requests ?? 0), 0);
  const classTotal = [...byClass.values()].reduce((sum, value) => sum + value, 0);
  const scanner = byClass.get('scanner') ?? 0;
  const content = byClass.get('content') ?? 0;
  return {
    byClass: [...byClass.entries()]
      .map(([className, requests]) => ({ class: className, requests }))
      .sort((a, b) => b.requests - a.requests),
    byStatus: [...byStatus.entries()]
      .map(([status, requests]) => ({ status, requests }))
      .sort((a, b) => b.requests - a.requests),
    topDetails: [...detailRows]
      .sort((a, b) => Number(b.requests ?? 0) - Number(a.requests ?? 0))
      .slice(0, 30),
    topServerErrors: [...serverRows]
      .sort((a, b) => Number(b.requests ?? 0) - Number(a.requests ?? 0))
      .slice(0, 20),
    totals: {
      classified4xx: classTotal,
      scanner4xx: scanner,
      content4xx: content,
      scannerShare: classTotal > 0 ? scanner / classTotal : null,
      contentShare: classTotal > 0 ? content / classTotal : null,
      serverErrors: serverTotal,
    },
  };
}
