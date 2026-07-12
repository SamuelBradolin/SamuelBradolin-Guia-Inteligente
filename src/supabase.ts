import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjcncifmhteskxepihac.supabase.co';
const supabaseAnonKey = 'sb_publishable_CJbTI32zmtwZ4KBIyABnWA_ea0l1neq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
