-- DropForeignKey
ALTER TABLE "WorkflowStep" DROP CONSTRAINT "WorkflowStep_workflowId_fkey";

-- AlterTable
ALTER TABLE "AffiliateLink" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "conversionId" TEXT;

-- AlterTable
ALTER TABLE "Conversion" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "GeneratedVideo" ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TokenUsage" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "AIJob_userId_createdAt_idx" ON "AIJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIJob_status_idx" ON "AIJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_name_key" ON "AIProvider"("name");

-- CreateIndex
CREATE INDEX "AIProvider_type_enabled_idx" ON "AIProvider"("type", "enabled");

-- CreateIndex
CREATE INDEX "AffiliateLink_creatorId_idx" ON "AffiliateLink"("creatorId");

-- CreateIndex
CREATE INDEX "AffiliateLink_productId_idx" ON "AffiliateLink"("productId");

-- CreateIndex
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");

-- CreateIndex
CREATE INDEX "Click_affiliateLinkId_createdAt_idx" ON "Click"("affiliateLinkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_conversionId_key" ON "Commission"("conversionId");

-- CreateIndex
CREATE INDEX "Commission_userId_createdAt_idx" ON "Commission"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_orderId_key" ON "Conversion"("orderId");

-- CreateIndex
CREATE INDEX "Conversion_affiliateLinkId_createdAt_idx" ON "Conversion"("affiliateLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedContent_userId_createdAt_idx" ON "GeneratedContent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedVideo_userId_createdAt_idx" ON "GeneratedVideo"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payout_walletId_requestedAt_idx" ON "Payout"("walletId", "requestedAt");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Product_campaignId_idx" ON "Product"("campaignId");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenUsage_jobId_key" ON "TokenUsage"("jobId");

-- CreateIndex
CREATE INDEX "TokenUsage_userId_date_idx" ON "TokenUsage"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Workflow_userId_idx" ON "Workflow"("userId");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "Conversion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

