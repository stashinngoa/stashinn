import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@stashinn/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const entity = searchParams.get('entity') || 'all';
    const action = searchParams.get('action') || '';
    const userEmail = searchParams.get('userEmail') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const supabase = await createClient();
    
    let query = supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(email)')
      .order('created_at', { ascending: false });

    if (entity !== 'all') {
      query = query.eq('entity_type', entity);
    }
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    // Filter by user email if search parameter is present
    let filteredLogs = logs || [];
    if (userEmail) {
      filteredLogs = filteredLogs.filter((log: any) => 
        (log.users as any)?.email?.toLowerCase().includes(userEmail.toLowerCase())
      );
    }

    // Create CSV header
    let csvData = 'ID,Timestamp,Action,Entity_Type,Entity_ID,User_Email,Old_Values,New_Values\n';
    
    // Append rows
    filteredLogs.forEach(l => {
      const email = (l.users as any)?.email || 'System';
      const oldVals = l.old_values ? JSON.stringify(l.old_values).replace(/"/g, '""') : '';
      const newVals = l.new_values ? JSON.stringify(l.new_values).replace(/"/g, '""') : '';
      const timestamp = new Date(l.created_at).toISOString();
      csvData += `"${l.id}","${timestamp}","${l.action}","${l.entity_type}","${l.entity_id || 'System'}","${email}","${oldVals}","${newVals}"\n`;
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-admin-audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
