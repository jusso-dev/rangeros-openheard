import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createDb, user } from "@openheard/db";
import { and, eq, isNull } from "drizzle-orm";

// Keep feedback IDs stable: posts, votes and admin memberships reference them.
// Only a verified Clerk primary email can claim an unlinked legacy account.
export async function resolveClerkUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const db = createDb();
  const [linked] = await db.select().from(user).where(eq(user.clerkId, userId)).limit(1);
  if (linked) return linked;

  const { env } = await import("@openheard/env/server");
  const profile = await clerkClient({ secretKey: (env as unknown as { CLERK_SECRET_KEY: string }).CLERK_SECRET_KEY }).users.getUser(userId);
  const email = profile.emailAddresses.find((e) => e.id === profile.primaryEmailAddressId);
  const verified = email?.verification?.status === "verified";
  // RangerOS also has username-only Clerk accounts. Keep the database email
  // unique without inventing a deliverable address or linking a legacy account.
  const address = email?.emailAddress.toLowerCase() ?? `${userId}@users.clerk.invalid`;
  const [existing] = await db.select().from(user).where(eq(user.email, address)).limit(1);
  if (existing) {
    if (!verified) throw new Error("Verify your RangerOS email to link your existing feedback account");
    if (existing.clerkId && existing.clerkId !== userId) throw new Error("Feedback account already linked");
    await db.update(user).set({ clerkId: userId, emailVerified: true })
      .where(and(eq(user.id, existing.id), isNull(user.clerkId)));
  } else {
    await db.insert(user).values({
      id: userId, clerkId: userId, email: address, emailVerified: verified,
      name: profile.fullName || profile.username || "RangerOS user",
      image: profile.imageUrl, role: "member",
    }).onConflictDoNothing();
  }
  const [resolved] = await db.select().from(user).where(eq(user.clerkId, userId)).limit(1);
  if (!resolved) throw new Error("Unable to link feedback account");
  return resolved;
}
