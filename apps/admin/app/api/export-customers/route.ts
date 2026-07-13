import { NextRequest, NextResponse } from 'next/server';
import { getCustomers } from '../../dashboard/customers/actions';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q') || '';

    const { customers, error } = await getCustomers(search);
    if (error) {
      throw new Error(error);
    }
    
    // Create CSV header
    let csvData = 'ID,Name,Email,Phone,Status,Joined_Date\n';
    
    // Append rows
    customers.forEach(c => {
      const status = c.is_blocked ? 'Blocked' : 'Active';
      const joinedDate = new Date(c.created_at).toISOString().split('T')[0];
      csvData += `"${c.id}","${c.full_name || ''}","${c.email || ''}","${c.phone || ''}","${status}","${joinedDate}"\n`;
    });

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stashinn-admin-customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
