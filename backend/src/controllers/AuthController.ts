import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { HttpStatus } from "../types/http";
import { Messages } from "../constants/messages";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      const user = await this.authService.register({ email, password, name });

      res.status(HttpStatus.CREATED).json({
        success: true,
        message: Messages.AUTH.REGISTER_SUCCESS,
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : Messages.GENERAL.SERVER_ERROR,
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const { user, token } = await this.authService.login(email, password);

      res.status(HttpStatus.OK).json({
        success: true,
        message: Messages.AUTH.LOGIN_SUCCESS,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
          },
        },
      });
    } catch (error) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : Messages.GENERAL.SERVER_ERROR,
      });
    }
  };
}
