-- CreateTable
CREATE TABLE "Team" (
    "stdName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "textChannelId" TEXT NOT NULL,
    "voiceChannelId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("stdName")
);

-- CreateTable
CREATE TABLE "Hacker" (
    "discordId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "teamStdName" TEXT,

    CONSTRAINT "Hacker_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "Invite" (
    "inviteeId" TEXT NOT NULL,
    "teamStdName" TEXT NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("inviteeId","teamStdName")
);

-- CreateTable
CREATE TABLE "DiscordCategory" (
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "DiscordCategory_pkey" PRIMARY KEY ("categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_stdName_key" ON "Team"("stdName");

-- CreateIndex
CREATE UNIQUE INDEX "Hacker_discordId_key" ON "Hacker"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Hacker_email_key" ON "Hacker"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_inviteeId_teamStdName_key" ON "Invite"("inviteeId", "teamStdName");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordCategory_categoryId_key" ON "DiscordCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DiscordCategory"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hacker" ADD CONSTRAINT "Hacker_teamStdName_fkey" FOREIGN KEY ("teamStdName") REFERENCES "Team"("stdName") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Hacker"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_teamStdName_fkey" FOREIGN KEY ("teamStdName") REFERENCES "Team"("stdName") ON DELETE CASCADE ON UPDATE CASCADE;
