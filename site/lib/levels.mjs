// School levels and the grades each one covers (Vietnam's bands: primary 1–5, middle 6–9, high 10–12).
export const LEVELS = [
  { key: 'primary', name: 'Primary school', grades: [1, 5], blurb: 'Grades 1–5, ages 6–11: first steps in science, short and hands-on.' },
  { key: 'middle', name: 'Middle school', grades: [6, 9], blurb: 'Grades 6–9, ages 11–15: models, measurements and the big ideas behind them.' },
  { key: 'high-school', name: 'High school', grades: [10, 12], blurb: 'Grades 10–12, ages 15–18: physics, chemistry, biology and Earth science labs.' },
];

export const levelOf = key => LEVELS.find(l => l.key === key);
export const gradeText = ([a, b]) => (a === b ? `Grade ${a}` : `Grades ${a}–${b}`);
