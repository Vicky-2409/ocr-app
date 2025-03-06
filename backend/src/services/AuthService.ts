import jwt from "jsonwebtoken";
import { IUser } from "../models/User";
import { UserRepository } from "../repositories/UserRepository";
import { Messages } from "../constants/messages";

export class AuthService {
  private userRepository: UserRepository;
  private readonly JWT_SECRET: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<IUser> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    return this.userRepository.create(userData);
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error(Messages.AUTH.INVALID_CREDENTIALS);
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error(Messages.AUTH.INVALID_CREDENTIALS);
    }

    const token = this.generateToken(user);

    return {
      user,
      token,
    };
  }

  private generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      this.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );
  }

  verifyToken(token: string): { id: string; email: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as {
        id: string;
        email: string;
      };
    } catch (error) {
      throw new Error(Messages.AUTH.INVALID_TOKEN);
    }
  }
}
