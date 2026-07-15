import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { users }, error: getErr } = await supabase.auth.admin.listUsers();
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  
  const admin = users.find(u => u.email === '919876543210@tracker.com');
  if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

  const { error } = await supabase.auth.admin.updateUserById(admin.id, { password: '123456' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Password reset to 123456 successfully!' });
}
