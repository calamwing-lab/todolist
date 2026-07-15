const URL = 'https://pzxvnuivilhepemhbsno.supabase.co/rest/v1/';
const KEY = 'sb_publishable_VTkyOIZ9HCboPRdlPAgtLQ_pX4ZoeB9'; // anon key

async function check() {
  try {
    const res = await fetch(URL, {
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      }
    });
    const schema = await res.json();
    console.log('Available REST paths:', Object.keys(schema.paths || {}));
  } catch (err) {
    console.error('Error fetching OpenAPI schema:', err);
  }
}

check();
