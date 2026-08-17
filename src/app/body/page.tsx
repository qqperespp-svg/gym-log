import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { desc, eq } from "drizzle-orm";
import BodyForm from "./BodyForm";
import BodyProgress from "./BodyProgress";
import BodyHistory from "./BodyHistory";

export default async function BodyPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const measurements = await db.select().from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(desc(bodyMeasurements.date));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Pomiary ciała</h2>
        <p className="text-slate-400 text-sm mt-1">Śledź swój wzrost, wagę i obwody części ciała.</p>
      </div>

      <BodyForm />

      <BodyProgress measurements={measurements} />

      <BodyHistory measurements={measurements} />
    </div>
  );
}
