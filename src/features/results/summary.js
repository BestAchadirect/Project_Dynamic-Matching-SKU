export function summarizeStatuses(rows) {
  const counts = {
    MATCHED: 0,
    NO_MATCH: 0,
    AMBIGUOUS: 0,
    BLOCKED: 0
  };

  rows.forEach((row) => {
    if (counts[row.Status] !== undefined) {
      counts[row.Status] += 1;
    }
  });

  return `Total ${rows.length} | MATCHED ${counts.MATCHED} | NO_MATCH ${counts.NO_MATCH} | AMBIGUOUS ${counts.AMBIGUOUS} | BLOCKED ${counts.BLOCKED}`;
}
