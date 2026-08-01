const { createClient } = require("@supabase/supabase-js");

console.log("Creating Supabase Client...");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;