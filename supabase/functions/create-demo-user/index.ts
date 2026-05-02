import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create demo user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'demo@demouser.pl',
      password: 'demouser',
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo User'
      }
    });

    if (userError) {
      // Check if user already exists
      if (userError.message.includes('already')) {
        console.log('Demo user already exists');
        return new Response(
          JSON.stringify({ success: true, message: 'Demo user already exists' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      throw userError;
    }

    console.log('Demo user created successfully:', userData.user?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo user created successfully',
        userId: userData.user?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating demo user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});