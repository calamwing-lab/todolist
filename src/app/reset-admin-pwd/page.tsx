import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function ResetPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return <div>Error: Supabase credentials not found.</div>;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // We are creating the admin user properly using the GoTrue API
  // so that all internal salts, identities, and linkages are established perfectly.
  const { data, error } = await supabase.auth.admin.createUser({
    email: '919876543210@tracker.com',
    password: '123456',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      name: 'System Admin',
      phone: '+919876543210'
    }
  });

  if (error) {
    // If it says already exists, that means they are already fixed
    if (error.message.includes('already been registered')) {
        return (
          <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1>Admin Already Configured!</h1>
            <p>The admin account is already fully set up and ready to go.</p>
          </div>
        );
    }
    return <div>Error creating user: {error.message}</div>;
  }

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Admin Recreated Successfully!</h1>
      <p>The admin account has been correctly recreated via GoTrue.</p>
      <p>Password is now definitively set to: <strong>123456</strong>.</p>
    </div>
  );
}
