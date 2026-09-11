import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://kqorwabdnnhovsyqxogq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3J3YWJkbm5ob3ZzeXF4b2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjM5NjUsImV4cCI6MjEwMjE5OTk2NX0.li3sOloWGjphIKqVhciYaHB83MPL4QTCckDg0zi6euc'
);
