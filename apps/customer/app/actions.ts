'use server';

import { createClient } from '@stashinn/lib/supabase/server';

export async function getSearchSuggestions(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  
  // Search for active locations matching the query in name, city, or address
  const { data } = await supabase
    .from('partner_locations')
    .select('id, name, city, address_line1')
    .eq('is_active', true)
    .or(`city.ilike.%${query}%,address_line1.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(5);
    
  return data || [];
}
