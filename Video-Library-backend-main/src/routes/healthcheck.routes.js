import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controllers.js";

const router = Router();

router.route("/check").get(healthCheck);

export { router };
