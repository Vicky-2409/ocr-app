import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { validateRegistration, validateLogin } from "../middleware/validation";

const router = Router();
const authController = new AuthController();

router.post("/register", validateRegistration, authController.register);
router.post("/login", validateLogin, authController.login);

export default router;
