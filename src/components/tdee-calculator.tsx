"use client";

import { useMemo, useState } from "react";
import { Calculator, Dumbbell, Save, Sofa } from "lucide-react";
import { saveTdeeAction } from "@/actions/settings";

const PRESETS: Record<string, { p: number; c: number; f: number; label: string }> = {
  standard: { p: 30, c: 40, f: 30, label: "Standard 30/40/30" },
  highProtein: { p: 40, c: 30, f: 30, label: "Wysokobiałkowe 40/30/30" },
  lowCarb: { p: 35, c: 20, f: 45, label: "Niskowęgl. 35/20/45" },
  highCarb: { p: 25, c: 55, f: 20, label: "Wysokowęgl. 25/55/20" },
};

export function TdeeCalculator() {
  const [sex, setSex] = useState("m");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState("1.4");
  const [goal, setGoal] = useState("maintain");
  const [p, setP] = useState("30");
  const [c, setC] = useState("40");
  const [f, setF] = useState("30");
  const [trainingBonus, setTrainingBonus] = useState("200");
  const [restProtein, setRestProtein] = useState("");
  const [restFat, setRestFat] = useState("");
  const [restCarbs, setRestCarbs] = useState("");
  const [trainingProtein, setTrainingProtein] = useState("");
  const [trainingFat, setTrainingFat] = useState("");
  const [trainingCarbs, setTrainingCarbs] = useState("");

  const result = useMemo(() => {
    const w = Number(weight) || 0;
    const h = Number(height) || 0;
    const a = Number(age) || 0;
    if (!w || !h || !a) return null;
    const bmr = sex === "m" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    let base = bmr * Number(activity);
    if (goal === "lose") base -= 400;
    if (goal === "gain") base += 300;
    const rest = Math.round(base / 10) * 10;
    const bonus = Math.max(0, Math.round(Number(trainingBonus) || 0));
    const training = rest + bonus;

    const pp = Math.max(5, Math.min(70, Number(p) || 30));
    const cc = Math.max(5, Math.min(80, Number(c) || 40));
    const ff = Math.max(5, Math.min(70, Number(f) || 30));
    const total = pp + cc + ff || 1;
    const macros = (kcal: number) => ({
      protein: Math.round((kcal * (pp / total)) / 4),
      fat: Math.round((kcal * (ff / total)) / 9),
      carbs: Math.round((kcal * (cc / total)) / 4),
    });
    return { rest, training, bonus, macrosRest: macros(rest), macrosTraining: macros(training) };
  }, [sex, age, height, weight, activity, goal, p, c, f, trainingBonus]);

  function applyPreset(key: string) {
    const pr = PRESETS[key];
    if (!pr) return;
    setP(String(pr.p));
    setC(String(pr.c));
    setF(String(pr.f));
  }

  const input = "input";

  return (
    <form action={saveTdeeAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="sex" value={sex} />
        <input type="hidden" name="age" value={age} />
        <input type="hidden" name="height" value={height} />
        <input type="hidden" name="weight" value={weight} />
        <input type="hidden" name="activity" value={activity} />
        <input type="hidden" name="goal" value={goal} />
        <input type="hidden" name="proteinPct" value={p} />
        <input type="hidden" name="carbsPct" value={c} />
        <input type="hidden" name="fatPct" value={f} />
        <input type="hidden" name="trainingBonus" value={trainingBonus} />
        <input type="hidden" name="restProtein" value={restProtein} />
        <input type="hidden" name="restFat" value={restFat} />
        <input type="hidden" name="restCarbs" value={restCarbs} />
        <input type="hidden" name="trainingProtein" value={trainingProtein} />
        <input type="hidden" name="trainingFat" value={trainingFat} />
        <input type="hidden" name="trainingCarbs" value={trainingCarbs} />
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
      </div>

      {/* Proporcje makro */}
      <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-lime-400">
          Stosunek białko / węglowodany / tłuszcze (% kalorii)
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, pr]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                p === String(pr.p) && c === String(pr.c) && f === String(pr.f)
                  ? "bg-lime-400 text-slate-950"
                  : "bg-white/[.05] text-slate-400 hover:text-slate-200"
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field-label">
            Białko (%)
            <input className={input} type="number" min="5" max="70" step="1" value={p} onFocus={(e) => e.target.select()} onChange={(e) => setP(e.target.value)} />
          </label>
          <label className="field-label">
            Węglowodany (%)
            <input className={input} type="number" min="5" max="80" step="1" value={c} onFocus={(e) => e.target.select()} onChange={(e) => setC(e.target.value)} />
          </label>
          <label className="field-label">
            Tłuszcze (%)
            <input className={input} type="number" min="5" max="70" step="1" value={f} onFocus={(e) => e.target.select()} onChange={(e) => setF(e.target.value)} />
          </label>
        </div>
      </div>

      {/* Kaloryka treningowa / wolna */}
      <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-sky-400">
          Kaloryka: dzień treningowy vs dzień wolny
        </p>
        <label className="field-label">
          Dodatek na dzień treningowy (kcal)
          <input className={`${input} mt-1`} type="number" min="0" max="800" step="50" value={trainingBonus} onFocus={(e) => e.target.select()} onChange={(e) => setTrainingBonus(e.target.value)} />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Dni oznaczone jako „treningowe" w celach dostaną podwyższoną kalorykę — reszta bazową.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MacroOverride title="Ręczne makro — dzień wolny" values={[restProtein, restFat, restCarbs]} setters={[setRestProtein, setRestFat, setRestCarbs]} />
          <MacroOverride title="Ręczne makro — dzień treningowy" values={[trainingProtein, trainingFat, trainingCarbs]} setters={[setTrainingProtein, setTrainingFat, setTrainingCarbs]} />
        </div>
      </div>

      {result && (

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-lime-400/25 bg-lime-400/[.07] p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-lime-300">
              <Dumbbell size={14} /> Dzień treningowy
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {result.training.toLocaleString("pl-PL")} <span className="text-sm text-slate-500">kcal</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              B {result.macrosTraining.protein} g · T {result.macrosTraining.fat} g · W {result.macrosTraining.carbs} g
            </p>
          </div>
          <div className="rounded-2xl border border-sky-400/25 bg-sky-400/[.07] p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300">
              <Sofa size={14} /> Dzień wolny
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {result.rest.toLocaleString("pl-PL")} <span className="text-sm text-slate-500">kcal</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              B {result.macrosRest.protein} g · T {result.macrosRest.fat} g · W {result.macrosRest.carbs} g
            </p>
          </div>
          <button type="submit" className="button-primary sm:col-span-2 justify-center">
            <Save size={17} /> Zastosuj jako cele na każdy dzień
          </button>
        </div>
      )}

      <p className="text-xs text-slate-600">
        <Calculator size={13} className="inline" /> Białko i tłuszcze w gramach liczone z proporcji: B = kcal×P%/4, T = kcal×T%/9, W = kcal×W%/4.
      </p>
    </form>
  );
}

function MacroOverride({ title, values, setters }: { title: string; values: string[]; setters: Array<(value: string) => void> }) {
  return <div className="rounded-xl border border-white/[.06] p-3"><p className="mb-2 text-xs font-bold text-slate-400">{title}</p><div className="grid grid-cols-3 gap-2">{["Białko", "Tłuszcze", "Węglowodany"].map((label, i) => <label key={label} className="text-[10px] text-slate-500">{label}<input className="input mt-1 !min-h-9 !px-2" type="number" min="0" step="0.1" value={values[i]} onChange={e => setters[i](e.target.value)} /></label>)}</div></div>;
}
