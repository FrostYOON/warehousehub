import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      userId: string;
      companyId: string;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
