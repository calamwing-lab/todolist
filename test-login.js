const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '919876543210@tracker.com',
    password: 'admin123'
  });
  console.log('Login result:', error ? error.message : 'Success! User ID: ' + data.user.id);
}
testLogin();
