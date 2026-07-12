'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPartners(statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('partners')
    .select('*, users!partners_user_id_fkey(email, full_name, phone)')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return { error: error.message, partners: [] };
  }

  return { partners: data || [] };
}

export async function updatePartnerStatus(formData: FormData) {
  const partnerId = formData.get('partner_id') as string;
  const newStatus = formData.get('new_status') as string;
  const supabase = await createClient();

  const { data: { user: adminUser } } = await supabase.auth.getUser();

  // Get current partner for audit log and notification
  const { data: oldPartner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .single();

  if (!oldPartner || !adminUser) return;

  const isVerified = newStatus === 'approved';

  const { data: updatedPartner, error } = await supabase
    .from('partners')
    .update({ 
      status: newStatus,
      kyc_verified: isVerified
    })
    .eq('id', partnerId)
    .select()
    .single();

  if (!error && updatedPartner) {
    // 1. Audit Log Entry
    await supabase.from('audit_logs').insert({
      user_id: adminUser.id,
      action: `partner.status_updated`,
      entity_type: 'partner',
      entity_id: partnerId,
      old_values: { status: oldPartner.status, kyc_verified: oldPartner.kyc_verified },
      new_values: { status: updatedPartner.status, kyc_verified: updatedPartner.kyc_verified }
    });

    // 2. Notification to Partner
    let notifTitle = 'Partner Application Updated';
    let notifMsg = `Your partner application status has been updated to ${newStatus}.`;
    
    if (newStatus === 'approved') {
      notifTitle = 'Partner Account Approved! 🎉';
      notifMsg = 'Congratulations! Your StashInn partner account is now fully approved and verified.';
    } else if (newStatus === 'rejected') {
      notifTitle = 'Partner Account Rejected';
      notifMsg = 'Unfortunately, your StashInn partner application was rejected. Please contact support.';
    } else if (newStatus === 'suspended') {
      notifTitle = 'Partner Account Suspended';
      notifMsg = 'Your StashInn partner account has been temporarily suspended.';
    }

    await supabase.from('notifications').insert({
      user_id: updatedPartner.user_id,
      title: notifTitle,
      message: notifMsg,
      category: 'system'
    });
  }

  revalidatePath('/dashboard/partners');
}

export async function getKycDocs(partnerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('kyc-documents').list(partnerId);
  
  if (error || !data) return [];

  // Generate public URLs for each file
  const docs = data
    .filter(file => file.name !== '.emptyFolderPlaceholder')
    .map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(`${partnerId}/${file.name}`);
      
      return {
        name: file.name,
        url: publicUrl
      };
    });

  return docs;
}
