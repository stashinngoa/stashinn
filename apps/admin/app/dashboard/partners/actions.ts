'use server';

import { requireAccess } from '../../../lib/adminAccess';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';
import { infoRequestAreas } from '@stashinn/lib/constants';
import { isLocationPriced } from '@stashinn/lib/services/bookingAvailability';

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
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const partnerId = formData.get('partner_id') as string;
  const newStatus = formData.get('new_status') as string;
  const reason = ((formData.get('reason') as string) || '').trim();
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

  if (newStatus === 'approved' && oldPartner.gst_applicable == null) {
    return { error: 'Decide whether GST applies to this partner before approving them.' };
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
    new_values: { status: updatedPartner.status, kyc_verified: updatedPartner.kyc_verified, ...(reason ? { reason } : {}) }
  });

  // 2. Notification to Partner
  let notifTitle = 'Partner Application Updated';
  let notifMsg = `Your partner application status has been updated to ${newStatus}.`;
  
  const reactivated = newStatus === 'approved' && oldPartner.status === 'suspended';

  if (reactivated) {
    notifTitle = 'Partner Account Reactivated';
    notifMsg = 'Your StashInn partner account is active again. Your approved locations can take bookings.';
  } else if (newStatus === 'approved') {
    notifTitle = 'Partner Account Approved! 🎉';
    notifMsg = 'Congratulations! Your StashInn partner account is now fully approved and verified.';
  } else if (newStatus === 'rejected') {
    notifTitle = 'Partner Account Rejected';
    notifMsg = 'Unfortunately, your StashInn partner application was rejected. Please contact support.';
  } else if (newStatus === 'suspended') {
    notifTitle = 'Partner Account Suspended';
    notifMsg = 'Your StashInn partner account has been temporarily suspended.';
  } else if (newStatus === 'pending') {
    notifTitle = 'Partner Application Reopened';
    notifMsg = 'Your StashInn partner application has been reopened for review.';
  }
  if (reason) notifMsg += ` Reason: ${reason}`;

  // Service client: notifications RLS has no insert policy, so the admin's own session can't
  // write a row for another user (it used to fail silently and the partner never heard).
  const db = createServiceClient();
  const { error: notifError } = await db.from('notifications').insert({
    user_id: updatedPartner.user_id,
    title: notifTitle,
    message: notifMsg,
    category: 'system'
  });
  if (notifError) console.error('[PARTNER_STATUS] notification insert failed:', notifError.message);

  // Also send an SMS and email
  const { data: userData } = await db
    .from('users')
    .select('phone, email, full_name')
    .eq('id', updatedPartner.user_id)
    .maybeSingle();

  if (userData) {
    if (userData.phone) {
      await sendSMS({ to: userData.phone, message: `StashInn: ${notifMsg}` }).catch(() => false);
    }

    // Send Email Confirmation on Approval
    if (newStatus === 'approved' && !reactivated && userData.email) {
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
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
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

  revalidatePath(`/dashboard/partners/${partnerId}`);
  revalidatePath(`/dashboard/partners/${partnerId}/locations`);
}
export async function updateLocationAdminStatus(locationId: string, partnerId: string, newStatus: string, reason: string) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  
  let isActive = false;
  if (newStatus === 'approved') {
    isActive = true;
    // Prices are finalised by scoring, so a location can't go live without it
    const { data: location } = await supabase
      .from('partner_locations')
      .select('location_type, auto_score, price_per_hour, vehicle_pricing(*)')
      .eq('id', locationId)
      .maybeSingle();
    if (!isLocationPriced(location)) {
      return { error: 'Apply this location\'s score and rates before approving it.' };
    }
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

  const { error } = await supabase.from('partner_locations').update({ 
    is_active: isActive,
    admin_status: newStatus,
    status_reason: reason || null
  }).eq('id', locationId);
  
  if (!error) {
    const { notifyPartnerExternal } = await import('@stashinn/lib/services/notifications');
    let title = 'Location Status Updated';
    let message = `Your location status has been updated to ${newStatus}.`;
    if (newStatus === 'rejected') {
      title = 'Location Rejected';
      message = `Your location was rejected. Reason: ${reason}`;
    } else if (newStatus === 'update_required') {
      title = 'Action Required for Location';
      message = `Please update your location information. Reason: ${reason}`;
    } else if (newStatus === 'suspended') {
      title = 'Location Suspended';
      message = `Your location has been suspended. Reason: ${reason}`;
    } else if (newStatus === 'approved') {
      title = 'Location Approved';
      message = `Your location has been approved and is now active.`;
    }
    await notifyPartnerExternal(partnerId, { title, message });

    revalidatePath('/dashboard/partners/' + partnerId);
  }
  return { error: error ? error.message : null };
}

export async function updateLocationStatus(locationId: string, partnerId: string, isActive: boolean) {
  return updateLocationAdminStatus(locationId, partnerId, isActive ? 'approved' : 'suspended', 'Status toggled via quick action.');
}

export async function updateLocationCommission(locationId: string, partnerId: string, formData: FormData) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
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
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  // Onboarding saves the same person once per location, so verify every copy of them;
  // otherwise only one location gets a verified contact and the others can't be approved.
  const { data: poc } = await supabase.from('partner_pocs').select('phone').eq('id', pocId).maybeSingle();
  let query = supabase.from('partner_pocs').update({ is_verified: isVerified }).eq('partner_id', partnerId);
  query = poc?.phone ? query.eq('phone', poc.phone) : query.eq('id', pocId);
  const { error } = await query;
  if (!error) {
    revalidatePath('/dashboard/partners/' + partnerId);
  }
  return { error: error ? error.message : null };
}

export async function updateLocationPricing(locationId: string, partnerId: string, type: 'luggage' | 'garage', formData: FormData) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
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
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  const payloadStr = formData.get("payload") as string;
  if (!payloadStr) return { error: "Missing payload" };
  
  const payload = JSON.parse(payloadStr);
  
  const rates = payload.calculated_rates || {};
  const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const rateValues = payload.location_type === "garage" ? [rates.bike, rates.car] : [rates.luggage];
  if (!rateValues.every(positive)) return { error: "The calculated rate must be above ₹0. Check the rate range in Scoring System." };

  const { data: partnerRow, error: locError } = await supabase.from("partner_locations").update({
    auto_score: payload.auto_score,
    score_padding: payload.score_padding,
    final_score: payload.final_score,
    transit_proximity: payload.transit_proximity,
    ...(payload.location_type === "luggage" ? { price_per_hour: rates.luggage } : {}),
  }).eq("id", locationId).select("partner_id").maybeSingle();
  if (locError) return { error: locError.message };
  if (!partnerRow) return { error: "Location not found." };

  if (payload.location_type === "garage") {
    // Upsert: capacities are left as they are, and a missing row can't lose the rates silently
    const { error: pError } = await supabase.from("vehicle_pricing").upsert(
      { location_id: locationId, bike_rate_hr: rates.bike, sedan_rate_hr: rates.car },
      { onConflict: "location_id" }
    );
    if (pError) return { error: pError.message };
  }

  revalidatePath(`/dashboard/partners/${partnerRow.partner_id}`);
  return { error: null };
}

export async function uploadSignedRegistrationDoc(partnerId: string, formData: FormData) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  const file = formData.get('signed_doc') as File;
  
  if (!file || file.size === 0) return { error: 'Missing file' };
  // Same limits as the kyc-documents bucket
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { error: 'Upload a PDF, JPG, PNG or WebP file.' };
  if (file.size > 10 * 1024 * 1024) return { error: 'The file is larger than 10 MB.' };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const filePath = "partners/" + partnerId + "/signed_registration_" + Date.now() + "." + ext;

  // Storage policies only let partners upload into their own folder, so the admin upload
  // goes through the service client (the role check above has already run)
  const { error: uploadError } = await createServiceClient().storage
    .from('kyc-documents')
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) return { error: 'Upload failed: ' + uploadError.message };

  const { data: saved, error: updateError } = await createServiceClient()
    .from('partners')
    .update({ signed_registration_doc_url: filePath })
    .eq('id', partnerId)
    .select('id')
    .maybeSingle();

  if (updateError || !saved) return { error: 'Database update failed: ' + (updateError?.message ?? 'partner not found') };

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'partner.registration_form_uploaded',
    entity_type: 'partner',
    entity_id: partnerId,
    new_values: { signed_registration_doc_url: filePath },
  });

  revalidatePath("/dashboard/partners/" + partnerId);
  return { error: null };
}

// Partner-level "request info": for problems that aren't about one location (PAN/GSTIN,
// documents, contact person). The partner sees the ticked areas and note on their dashboard
// and gets an email (if they have email notifications on).
const escapeHtml = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function requestPartnerInfo(partnerId: string, items: string[], message: string) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const areas = infoRequestAreas(items);
  const note = message.trim();
  if (areas.length === 0) return { error: 'Tick at least one area that needs attention.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: old } = await supabase
    .from('partners')
    .select('business_name, info_request, info_request_items, users!partners_user_id_fkey(full_name)')
    .eq('id', partnerId)
    .maybeSingle();

  const { error } = await createServiceClient()
    .from('partners')
    .update({
      info_request: note || null,
      info_request_items: areas.map(a => a.key),
      info_requested_at: new Date().toISOString(),
      info_responded_at: null,
    })
    .eq('id', partnerId);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'partner.info_requested',
    entity_type: 'partner',
    entity_id: partnerId,
    old_values: { info_request: old?.info_request ?? null, info_request_items: old?.info_request_items ?? [] },
    new_values: { info_request: note, info_request_items: areas.map(a => a.key) },
  });

  // Email: the editable partner_info_requested template, or a built-in version if it's missing
  const vars = {
    partner_name: escapeHtml((old?.users as any)?.full_name || 'Partner'),
    business_name: escapeHtml(old?.business_name || 'your business'),
    items_html: `<ul>${areas.map(a => `<li><strong>${a.label}</strong> (${a.hint})</li>`).join('')}</ul>`,
    note_html: note ? `<p style="padding:12px;background:#fff7ed;border-left:3px solid #ea580c;white-space:pre-line">${escapeHtml(note)}</p>` : '',
    partner_url: process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001',
  };
  let email: { subject: string; html: string };
  try {
    const { renderTemplate } = await import('@stashinn/lib/services/email');
    email = await renderTemplate('partner_info_requested', vars);
  } catch {
    email = {
      subject: 'Action needed on your StashInn partner account',
      html: `<h2>Hi ${vars.partner_name},</h2><p>We need a few things from you before we can continue reviewing <strong>${vars.business_name}</strong>.</p>${vars.items_html}${vars.note_html}<p>Sign in to the <a href="${vars.partner_url}">Partner Dashboard</a> to make the changes. If we asked for a document, reply to this email with a clear copy.</p>`,
    };
  }
  email.html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eaeaea;border-radius:8px;color:#333;line-height:1.5">${email.html}</div>`;

  const { notifyPartnerExternal } = await import('@stashinn/lib/services/notifications');
  await notifyPartnerExternal(partnerId, {
    title: 'Action needed on your StashInn account',
    message: `Please check: ${areas.map(a => a.label).join(', ')}.${note ? ` ${note}` : ''}`,
    email,
  });

  revalidatePath('/dashboard/partners/' + partnerId);
  return { error: null };
}

export async function clearPartnerInfoRequest(partnerId: string) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await createServiceClient()
    .from('partners')
    .update({ info_request: null, info_request_items: [], info_requested_at: null, info_responded_at: null })
    .eq('id', partnerId);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'partner.info_request_resolved',
    entity_type: 'partner',
    entity_id: partnerId,
  });

  revalidatePath('/dashboard/partners/' + partnerId);
  return { error: null };
}

/** Whether GST is added to this partner's bookings. Existing bookings keep what they were charged. */
export async function setPartnerGstApplicable(partnerId: string, applies: boolean) {
  await requireAccess('/dashboard/partners'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: old } = await supabase.from('partners').select('gst_applicable').eq('id', partnerId).maybeSingle();
  const { error } = await createServiceClient().from('partners').update({ gst_applicable: applies }).eq('id', partnerId);
  if (error) return { error: error.message };

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action: 'partner.gst_applicable_updated',
    entity_type: 'partner',
    entity_id: partnerId,
    old_values: { gst_applicable: old?.gst_applicable ?? null },
    new_values: { gst_applicable: applies },
  });

  revalidatePath('/dashboard/partners/' + partnerId);
  return { error: null };
}
