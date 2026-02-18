-- CreateIndex
CREATE INDEX "Item_companyId_idx" ON "Item"("companyId");

-- CreateIndex
CREATE INDEX "Item_itemCode_idx" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "PickAllocation_companyId_pickedByUserId_idx" ON "PickAllocation"("companyId", "pickedByUserId");

-- CreateIndex
CREATE INDEX "PickAllocation_companyId_outboundLineId_idx" ON "PickAllocation"("companyId", "outboundLineId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");
