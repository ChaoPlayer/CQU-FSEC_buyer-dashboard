import { Purchase, User, Status } from "@prisma/client";

export type PurchaseWithUser = Purchase & {
  submittedBy: {
    id: string;
    email: string;
    name: string | null;
    realName: string | null;
    group: string | null;
  };
  statusHistory?: Array<{
    id: string;
    status: Status;
    reason: string | null;
    createdBy: string | null;
    createdAt: Date;
  }>;
};