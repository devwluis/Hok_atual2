import { Router, type IRouter } from "express";
import healthRouter from "./health";
import n8nRouter from "./n8n";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(n8nRouter);
router.use(chatRouter);

export default router;
