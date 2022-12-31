/*
  Warnings:

  - You are about to drop the `Key` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_KeyToTree` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Key";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_KeyToTree";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AccessKeyToTree" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AccessKeyToTree_A_fkey" FOREIGN KEY ("A") REFERENCES "AccessKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AccessKeyToTree_B_fkey" FOREIGN KEY ("B") REFERENCES "Tree" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_AccessKeyToTree_AB_unique" ON "_AccessKeyToTree"("A", "B");

-- CreateIndex
CREATE INDEX "_AccessKeyToTree_B_index" ON "_AccessKeyToTree"("B");
