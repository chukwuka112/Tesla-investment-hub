import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db, investmentPlansTable } from "@workspace/db";

const router: IRouter = Router();

function formatPlan(p: typeof investmentPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    model_name: p.model_name,
    image_url: p.image_url,
    min_amount: parseFloat(p.min_amount),
    max_amount: parseFloat(p.max_amount),
    roi_percentage: parseFloat(p.roi_percentage),
    duration_days: p.duration_days,
    description: p.description,
    status: p.status,
    display_order: p.display_order,
    created_at: p.created_at.toISOString(),
  };
}

router.get("/plans", async (_req: Request, res: Response): Promise<void> => {
  const plans = await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.status, "active")).orderBy(asc(investmentPlansTable.display_order));
  res.json(plans.map(formatPlan));
});

export { formatPlan };
export default router;
