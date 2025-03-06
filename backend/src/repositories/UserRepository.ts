import { IUser, IUserModel, User } from "../models/User";
import { BaseRepository } from "./BaseRepository";

export interface IUserRepository extends BaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

export class UserRepository
  extends BaseRepository<IUser>
  implements IUserRepository
{
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return (this.model as IUserModel).findByEmail(email);
  }
}
