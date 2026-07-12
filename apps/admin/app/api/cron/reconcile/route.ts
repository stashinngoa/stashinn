import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  // Optional security: check for a cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Mark stale 'pending' bookings as 'cancelled'
    // Bookings that were created more than 30 minutes ago and are still pending (unpaid).
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: staleBookings, error: fetchStaleError } = await supabase
      .from('bookings')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', thirtyMinsAgo);

    let cancelledStaleCount = 0;
    if (staleBookings && staleBookings.length > 0) {
      const ids = staleBookings.map(b => b.id);
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .in('id', ids);
      
      if (!updateError) cancelledStaleCount = ids.length;
    }

    // 2. Log reconciliation action
    if (cancelledStaleCount > 0) {
      await supabase.from('audit_logs').insert({
        user_id: null,
        action: 'system.cron_reconciliation',
        entity_type: 'bookings',
        entity_id: 'batch',
        new_values: { cancelled_stale_count: cancelledStaleCount }
      });
    }

    return NextResponse.json({
      success: true,
      reconciled: {
        stale_pending_cancelled: cancelledStaleCount
      }
    });

  } catch (error) {
    console.error('Reconciliation Job Error:', error);
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
