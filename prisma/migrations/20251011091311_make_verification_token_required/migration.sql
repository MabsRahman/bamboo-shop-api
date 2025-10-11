/*
  Warnings:

  - Made the column `verificationToken` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `verificationToken` VARCHAR(191) NOT NULL;
