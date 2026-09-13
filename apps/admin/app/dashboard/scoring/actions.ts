'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getScoringRules() {
  const supabase = await createClient();
  const { data } = await supabase.from('system_scoring_rules').select('*').eq('id', 1).single();
  return data;
}

export async function updateScoringRules(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  try {
    const amenityWeights = JSON.parse(formData.get('amenity_weights') as string);
    const transitWeights = JSON.parse(formData.get('transit_weights') as string);
    const luggageRates = JSON.parse(formData.get('luggage_rates') as string);
    const garageBikeRates = JSON.parse(formData.get('garage_bike_rates') as string);
    const garageCarRates = JSON.parse(formData.get('garage_car_rates') as string);
    const gstRate = parseFloat(formData.get('gst_rate') as string);

    const { error } = await supabase
      .from('system_scoring_rules')
      .update({
        amenity_weights: amenityWeights,
        transit_weights: transitWeights,
        luggage_rates: luggageRates,
        garage_bike_rates: garageBikeRates,
        garage_car_rates: garageCarRates,
        gst_rate: gstRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) throw error;
    
    // Log the change
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'admin.scoring_rules_updated',
      entity_type: 'system_scoring_rules',
      entity_id: '1',
      new_values: { amenity_weights: amenityWeights, transit_weights: transitWeights, luggage_rates: luggageRates }
    });

    revalidatePath('/dashboard/scoring');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Invalid JSON format in one of the fields.' };
  }
}
