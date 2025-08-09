import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user has super_admin role
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin');

    if (rolesError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, data } = await req.json();

    let result;
    
    switch (action) {
      case 'getDashboardData':
        result = await getDashboardData(supabaseClient);
        break;
      
      case 'createPlan':
        result = await createPlan(supabaseClient, data);
        break;
      
      case 'updatePlan':
        result = await updatePlan(supabaseClient, data);
        break;
      
      case 'deletePlan':
        result = await deletePlan(supabaseClient, data.id);
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getDashboardData(supabaseClient: any) {
  try {
    // Get users count from auth.users
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    const users = authError ? [] : authUsers.users;

    // Get subscription plans
    const { data: plans, error: plansError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('Plans error:', plansError);
    }

    // Get statistics
    const { data: subscribers, error: subscribersError } = await supabaseClient
      .from('subscribers')
      .select('subscribed, minutes_balance, total_minutes_purchased');

    if (subscribersError) {
      console.error('Subscribers error:', subscribersError);
    }

    const { data: conversations, error: conversationsError } = await supabaseClient
      .from('conversations')
      .select('id');

    if (conversationsError) {
      console.error('Conversations error:', conversationsError);
    }

    const { data: purchases, error: purchasesError } = await supabaseClient
      .from('minute_purchases')
      .select('amount')
      .eq('status', 'completed');

    if (purchasesError) {
      console.error('Purchases error:', purchasesError);
    }

    const stats = {
      totalUsers: users.length || 0,
      totalRevenue: (purchases || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      activeSubscriptions: (subscribers || []).filter((s: any) => s.subscribed).length || 0,
      totalConversations: (conversations || []).length || 0
    };

    return {
      users: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      })),
      plans: plans || [],
      stats
    };

  } catch (error) {
    console.error('Dashboard data error:', error);
    throw error;
  }
}

async function createPlan(supabaseClient: any, planData: any) {
  const { data, error } = await supabaseClient
    .from('subscription_plans')
    .insert([{
      name: planData.name,
      description: planData.description,
      price: planData.price,
      features: planData.features,
      is_active: planData.is_active
    }])
    .select()
    .single();

  if (error) {
    console.error('Create plan error:', error);
    throw error;
  }

  return { success: true, data };
}

async function updatePlan(supabaseClient: any, planData: any) {
  const { data, error } = await supabaseClient
    .from('subscription_plans')
    .update({
      name: planData.name,
      description: planData.description,
      price: planData.price,
      features: planData.features,
      is_active: planData.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', planData.id)
    .select()
    .single();

  if (error) {
    console.error('Update plan error:', error);
    throw error;
  }

  return { success: true, data };
}

async function deletePlan(supabaseClient: any, planId: string) {
  const { error } = await supabaseClient
    .from('subscription_plans')
    .delete()
    .eq('id', planId);

  if (error) {
    console.error('Delete plan error:', error);
    throw error;
  }

  return { success: true };
}