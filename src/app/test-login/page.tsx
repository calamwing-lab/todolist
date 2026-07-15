import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function TestLoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return <div>Error: missing env</div>;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '919876543210@tracker.com',
    password: '123456'
  });

  if (error) {
    return <div>LOGIN_FAILED: {error.message}</div>;
  }

  return <div>LOGIN_SUCCESS: {data.user?.id}</div>;
}
