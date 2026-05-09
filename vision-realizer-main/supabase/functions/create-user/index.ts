// Edge function: create a new user with roles + username (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "فقط مدیر سیستم اجازه دارد" }, 403);

    const body = await req.json();
    const { email, password, full_name, username, roles: newRoles } = body;
    if (!email || !password || !username || !Array.isArray(newRoles) || newRoles.length === 0) {
      return json({ error: "ورودی ناقص است" }, 400);
    }

    // create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || username },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "خطا در ایجاد کاربر" }, 400);

    const newUserId = created.user.id;

    // ensure profile (trigger may already insert it)
    await admin.from("profiles").upsert({
      id: newUserId,
      full_name: full_name || username,
      is_active: true,
    });

    // insert roles
    const roleRows = newRoles.map((r: string) => ({ user_id: newUserId, role: r }));
    await admin.from("user_roles").insert(roleRows);

    // insert username mapping
    await admin.from("user_usernames").upsert({
      user_id: newUserId,
      username: String(username).trim().toLowerCase(),
      email,
    });

    return json({ user_id: newUserId });
  } catch (e: any) {
    return json({ error: e?.message ?? "خطای ناشناخته" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
