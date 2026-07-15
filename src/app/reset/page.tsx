import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function ResetPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return <div>Error: Supabase credentials not found in environment variables.</div>;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const adminId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const { error } = await supabase.auth.admin.updateUserById(adminId, { password: '123456' });
  if (error) return <div>Error updating password: {error.message}</div>;

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Password Reset Successful!</h1>
      <p>The password for the admin account has been forcibly reset to <strong>123456</strong>.</p>
      <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>Click here to go to the Login Page</a>
    </div>
  );
}
