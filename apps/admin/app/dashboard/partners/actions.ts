'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
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
    .maybeSingle();

  if (!oldPartner || !adminUser) {
    return { error: 'Failed to update partner status. Please try again.' };
  }

  // Verify this user is actually an admin
  const { data: adminCheck } = await supabase
    .from('users')
    .select('role')
    .eq('id', adminUser.id)
    .maybeSingle();

  if (adminCheck?.role !== 'admin') {
    return { error: 'Unauthorized: Only admins can update partner status.' };
  }

  const isVerified = newStatus === 'approved';

  // Use service role client to bypass RLS for the update
  const serviceClient = createServiceClient();
  const { data: updatedPartner, error } = await serviceClient
    .from('partners')
    .update({ 
      status: newStatus,
      kyc_verified: isVerified
    })
    .eq('id', partnerId)
    .select()
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!updatedPartner) {
    return { error: 'Update failed — your admin session may have expired. Please refresh and try again.' };
  }

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
    .maybeSingle();

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

  revalidatePath('/dashboard/partners');
  revalidatePath(`/dashboard/partners/${partnerId}`);
}

export async function getKycDocs(partnerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('kyc-documents').list(partnerId);
  
  if (error || !data) return [];

  // Generate signed URLs for each file (since KYC docs are private)
  const docs = await Promise.all(
    data
      .filter((file: any) => file.name !== '.emptyFolderPlaceholder')
      .map(async (file: any) => {
        const { data: signedData } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(`${partnerId}/${file.name}`, 3600);
        
        return {
          name: file.name,
          url: signedData?.signedUrl || null
        };
      })
  );

  return docs.filter(doc => doc.url !== null);
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
export async function updateLocationStatus(locationId: string, partnerId: string, isActive: boolean) {
  const supabase = await createClient();
  
  if (isActive) {
    // Check if there is at least one verified POC for this location
    const { data: pocs } = await supabase
      .from('partner_pocs')
      .select('is_verified')
      .eq('location_id', locationId)
      .eq('is_verified', true);
      
    if (!pocs || pocs.length === 0) {
      return { error: 'Validation failed: Location must have at least one verified Point of Contact before it can be approved.' };
    }
  }

  const { error } = await supabase.from('partner_locations').update({ is_active: isActive }).eq('id', locationId);
  if (!error) {
    revalidatePath('/dashboard/partners/' + partnerId);
  }
  return { error: error ? error.message : null };
}

export async function updateLocationCommission(locationId: string, partnerId: string, formData: FormData) {
  const supabase = await createClient();
  const rateStr = formData.get('commission_rate') as string;
  if (!rateStr) return { error: 'Rate is required' };
  
  const rate = parseFloat(rateStr);
  if (isNaN(rate) || rate < 0 || rate > 100) return { error: 'Invalid commission rate' };

  const { error } = await supabase.from('partner_locations').update({ commission_rate: rate }).eq('id', locationId);
  if (!error) {
    revalidatePath('/dashboard/partners/' + partnerId);
  }
  return { error: error ? error.message : null };
}

export async function updatePocStatus(pocId: string, partnerId: string, isVerified: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('partner_pocs').update({ is_verified: isVerified }).eq('id', pocId);
  if (!error) {
    revalidatePath('/dashboard/partners/' + partnerId);
  }
}

export async function updateLocationPricing(locationId: string, partnerId: string, type: 'luggage' | 'garage', formData: FormData) {
  const supabase = await createClient();
  
  if (type === 'luggage') {
    const rate = parseFloat(formData.get('price_per_hour') as string);
    if (!isNaN(rate)) {
      const { error } = await supabase.from('partner_locations').update({ price_per_hour: rate }).eq('id', locationId);
      if (error) return { error: error.message };
    }
  } else if (type === 'garage') {
    const bikeRate = parseFloat(formData.get('bike_rate_hr') as string);
    const carRate = parseFloat(formData.get('sedan_rate_hr') as string);
    
    if (!isNaN(bikeRate) && !isNaN(carRate)) {
      const { error } = await supabase.from('vehicle_pricing').update({ 
        bike_rate_hr: bikeRate,
        sedan_rate_hr: carRate
      }).eq('location_id', locationId);
      if (error) return { error: error.message };
    }
  }

  revalidatePath('/dashboard/partners/' + partnerId);
  return { error: null };
}

export async function updateLocationScoreAndRates(locationId: string, formData: FormData) {
  const supabase = await createClient();
  const payloadStr = formData.get("payload") as string;
  if (!payloadStr) return { error: "Missing payload" };
  
  const payload = JSON.parse(payloadStr);
  
  const { error: locError } = await supabase.from("partner_locations").update({
    auto_score: payload.auto_score,
    score_padding: payload.score_padding,
    final_score: payload.final_score,
    transit_proximity: payload.transit_proximity
  }).eq("id", locationId);
  if (locError) return { error: locError.message };
  
  if (payload.location_type === "luggage" && payload.calculated_rates?.luggage) {
    const { error: pError } = await supabase.from("partner_locations").update({
      price_per_hour: payload.calculated_rates.luggage
    }).eq("id", locationId);
    if (pError) return { error: pError.message };
  } else if (payload.location_type === "garage" && payload.calculated_rates?.bike) {
    const { error: pError } = await supabase.from("vehicle_pricing").update({
      bike_rate_hr: payload.calculated_rates.bike,
      sedan_rate_hr: payload.calculated_rates.car
    }).eq("location_id", locationId);
    if (pError) return { error: pError.message };
  }
  
  revalidatePath(`/dashboard/partners/`);
  return { error: null };
}

