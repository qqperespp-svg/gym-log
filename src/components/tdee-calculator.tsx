"use client";

import { useMemo, useState } from "react";
import { Calculator, Save } from "lucide-react";
import { saveTdeeAction } from "@/actions/settings";

export function TdeeCalculator() {
  const [sex, setSex] = useState("m");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState("1.4");
  const [goal, setGoal] = useState("maintain");

  const result = useMemo(() => {
    const w = Number(weight) || 0;
    const h = Number(height) || 0;
    const a = Number(age) || 0;
    if (!w || !h || !a) return null;
    const bmr = sex === "m" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    let tdee = bmr * Number(activity);
    if (goal === "lose") tdee -= 400;
    if (goal === "gain") tdee += 300;
    tdee = Math.round(tdee / 10) * 10;
    const protein = Math.round(w * 2);
    const fat = Math.round(w);
    const carbs = Math.max(30, Math.round((tdee - protein * 4 - fat * 9) / 4));
    return { tdee, protein, fat, carbs };
  }, [sex, age, height, weight, activity, goal]);

  const input = "input";
  return (
    <form action={saveTdeeAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="sex" value={sex} />
      <input type="hidden" name="age" value={age} />
      <input type="hidden" name="height" value={height} />
      <input type="hidden" name="weight" value={weight} />
      <input type="hidden" name="activity" value={activity} />
      <input type="hidden" name="goal" value={goal} />
      <label className="field-label">
        Płeć
        <select className={input} value={sex} onChange={(e) => setSex(e.target.value)}>
          <option value="m">Mężczyzna</option>
          <option value="f">Kobieta</option>
        </select>
      </label>
      <label className="field-label">
        Wiek
        <input className={input} type="number" value={age} onFocus={(e) => e.target.select()} onChange={(e) => setAge(e.target.value)} />
      </label>
      <label className="field-label">
        Wzrost (cm)
        <input className={input} type="number" value={height} onFocus={(e) => e.target.select()} onChange={(e) => setHeight(e.target.value)} />
      </label>
      <label className="field-label">
        Waga (kg)
        <input className={input} type="number" value={weight} onFocus={(e) => e.target.select()} onChange={(e) => setWeight(e.target.value)} />
      </label>
      <label className="field-label">
        Aktywność
        <select className={input} value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="1.2">Siedzący (1.2)</option>
          <option value="1.375">Lekka (1.375)</option>
          <option value="1.55">Umiarkowana (1.55)</option>
          <option value="1.725">Wysoka (1.725)</option>
          <option value="1.9">Bardzo wysoka (1.9)</option>
        </select>
      </label>
      <label className="field-label">
        Cel
        <select className={input} value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="lose">Redukcja (-400 kcal)</option>
          <option value="maintain">Utrzymanie</option>
          <option value="gain">Masa (+300 kcal)</option>
        </select>
      </label>

      {result && (
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.07] p-4 sm:col-span-2 lg:col-span-3">
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <Calculator size={16} className="text-lime-400" />
            TDEE: <b className="text-xl text-lime-300">{result.tdee.toLocaleString("pl-PL")} kcal</b>
            <span className="text-xs text-slate-500">
              · B {result.protein} g · T {result.fat} g · W {result.carbs} g
            </span>
          </p>
          <button type="submit" className="button-primary mt-3">
            <Save size={17} /> Zastosuj jako cele na każdy dzień
          </button>
        </div>
      )}
    </form>
  );
}
