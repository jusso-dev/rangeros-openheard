import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { user } from "../../../../packages/db/src/schema/auth";

const state = vi.hoisted(() => ({ id: null as string | null, db: null as any, profile: null as any }));
vi.mock("@clerk/tanstack-react-start/server", () => ({
  auth: async () => ({ userId: state.id }),
  clerkClient: () => ({ users: { getUser: async () => state.profile } }),
}));
vi.mock("@openheard/env/server", () => ({ env: { CLERK_SECRET_KEY: "test" } }));
vi.mock("@openheard/db", async () => ({
  user: (await import("../../../../packages/db/src/schema/auth")).user,
  createDb: () => state.db,
}));
import { resolveClerkUser } from "./clerk-user";

beforeEach(async () => {
  const client = createClient({ url: "file::memory:" });
  await client.execute(`CREATE TABLE user (
    id TEXT PRIMARY KEY, clerk_id TEXT UNIQUE, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0, image TEXT, role TEXT NOT NULL DEFAULT 'member',
    plan TEXT NOT NULL DEFAULT 'free', stripe_customer_id TEXT, stripe_subscription_id TEXT,
    plan_renews_at INTEGER, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0)`);
  state.db = drizzle(client);
  state.id = "user_clerk";
  state.profile = { primaryEmailAddressId: "email_1", fullName: "Ranger Test", imageUrl: null,
    emailAddresses: [{ id: "email_1", emailAddress: "ranger@example.com", verification: { status: "verified" } }] };
});

describe("Clerk feedback identity", () => {
  it("ignores all legacy sessions when Clerk is signed out", async () => {
    state.id = null;
    expect(await resolveClerkUser()).toBeNull();
  });
  it("preserves legacy owner ID and role when verified email matches", async () => {
    await state.db.insert(user).values({ id: "legacy-owner", name: "Owner", email: "ranger@example.com", role: "admin" });
    const result = await resolveClerkUser();
    expect(result).toMatchObject({ id: "legacy-owner", role: "admin", clerkId: "user_clerk", emailVerified: true });
  });
  it("never claims a legacy account using an unverified email", async () => {
    await state.db.insert(user).values({ id: "legacy-owner", name: "Owner", email: "ranger@example.com", role: "admin" });
    state.profile.emailAddresses[0].verification.status = "unverified";
    await expect(resolveClerkUser()).rejects.toThrow("Verify your RangerOS email");
    expect((await state.db.select().from(user))[0].clerkId).toBeNull();
  });
  it("cannot claim an account already linked to another Clerk ID", async () => {
    await state.db.insert(user).values({ id: "existing", clerkId: "other", name: "Owner", email: "ranger@example.com" });
    await expect(resolveClerkUser()).rejects.toThrow("already linked");
    expect((await state.db.select().from(user).where(eq(user.id, "existing")))[0].clerkId).toBe("other");
  });
  it("creates members without first-user admin escalation and stays idempotent", async () => {
    expect(await resolveClerkUser()).toMatchObject({ id: "user_clerk", role: "member" });
    expect(await resolveClerkUser()).toMatchObject({ id: "user_clerk", role: "member" });
    expect(await state.db.select().from(user)).toHaveLength(1);
  });
  it("allows a new RangerOS identity with an unverified email as member only", async () => {
    state.profile.emailAddresses[0].verification.status = "unverified";
    expect(await resolveClerkUser()).toMatchObject({ id: "user_clerk", role: "member", emailVerified: false });
  });
  it("supports RangerOS username-only accounts without claiming email accounts", async () => {
    state.profile.emailAddresses = [];
    state.profile.primaryEmailAddressId = null;
    expect(await resolveClerkUser()).toMatchObject({ id: "user_clerk", role: "member", email: "user_clerk@users.clerk.invalid", emailVerified: false });
  });
  it("uses stable Clerk identity after an email change", async () => {
    await resolveClerkUser();
    state.profile.emailAddresses[0].emailAddress = "changed@example.com";
    expect((await resolveClerkUser())?.id).toBe("user_clerk");
    expect(await state.db.select().from(user)).toHaveLength(1);
  });
});
