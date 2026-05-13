const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fuzzeliwdxqzhkhpbyvy.supabase.co',
  'sb_publishable_ncpdEBso_ZPDyQVLV12cLA_5Ag1rR5T'
);

async function fetchTeams() {
  const { data, error } = await supabase.from('teams').select('name, short_name');
  if (error) {
    console.error(error);
    return;
  }
  
  let result = {};
  data.forEach(team => {
    result[team.name] = team.name;
    if (team.short_name) {
      result[team.short_name] = team.short_name;
    }
  });
  
  console.log(JSON.stringify(result, null, 2));
}

fetchTeams();
