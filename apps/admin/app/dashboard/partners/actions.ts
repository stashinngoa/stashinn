'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';

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

    // Also send an SMS and email
    const { data: userData } = await supabase
      .from('users')
      .select('phone, email, full_name')
      .eq('id', updatedPartner.user_id)
      .single();

    if (userData) {
      await sendSMS({
        to: userData.phone || '+1234567890',
        message: `StashInn: ${notifMsg}`
      });

      // Send Email Confirmation on Approval
      if (newStatus === 'approved' && userData.email) {
        try {
          const { renderTemplate } = await import('@stashinn/lib/services/email');
          const emailData = await renderTemplate('partner_approved', {
            partner_name: userData.full_name || 'Partner',
            business_name: oldPartner.business_name || 'your business',
            partner_url: process.env.NEXT_PUBLIC_PARTNER_URL || 'https://partner.stashinn.com'
          });

          const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
          await ExternalNotificationService.sendEmail(
            userData.email,
            emailData.subject,
            emailData.html
          );
        } catch (err) {
          console.error('Failed to send partner approval email template:', err);
          
          // Fallback to plain text if template fails
          const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
          await ExternalNotificationService.sendEmail(
            userData.email,
            'Your StashInn Partner Application is Approved! 🎉',
            `Hello ${userData.full_name || 'Partner'},\n\nCongratulations! Your StashInn Partner Application has been approved and verified.\n\nYou can now log in to your partner portal dashboard to configure your storage locations, set operating hours, and begin accepting luggage storage bookings from travelers.\n\nBest regards,\nThe StashInn Team`
          );
        }
      }
    }
  }

  revalidatePath('/dashboard/partners');
}

export async function getKycDocs(partnerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('kyc-documents').list(partnerId);
  
  if (error || !data) return [];

  // Generate public URLs for each file
  const docs = data
    .filter((file: any) => file.name !== '.emptyFolderPlaceholder')
    .map((file: any) => {
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

export async function updateLocationCoordinates(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const locationId = formData.get('location_id') as string;
  const partnerId = formData.get('partner_id') as string;
  const latitude = parseFloat(formData.get('latitude') as string);
  const longitude = parseFloat(formData.get('longitude') as string);

  const { error } = await supabase
    .from('partner_locations')
    .update({ latitude, longitude })
    .eq('id', locationId);

  if (error) {
    throw new Error(error.message);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'partner.location_coords_updated',
    entity_type: 'partner_locations',
    entity_id: locationId,
    new_values: { latitude, longitude }
  });

  revalidatePath(`/dashboard/partners/${partnerId}/locations`);
}
