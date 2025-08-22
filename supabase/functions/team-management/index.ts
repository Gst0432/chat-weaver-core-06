import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[TEAM-MANAGEMENT] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    log("Start");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Check subscription limits
    const { data: subscription } = await supabaseService
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('email', user.email)
      .single();

    const body = await req.json().catch(() => ({}));
    const { action, teamName, memberEmail, teamId, memberId } = body;

    // Define team size limits based on subscription
    const getTeamLimit = (tier: string | null, subscribed: boolean) => {
      if (!subscribed || !tier) return 1; // Starter = 1 user only
      if (tier.toLowerCase().includes('pro')) return 5;
      if (tier.toLowerCase().includes('business')) return 20;
      if (tier.toLowerCase().includes('enterprise')) return 999; // Unlimited
      return 1;
    };

    const teamLimit = getTeamLimit(subscription?.subscription_tier, subscription?.subscribed);

    switch (action) {
      case 'create_team': {
        if (teamLimit <= 1) {
          throw new Error("Votre plan ne permet pas de créer des équipes. Passez au plan Pro ou supérieur.");
        }

        // Check how many teams user already owns
        const { data: existingTeams } = await supabaseService
          .from('teams')
          .select('id')
          .eq('owner_id', user.id);

        const ownedTeamsCount = existingTeams?.length || 0;
        const maxTeams = subscription?.subscription_tier?.toLowerCase().includes('pro') ? 5 :
                        subscription?.subscription_tier?.toLowerCase().includes('business') ? 20 :
                        subscription?.subscription_tier?.toLowerCase().includes('enterprise') ? 999 : 1;

        if (ownedTeamsCount >= maxTeams) {
          const planMessage = maxTeams === 1 ? 'Passez au plan Pro pour créer plusieurs équipes.' :
                            maxTeams === 5 ? 'Passez au plan Business pour créer plus de 5 équipes.' :
                            maxTeams === 20 ? 'Contactez-nous pour le plan Enterprise.' :
                            'Limite atteinte.';
          throw new Error(`Limite d'équipes atteinte (${ownedTeamsCount}/${maxTeams}). ${planMessage}`);
        }

        const { data: team, error: teamError } = await supabaseService
          .from('teams')
          .insert({
            name: teamName,
            owner_id: user.id
          })
          .select()
          .single();

        if (teamError) throw teamError;

        log("Team created", { teamId: team.id, teamName });
        return new Response(JSON.stringify({ success: true, team }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'invite_member': {
        if (!teamId || !memberEmail) {
          throw new Error("Team ID et email du membre requis");
        }

        // Verify team ownership
        const { data: team } = await supabaseService
          .from('teams')
          .select('id, name')
          .eq('id', teamId)
          .eq('owner_id', user.id)
          .single();

        if (!team) {
          throw new Error("Équipe non trouvée ou vous n'êtes pas le propriétaire");
        }

        // Check current team size
        const { count: currentMembers } = await supabaseService
          .from('team_members')
          .select('id', { count: 'exact' })
          .eq('team_id', teamId);

        if ((currentMembers || 0) >= teamLimit) {
          throw new Error(`Limite d'équipe atteinte (${teamLimit} membres maximum pour votre plan)`);
        }

        // Find user by email
        const { data: invitedUser } = await supabaseService.auth.admin.listUsers();
        const targetUser = invitedUser.users.find(u => u.email === memberEmail);

        if (!targetUser) {
          throw new Error(`Utilisateur avec l'email ${memberEmail} non trouvé`);
        }

        // Check if already a member
        const { data: existingMember } = await supabaseService
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', targetUser.id)
          .single();

        if (existingMember) {
          throw new Error("Cet utilisateur est déjà membre de l'équipe");
        }

        // Add member
        const { error: memberError } = await supabaseService
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: targetUser.id,
            role: 'member'
          });

        if (memberError) throw memberError;

        log("Member added", { teamId, memberEmail });
        return new Response(JSON.stringify({ success: true, message: "Membre ajouté avec succès" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'remove_member': {
        if (!teamId || !memberId) {
          throw new Error("Team ID et member ID requis");
        }

        // Verify team ownership
        const { data: team } = await supabaseService
          .from('teams')
          .select('id')
          .eq('id', teamId)
          .eq('owner_id', user.id)
          .single();

        if (!team) {
          throw new Error("Équipe non trouvée ou vous n'êtes pas le propriétaire");
        }

        // Remove member
        const { error: removeError } = await supabaseService
          .from('team_members')
          .delete()
          .eq('id', memberId)
          .eq('team_id', teamId);

        if (removeError) throw removeError;

        log("Member removed", { teamId, memberId });
        return new Response(JSON.stringify({ success: true, message: "Membre supprimé" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'get_teams': {
        // Get user's own teams and teams they're a member of
        const { data: ownedTeams } = await supabaseService
          .from('teams')
          .select(`
            id, name, created_at,
            team_members (
              id, role, user_id,
              profiles:user_id (
                display_name, avatar_url
              )
            )
          `)
          .eq('owner_id', user.id);

        const { data: memberTeams } = await supabaseService
          .from('team_members')
          .select(`
            role,
            teams (
              id, name, created_at, owner_id,
              team_members (
                id, role, user_id,
                profiles:user_id (
                  display_name, avatar_url
                )
              )
            )
          `)
          .eq('user_id', user.id);

        const allTeams = [
          ...(ownedTeams || []).map(team => ({ ...team, isOwner: true })),
          ...(memberTeams || []).map(m => ({ ...m.teams, isOwner: false, userRole: m.role }))
        ];

        return new Response(JSON.stringify({ 
          success: true, 
          teams: allTeams,
          teamLimit,
          subscription: subscription?.subscription_tier || 'Gratuit'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error("Action non supportée");
    }
  } catch (error) {
    console.error("[TEAM-MANAGEMENT] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});