import { Router } from "express";
import authRoutes from "./authRoutes";
import partnersRoutes from "./partners.routes";
import leadsRoutes from "./leads.routes";
import clientsRoutes from "./clients.routes";
import paymentsRoutes from "./payments.routes";
import adminRoutes from "./adminRoutes";
import partnerDashboardRoutes from "./partnerDashboard.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/partners", partnersRoutes);
router.use("/leads", leadsRoutes);
router.use("/clients", clientsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/admin", adminRoutes);
router.use("/partner", partnerDashboardRoutes);

export default router;
