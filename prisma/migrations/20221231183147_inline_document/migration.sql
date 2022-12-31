/*
  Warnings:

  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `docVersion` to the `Tree` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Document";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "docVersion" TEXT NOT NULL
);
INSERT INTO "new_Tree" ("id", "name", "version") SELECT "id", "name", "version" FROM "Tree";
DROP TABLE "Tree";
ALTER TABLE "new_Tree" RENAME TO "Tree";
CREATE UNIQUE INDEX "Tree_name_key" ON "Tree"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
