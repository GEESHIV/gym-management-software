import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STAFF_ROLES = ["receptionist", "trainer"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CreateBody {
  action: "create";
  full_name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
}

interface RemoveBody {
  action: "remove";
  user_id: string;
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

    const callerId = userData.user.id;
    const { data: caller, error: callerError } = await admin
      .from("user_profiles")
      .select("gym_id, role")
      .eq("id", callerId)
      .maybeSingle();
    if (callerError) return json({ error: "Could not verify your account." }, 500);
    if (!caller || caller.role !== "owner") {
      return json({ error: "Only the gym owner can manage staff." }, 403);
    }

    const body = (await req.json()) as CreateBody | RemoveBody;

    if (body.action === "create") {
      const fullName = String(body.full_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const phone = String(body.phone ?? "").replace(/\D/g, "");
      const password = String(body.password ?? "");
      const role = String(body.role ?? "");

      if (fullName.length < 2 || fullName.length > 80) {
        return json({ error: "Enter the staff member's full name." }, 400);
      }
      if (!EMAIL_PATTERN.test(email)) return json({ error: "Enter a valid email address." }, 400);
      if (!/^[6-9]\d{9}$/.test(phone)) return json({ error: "Enter a valid 10-digit mobile number." }, 400);
      if (password.length < 8) return json({ error: "The temporary password must be at least 8 characters." }, 400);
      if (!STAFF_ROLES.includes(role)) return json({ error: "Choose receptionist or trainer." }, 400);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        return json({ error: createError?.message ?? "Could not create the account." }, 400);
      }

      const { error: profileError } = await admin.from("user_profiles").insert({
        id: created.user.id,
        gym_id: caller.gym_id,
        role,
        full_name: fullName,
        phone,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Could not save the staff profile. Please try again." }, 500);
      }

      return json({ id: created.user.id });
    }

    if (body.action === "remove") {
      const targetId = String(body.user_id ?? "");
      if (!UUID_PATTERN.test(targetId)) return json({ error: "Invalid staff member." }, 400);
      if (targetId === callerId) return json({ error: "You cannot remove your own account." }, 400);

      const { data: target, error: targetError } = await admin
        .from("user_profiles")
        .select("id, role")
        .eq("id", targetId)
        .eq("gym_id", caller.gym_id)
        .maybeSingle();
      if (targetError) return json({ error: "Could not load the staff member." }, 500);
      if (!target) return json({ error: "Staff member not found." }, 404);
      if (target.role === "owner") return json({ error: "The owner account cannot be removed." }, 400);

      const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
      if (deleteError) return json({ error: "Could not remove this staff member." }, 500);

      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Something went wrong." }, 500);
  }
});
