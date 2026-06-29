import { Router, type IRouter } from "express";
import healthRouter from "./health";
import n8nRouter from "./n8n";

const router: IRouter = Router();

router.use(healthRouter);
router.use(n8nRouter);

export default router;
