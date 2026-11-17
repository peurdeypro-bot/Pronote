const minuteLimit = 2;
const dailyLimit = 10;
const minuteWindowMs = 60_000;

export function consumeWidgetQuota(address, { now = Date.now(), quotas = new Map() } = {}) {
  const today = new Date(now).toISOString().slice(0, 10);
  for (const [key, record] of quotas) {
    if (now - record.updatedAt > 48 * 60 * 60 * 1000) quotas.delete(key);
  }
  while (quotas.size >= 10_000 && !quotas.has(address)) {
    quotas.delete(quotas.keys().next().value);
  }

  const record = quotas.get(address) || { day: today, dailyCount: 0, minuteTimestamps: [], updatedAt: now };
  if (record.day !== today) {
    record.day = today;
    record.dailyCount = 0;
  }
  record.minuteTimestamps = record.minuteTimestamps.filter((timestamp) => now - timestamp < minuteWindowMs);
  record.updatedAt = now;

  if (record.dailyCount >= dailyLimit) {
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    const retryAfter = Math.max(1, Math.ceil((nextDay.getTime() - now) / 1000));
    quotas.set(address, record);
    return {
      allowed: false,
      retryAfter,
      error: 'Quota quotidien atteint ! Reviens demain.'
    };
  }

  if (record.minuteTimestamps.length >= minuteLimit) {
    const retryAfter = Math.max(1, Math.ceil((record.minuteTimestamps[0] + minuteWindowMs - now) / 1000));
    quotas.set(address, record);
    return {
      allowed: false,
      retryAfter,
      error: 'Doucement ! Attends une minute avant de générer un autre widget.'
    };
  }

  record.minuteTimestamps.push(now);
  record.dailyCount += 1;
  quotas.set(address, record);
  return { allowed: true };
}
