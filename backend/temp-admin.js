const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const client = new Client({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => { 
  const hash = await bcrypt.hash("Admin@123", 12); 
  await client.query(
    "INSERT INTO public.users (email, password_hash, full_name, is_super_admin) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING", 
    ["admin@erp.pk", hash, "Super Admin"]
  ); 
  console.log(">>> SUPER ADMIN ACCOUNT BAN GAYA! <<<"); 
  process.exit(0); 
}).catch(e => { 
  console.error("Koi error aya:", e); 
  process.exit(1); 
});
