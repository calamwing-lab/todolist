const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reset() {
  const { data: { users }, error: getErr } = await supabase.auth.admin.listUsers();
  if (getErr) return console.error(getErr);
  const admin = users.find(u => u.email === '919876543210@tracker.com');
  if (!admin) return console.log('Admin not found');
  
  const { data, error } = await supabase.auth.admin.updateUserById(admin.id, { password: 'admin123' });
  if (error) console.error('Error resetting:', error);
  else console.log('Password reset successfully.');
}
reset();
