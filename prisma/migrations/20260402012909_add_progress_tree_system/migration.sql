-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "maxLimit" REAL DEFAULT 10000,
    "approvalLimit" REAL DEFAULT 0,
    "realName" TEXT,
    "studentId" TEXT,
    "group" TEXT,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "processorContact" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "buyLink" TEXT,
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "fileName" TEXT,
    "note" TEXT,
    "materialCategory" TEXT,
    "hasInvoice" BOOLEAN,
    "isAdvancedPayment" BOOLEAN,
    "advancerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseStatusHistory_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedHours" REAL,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HourRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HourRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HourRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WorkSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "firstPunch" DATETIME,
    "lastPunch" DATETIME,
    "totalHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgressTree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressTree_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BRANCH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "versionNumber" INTEGER,
    "submitterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mergedAt" DATETIME,
    "mergedById" TEXT,
    "hoursAwarded" REAL,
    "hourRecordId" TEXT,
    "parentVersionId" TEXT,
    "seasonKept" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TreeVersion_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "ProgressTree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TreeVersion_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TreeVersion_mergedById_fkey" FOREIGN KEY ("mergedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TreeVersion_hourRecordId_fkey" FOREIGN KEY ("hourRecordId") REFERENCES "HourRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TreeVersion_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "TreeVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeasonSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedById" TEXT NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeasonSettlement_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InviteCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamGroup_name_key" ON "TeamGroup"("name");

-- CreateIndex
CREATE INDEX "WorkSubmission_userId_idx" ON "WorkSubmission"("userId");

-- CreateIndex
CREATE INDEX "WorkSubmission_status_idx" ON "WorkSubmission"("status");

-- CreateIndex
CREATE INDEX "HourRecord_userId_idx" ON "HourRecord"("userId");

-- CreateIndex
CREATE INDEX "HourRecord_type_idx" ON "HourRecord"("type");

-- CreateIndex
CREATE INDEX "HourRecord_date_idx" ON "HourRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceSummary_employeeNo_idx" ON "AttendanceSummary"("employeeNo");

-- CreateIndex
CREATE INDEX "AttendanceSummary_date_idx" ON "AttendanceSummary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSummary_employeeNo_date_key" ON "AttendanceSummary"("employeeNo", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TreeVersion_hourRecordId_key" ON "TreeVersion"("hourRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_isUsed_idx" ON "InviteCode"("isUsed");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");
