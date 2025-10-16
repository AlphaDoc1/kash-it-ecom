// Supabase Edge Function: approve-delivery
// Creates/ensures auth user for email, grants delivery role, creates delivery_partners,
// links delivery_applications, all using service role (bypasses RLS).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type ApprovePayload = {
  email: string
  full_name?: string
  phone?: string
  vehicle_type?: string | null
  vehicle_number?: string | null
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const { email, full_name, phone, vehicle_type, vehicle_number } = (await req.json()) as ApprovePayload
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // 1) Ensure auth user exists (by email)
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, email })
    let userId: string | null = null
    if (existingUsers && existingUsers.users.length > 0) {
      userId = existingUsers.users[0].id
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: full_name || 'User', phone: phone || null },
      })
      if (createErr) throw createErr
      userId = created.user?.id ?? null
    }
    if (!userId) throw new Error('Failed to ensure user')

    // 2) Ensure profile exists/updated
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: full_name || 'User',
      phone: phone || null,
      is_verified: true,
      // email column may exist depending on migration
      // @ts-ignore
      email,
    }, { onConflict: 'id' })

    // 3) Create delivery_partners if missing
    const { data: partner } = await supabase
      .from('delivery_partners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!partner) {
      const { error: insPartnerErr } = await supabase.from('delivery_partners').insert({
        user_id: userId,
        vehicle_type: vehicle_type || null,
        vehicle_number: vehicle_number || null,
        is_verified: true,
        is_active: true,
      })
      if (insPartnerErr) throw insPartnerErr
    }

    // 4) Grant delivery role if missing
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    const hasDelivery = (roles || []).some((r) => r.role === 'delivery')
    if (!hasDelivery) {
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'delivery' as any })
      if (roleErr) throw roleErr
    }

    // 5) Update application statuses for that email
    await supabase
      .from('delivery_applications')
      .update({ status: 'linked', linked_user_id: userId })
      .eq('email', email.toLowerCase())
      .in('status', ['approved', 'pending'])

    return new Response(JSON.stringify({ ok: true, userId }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400 })
  }
})


