import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import plansRouter from "./plans";
import investmentsRouter from "./investments";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import referralsRouter from "./referrals";
import giftCodesRouter from "./gift_codes";
import notificationsRouter from "./notifications";
import announcementsRouter from "./announcements";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(plansRouter);
router.use(investmentsRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(referralsRouter);
router.use(giftCodesRouter);
router.use(notificationsRouter);
router.use(announcementsRouter);
router.use(adminRouter);

export default router;
