export function scoreOnTwenty(grade) {
  const value = Number(String(grade.value || '').replace(',', '.'));
  const outOf = Number(String(grade.outOf || '20').replace(',', '.'));
  return Number.isFinite(value) && Number.isFinite(outOf) && outOf > 0 ? value / outOf * 20 : null;
}

export function weeklyGradeAverages(grades) {
  const weeks = new Map();
  grades.forEach((grade) => {
    const score = scoreOnTwenty(grade);
    if (score === null || !/^\d{4}-\d{2}-\d{2}$/.test(grade.date || '')) return;
    const date = new Date(`${grade.date}T12:00:00`);
    const [year, month, day] = grade.date.split('-').map(Number);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year
      || date.getMonth() + 1 !== month || date.getDate() !== day) return;
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const start = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const current = weeks.get(start) || { total: 0, count: 0 };
    current.total += score;
    current.count += 1;
    weeks.set(start, current);
  });
  return [...weeks]
    .map(([start, values]) => ({ start, average: values.total / values.count }))
    .sort((first, second) => first.start.localeCompare(second.start));
}
