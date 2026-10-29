// Vital signs: validation, adult flagging and BMI. Pure — safe on server and client.
//
// The flag thresholds are common ADULT screening cut-offs, for highlighting values only —
// not a diagnosis. A real hospital should set these from its own clinical protocols.
// Children have different normal ranges, so under-18s are NOT flagged.

// min/max are plausibility limits that catch typos (e.g. 370 instead of 37.0)
export const VITAL_FIELDS = [
  { key: "systolic", label: "Systolic BP", unit: "mmHg", min: 50, max: 260, int: true },
  { key: "diastolic", label: "Diastolic BP", unit: "mmHg", min: 30, max: 160, int: true },
  { key: "temperature", label: "Temperature", unit: "°C", min: 30, max: 45 },
  { key: "pulse", label: "Pulse", unit: "bpm", min: 20, max: 250, int: true },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min", min: 4, max: 80, int: true },
  { key: "spo2", label: "SpO₂", unit: "%", min: 50, max: 100, int: true },
  { key: "weightKg", label: "Weight", unit: "kg", min: 0.5, max: 400 },
  { key: "heightCm", label: "Height", unit: "cm", min: 30, max: 250 },
  { key: "glucose", label: "Blood glucose (random)", unit: "mmol/L", min: 0.5, max: 50 },
];

export function parseVitalsForm(formData) {
  const data = {};

  for (const f of VITAL_FIELDS) {
    const raw = String(formData.get(f.key) ?? "").trim();
    if (raw === "") {
      data[f.key] = null;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < f.min || value > f.max) {
      return { error: `${f.label} must be between ${f.min} and ${f.max} ${f.unit}.` };
    }
    data[f.key] = f.int ? Math.round(value) : Math.round(value * 10) / 10;
  }

  if ((data.systolic === null) !== (data.diastolic === null)) {
    return { error: "Enter both systolic and diastolic blood pressure." };
  }
  if (data.systolic !== null && data.systolic <= data.diastolic) {
    return { error: "Systolic pressure must be higher than diastolic." };
  }
  if (VITAL_FIELDS.every((f) => data[f.key] === null)) {
    return { error: "Enter at least one measurement." };
  }

  data.notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  return { data };
}

// Returns { paediatric, flags: [{ field, level: "low" | "high" | "critical", message }] }
export function assessVitals(v, ageYears) {
  if (ageYears < 18) return { paediatric: true, flags: [] };

  const flags = [];
  const add = (field, level, message) => flags.push({ field, level, message });
  const has = (x) => x !== null && x !== undefined;

  if (has(v.systolic) && has(v.diastolic)) {
    if (v.systolic >= 180 || v.diastolic >= 120) add("bp", "critical", "Very high blood pressure");
    else if (v.systolic >= 140 || v.diastolic >= 90) add("bp", "high", "High blood pressure");
    else if (v.systolic < 90 || v.diastolic < 60) add("bp", "low", "Low blood pressure");
  }

  if (has(v.temperature)) {
    if (v.temperature >= 40) add("temperature", "critical", "Very high fever");
    else if (v.temperature >= 38) add("temperature", "high", "Fever");
    else if (v.temperature < 35) add("temperature", "critical", "Low body temperature");
  }

  if (has(v.pulse)) {
    if (v.pulse > 130) add("pulse", "critical", "Very fast pulse");
    else if (v.pulse > 100) add("pulse", "high", "Fast pulse");
    else if (v.pulse < 50) add("pulse", "low", "Slow pulse");
  }

  if (has(v.respiratoryRate)) {
    if (v.respiratoryRate > 30) add("respiratoryRate", "critical", "Very fast breathing");
    else if (v.respiratoryRate > 20) add("respiratoryRate", "high", "Fast breathing");
    else if (v.respiratoryRate < 12) add("respiratoryRate", "low", "Slow breathing");
  }

  if (has(v.spo2)) {
    if (v.spo2 < 90) add("spo2", "critical", "Very low oxygen");
    else if (v.spo2 < 94) add("spo2", "low", "Low oxygen");
  }

  if (has(v.glucose)) {
    if (v.glucose < 3) add("glucose", "critical", "Very low blood sugar");
    else if (v.glucose < 4) add("glucose", "low", "Low blood sugar");
    else if (v.glucose >= 11.1) add("glucose", "high", "High blood sugar");
  }

  return { paediatric: false, flags };
}

// WHO adult BMI categories
export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  const value = Math.round((weightKg / (m * m)) * 10) / 10;
  const category = value < 18.5 ? "Underweight" : value < 25 ? "Normal" : value < 30 ? "Overweight" : "Obese";
  return { value, category };
}
