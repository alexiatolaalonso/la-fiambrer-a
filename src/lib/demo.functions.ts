import { createServerFn } from "@tanstack/react-start";
import { CUENTAS_DEMO, DEMO_PASSWORD } from "./demo";

// Crea (si falta) la cuenta demo elegida y le asigna su rol. Solo acepta las cuentas de la lista fija.
export const prepararCuentaDemo = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => {
    const cuenta = CUENTAS_DEMO.find((c) => c.email === d?.email);
    if (!cuenta) throw new Error("Cuenta demo desconocida");
    return { email: cuenta.email };
  })
  .handler(async ({ data }) => {
    const cuenta = CUENTAS_DEMO.find((c) => c.email === data.email)!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | undefined;
    const creado = await supabaseAdmin.auth.admin.createUser({
      email: cuenta.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (creado.data.user) {
      userId = creado.data.user.id;
    } else {
      for (let page = 1; page <= 5 && !userId; page++) {
        const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        userId = lista.users.find((u) => u.email?.toLowerCase() === cuenta.email)?.id;
        if (lista.users.length < 200) break;
      }
      if (userId) await supabaseAdmin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
    }
    if (!userId) throw new Error("No se pudo preparar la cuenta demo");
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: cuenta.rol }, { onConflict: "user_id,role" });
    return { ok: true };
  });
