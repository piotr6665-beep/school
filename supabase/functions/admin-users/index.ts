import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with anon key to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return new Response(
        JSON.stringify({ error: 'Nieautoryzowany dostęp' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await anonClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('User is not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Brak uprawnień administratora' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { action, userId, password } = await req.json();
    console.log(`Admin action: ${action} for user: ${userId}`);

    switch (action) {
      case 'list': {
        const { data, error } = await adminClient.auth.admin.listUsers();
        if (error) {
          console.error('Error listing users:', error);
          throw error;
        }
        return new Response(
          JSON.stringify({ users: data.users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listRoles': {
        // Get all admin roles
        const { data: roles, error: rolesError } = await adminClient
          .from('user_roles')
          .select('user_id, role')
          .eq('role', 'admin');
        
        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
          throw rolesError;
        }
        
        return new Response(
          JSON.stringify({ roles: roles || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'grantAdmin': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Brak ID użytkownika' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already has admin role
        const { data: existingRole } = await adminClient
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        if (existingRole) {
          return new Response(
            JSON.stringify({ error: 'Użytkownik już jest administratorem' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: insertError } = await adminClient
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (insertError) {
          console.error('Error granting admin:', insertError);
          throw insertError;
        }

        console.log(`Admin role granted to user: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Nadano uprawnienia administratora' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revokeAdmin': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Brak ID użytkownika' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent revoking own admin rights
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Nie możesz odebrać sobie uprawnień administratora' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (deleteError) {
          console.error('Error revoking admin:', deleteError);
          throw deleteError;
        }

        console.log(`Admin role revoked from user: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Odebrano uprawnienia administratora' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'changePassword': {
        if (!userId || !password) {
          return new Response(
            JSON.stringify({ error: 'Brak wymaganych danych' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Hasło musi mieć minimum 6 znaków' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
        if (error) {
          console.error('Error changing password:', error);
          throw error;
        }
        console.log(`Password changed for user: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Hasło zostało zmienione' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Brak ID użytkownika' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) {
          console.error('Error deleting user:', error);
          throw error;
        }
        console.log(`User deleted: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Użytkownik został usunięty' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Nieznana akcja' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Wystąpił błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
