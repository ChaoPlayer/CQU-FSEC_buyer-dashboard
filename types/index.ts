import { Purchase, User } from "@prisma/client";

export type PurchaseWithUser = Purchase & {
  submittedBy: {
    id: string;
    email: string;
    name: string | null;
  };
};