'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getStaff() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, staff: [] };
  }

  return { staff: data || [] };
}

export async function inviteStaff(formData: FormData) {
  const email = formData.get('email') as string;
  const adminRole = formData.get('admin_role') as string;
  const supabase = await createClient();

  // Create auth user using Admin API requires SERVICE_ROLE_KEY
  // We'll simulate creating the auth user if service role is not available in env
  // For production, this requires SUPABASE_SERVICE_ROLE_KEY in .env.local
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to invite new staff users.');
  }

  const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // Invite user via email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (authError) {
    throw new Error(authError.message);
  }

  if (authData?.user) {
    // Ensure the public.users record is created via trigger, then update it
    // Wait a brief moment for the trigger to fire
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await supabaseAdmin
      .from('users')
      .update({ role: 'admin', admin_role: adminRole })
      .eq('id', authData.user.id);
      
    // Log the action
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: currentUser.id,
        action: 'staff.invited',
        entity_type: 'users',
        entity_id: authData.user.id,
        new_values: { role: 'admin', admin_role: adminRole }
      });
    }
  }

  revalidatePath('/dashboard/staff');
}

export async function demoteStaff(formData: FormData) {
  const userId = formData.get('user_id') as string;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  // Prevent removing the very last superadmin
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('admin_role', 'superadmin');
    
  if (count && count <= 1) {
    // Check if this user is the last superadmin
    const { data: targetUser } = await supabase.from('users').select('admin_role').eq('id', userId).single();
    if (targetUser?.admin_role === 'superadmin') {
      throw new Error('Cannot demote the last remaining superadmin.');
    }
  }

  await supabase
    .from('users')
    .update({ role: 'customer', admin_role: null })
    .eq('id', userId);

  if (currentUser) {
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'staff.demoted',
      entity_type: 'users',
      entity_id: userId,
      new_values: { role: 'customer', admin_role: null }
    });
  }

  revalidatePath('/dashboard/staff');
}

export async function promoteToAdmin(formData: FormData) {
  const email = formData.get('email') as string;
  const adminRole = formData.get('admin_role') as string || 'support';
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // First check if user exists
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', email)
    .single();

  if (!user) {
    throw new Error('No user found with that email address.');
  }

  if (user.role === 'admin') {
    throw new Error('User is already an admin.');
  }

  await supabase
    .from('users')
    .update({ role: 'admin', admin_role: adminRole })
    .eq('id', user.id);

  if (currentUser) {
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'staff.promoted',
      entity_type: 'users',
      entity_id: user.id,
      new_values: { role: 'admin', admin_role: adminRole }
    });
  }

  revalidatePath('/dashboard/staff');
}

export async function updateStaffRole(formData: FormData) {
  const userId = formData.get('user_id') as string;
  const newRole = formData.get('admin_role') as string;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Prevent modifying the very last superadmin
  if (newRole !== 'superadmin') {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('admin_role', 'superadmin');
      
    if (count && count <= 1) {
      const { data: targetUser } = await supabase.from('users').select('admin_role').eq('id', userId).single();
      if (targetUser?.admin_role === 'superadmin') {
        throw new Error('Cannot change the role of the last remaining superadmin.');
      }
    }
  }

  const { data: oldData } = await supabase.from('users').select('admin_role').eq('id', userId).single();

  await supabase
    .from('users')
    .update({ admin_role: newRole })
    .eq('id', userId);

  if (currentUser && oldData) {
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'staff.role_updated',
      entity_type: 'users',
      entity_id: userId,
      old_values: { admin_role: oldData.admin_role },
      new_values: { admin_role: newRole }
    });
  }

  revalidatePath('/dashboard/staff');
}
