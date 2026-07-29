import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createTestUser, deleteTestUser, serviceClient } from "./helpers";

describe("signup trigger (plan §16 Phase 3, [A2])", () => {
  let userId: string;

  afterAll(async () => {
    if (userId) await deleteTestUser(userId);
  });

  it("creates a profile, a personal workspace, and an owner membership", async () => {
    const { userId: id, client } = await createTestUser("Ada Lovelace");
    userId = id;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, display_name")
      .eq("id", id)
      .single();
    expect(profileError).toBeNull();
    expect(profile?.display_name).toBe("Ada Lovelace");

    const { data: memberships, error: membershipsError } = await client
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", id);
    expect(membershipsError).toBeNull();
    expect(memberships).toHaveLength(1);
    const membership = memberships![0]!;
    expect(membership.role).toBe("owner");

    const { data: workspace, error: workspaceError } = await client
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", membership.workspace_id)
      .single();
    expect(workspaceError).toBeNull();
    expect(workspace?.owner_id).toBe(id);
  });
});

describe("workspace RLS isolation", () => {
  let ownerId: string;
  let outsiderId: string;
  let ownerClient: Awaited<ReturnType<typeof createTestUser>>["client"];
  let outsiderClient: Awaited<ReturnType<typeof createTestUser>>["client"];
  let ownerWorkspaceId: string;

  beforeAll(async () => {
    const owner = await createTestUser("Workspace Owner");
    const outsider = await createTestUser("Outsider");
    ownerId = owner.userId;
    outsiderId = outsider.userId;
    ownerClient = owner.client;
    outsiderClient = outsider.client;

    const { data } = await ownerClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ownerId)
      .single();
    ownerWorkspaceId = data!.workspace_id;
  });

  afterAll(async () => {
    await deleteTestUser(ownerId);
    await deleteTestUser(outsiderId);
  });

  it("a non-member cannot see the workspace via select (RLS scoping, not a query filter)", async () => {
    const { data, error } = await outsiderClient
      .from("workspaces")
      .select("id")
      .eq("id", ownerWorkspaceId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("a non-member cannot see the workspace's member roster", async () => {
    const { data, error } = await outsiderClient
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", ownerWorkspaceId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("a non-member cannot insert themselves into the workspace", async () => {
    const { error } = await outsiderClient
      .from("workspace_members")
      .insert({ workspace_id: ownerWorkspaceId, user_id: outsiderId, role: "viewer" });
    expect(error).not.toBeNull();
  });

  it("anonymous (unauthenticated) requests are denied at the table-privilege level, not just filtered by RLS", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("workspaces").select("id").eq("id", ownerWorkspaceId);
    // `anon` has no GRANT on workspaces at all (plan §7.2/§14: public access
    // only ever goes through the service-role client after server-side
    // validation) — this is a stricter, correct failure mode than an RLS
    // row-filter would give, so a permission-denied error is expected here.
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  it("the owner can add a member, who can then see the workspace", async () => {
    const member = await createTestUser("New Member");
    try {
      const { error: insertError } = await ownerClient
        .from("workspace_members")
        .insert({ workspace_id: ownerWorkspaceId, user_id: member.userId, role: "editor" });
      expect(insertError).toBeNull();

      const { data, error } = await member.client
        .from("workspaces")
        .select("id")
        .eq("id", ownerWorkspaceId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    } finally {
      await deleteTestUser(member.userId);
    }
  });

  it("a viewer cannot add other members (owner-only insert policy)", async () => {
    const viewer = await createTestUser("Viewer Member");
    try {
      const service = serviceClient();
      const { error: insertError } = await service
        .from("workspace_members")
        .insert({ workspace_id: ownerWorkspaceId, user_id: viewer.userId, role: "viewer" });
      expect(insertError).toBeNull();

      const intruder = await createTestUser("Intruder");
      try {
        const { error } = await viewer.client
          .from("workspace_members")
          .insert({ workspace_id: ownerWorkspaceId, user_id: intruder.userId, role: "viewer" });
        expect(error).not.toBeNull();
      } finally {
        await deleteTestUser(intruder.userId);
      }
    } finally {
      await deleteTestUser(viewer.userId);
    }
  });
});

describe("last-owner guard (plan §7.1)", () => {
  let ownerId: string;
  let ownerClient: Awaited<ReturnType<typeof createTestUser>>["client"];
  let workspaceId: string;

  beforeAll(async () => {
    const owner = await createTestUser("Sole Owner");
    ownerId = owner.userId;
    ownerClient = owner.client;
    const { data } = await ownerClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ownerId)
      .single();
    workspaceId = data!.workspace_id;
  });

  afterAll(async () => {
    await deleteTestUser(ownerId);
  });

  it("cannot demote the last owner", async () => {
    const { error } = await ownerClient
      .from("workspace_members")
      .update({ role: "editor" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", ownerId);
    expect(error).not.toBeNull();
    expect(error?.message).toContain("letzte Owner");
  });

  it("cannot remove the last owner", async () => {
    const { error } = await ownerClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", ownerId);
    expect(error).not.toBeNull();
    expect(error?.message).toContain("letzte Owner");
  });

  it("allows demoting an owner once a second owner exists", async () => {
    const secondOwner = await createTestUser("Second Owner");
    try {
      const service = serviceClient();
      const { error: insertError } = await service
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: secondOwner.userId, role: "owner" });
      expect(insertError).toBeNull();

      const { error } = await ownerClient
        .from("workspace_members")
        .update({ role: "editor" })
        .eq("workspace_id", workspaceId)
        .eq("user_id", ownerId);
      expect(error).toBeNull();

      // restore for cleanup symmetry
      await service
        .from("workspace_members")
        .update({ role: "owner" })
        .eq("workspace_id", workspaceId)
        .eq("user_id", ownerId);
    } finally {
      await deleteTestUser(secondOwner.userId);
    }
  });
});
