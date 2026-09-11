import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gfrbxmjpipfhkpkhyosg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcmJ4bWpwaXBmaGtwa2h5b3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTgwNzEsImV4cCI6MjA5NjMzNDA3MX0.SlaggEwMZqTZ_KwPXvCdqrl_L9YfZnqumEdDF6ENzog';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
