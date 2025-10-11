-- DropIndex
DROP INDEX `User_verificationToken_key` ON `User`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `resetPasswordToken` VARCHAR(191) NULL,
    ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL,
    MODIFY `name` VARCHAR(191) NULL;
