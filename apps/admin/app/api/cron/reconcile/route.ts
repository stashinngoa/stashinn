import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExternalNotificationService } from '@stashinn/lib/services/notifications';

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

    // 2. Generate monthly settlements for the previous month
    const now = new Date();
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const targetMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const { data: settledCount, error: rpcError } = await supabase.rpc('generate_monthly_settlements', {
      target_month: targetMonth
    });

    if (rpcError) {
      console.error('Error generating monthly settlements:', rpcError);
    }

    // 3. Email monthly report to partners
    let emailedPartnersCount = 0;
    const { data: newTransactions } = await supabase
      .from('partner_transactions')
      .select('*, partners(business_name, users(email, full_name))')
      .eq('settlement_month', targetMonth);

    if (newTransactions && newTransactions.length > 0) {
      for (const tx of newTransactions) {
        const email = (tx.partners?.users as any)?.email;
        const name = (tx.partners?.users as any)?.full_name || tx.partners?.business_name;
        if (email) {
          const subject = `StashInn: Monthly Settlement Report - ${targetMonth}`;
          const body = `Dear ${name},

Your monthly settlement report for ${targetMonth} is ready.

Total Settlement Amount: INR ${Number(tx.amount).toFixed(2)}
Status: ${tx.status.toUpperCase()}

Please log in to your StashInn dashboard to view the transaction details or download your CSV/PDF statements.

Best regards,
StashInn Operations`;

          const emailRes = await ExternalNotificationService.sendEmail(email, subject, body);
          if (emailRes.success) {
            emailedPartnersCount++;
          }
        }
      }
    }

    // 4. Log reconciliation action
    if (cancelledStaleCount > 0 || (settledCount && Number(settledCount) > 0)) {
      await supabase.from('audit_logs').insert({
        user_id: null,
        action: 'system.cron_reconciliation',
        entity_type: 'bookings',
        entity_id: 'batch',
        new_values: { 
          cancelled_stale_count: cancelledStaleCount,
          settled_month: targetMonth,
          settled_count: settledCount ? Number(settledCount) : 0,
          emailed_partners_count: emailedPartnersCount
        }
      });
    }

    return NextResponse.json({
      success: true,
      reconciled: {
        stale_pending_cancelled: cancelledStaleCount,
        settlements_generated: settledCount ? Number(settledCount) : 0,
        reports_emailed: emailedPartnersCount
      }
    });

  } catch (error) {
    console.error('Reconciliation Job Error:', error);
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
