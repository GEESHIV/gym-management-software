import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STAFF_ROLES = ["owner", "receptionist"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CreateLoginBody {
  member_id: string;
  email: string;
  password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in again." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: caller, error: callerError } = await admin
      .from("user_profiles")
      .select("gym_id, role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (callerError) return json({ error: "Could not verify your account." }, 500);
    if (!caller || !STAFF_ROLES.includes(caller.role)) {
      return json({ error: "Only gym staff can create member logins." }, 403);
    }

    const body = (await req.json()) as CreateLoginBody;
    const memberId = String(body.member_id ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!UUID_PATTERN.test(memberId)) return json({ error: "Invalid member." }, 400);
    if (!EMAIL_PATTERN.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 8) return json({ error: "The temporary password must be at least 8 characters." }, 400);

    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id, gym_id, full_name, phone, user_id")
      .eq("id", memberId)
      .eq("gym_id", caller.gym_id)
      .maybeSingle();
    if (memberError) return json({ error: "Could not load the member." }, 500);
    if (!member) return json({ error: "Member not found." }, 404);
    if (member.user_id) return json({ error: "This member already has a login." }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Could not create the login." }, 400);
    }

    const { error: profileError } = await admin.from("user_profiles").insert({
      id: created.user.id,
      gym_id: member.gym_id,
      role: "member",
      full_name: member.full_name,
      phone: member.phone,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Could not save the member profile. Please try again." }, 500);
    }

    const { error: linkError } = await admin
      .from("members")
      .update({ user_id: created.user.id, email })
      .eq("id", member.id);
    if (linkError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Could not link the login to this member. Please try again." }, 500);
    }

    return json({ id: created.user.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Something went wrong." }, 500);
  }
});
