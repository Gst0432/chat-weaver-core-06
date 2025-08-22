import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[TEAM-MANAGEMENT] ${step}`, details ?? "");

// Helper function to log team activities
const logTeamActivity = async (supabaseService: any, action: string, teamId: string, adminUserId: string, details: any = {}) => {
  try {
    await supabaseService.rpc('log_team_activity', {
      p_action: action,
      p_team_id: teamId,
      p_admin_user_id: adminUserId,
      p_target_type: 'team',
      p_target_id: teamId,
      p_details: details
    });
  } catch (error) {
    console.error('Failed to log team activity:', error);
  }
};

// Helper function to send invitation email
const sendInvitationEmail = async (email: string, teamName: string, inviterName: string, inviteUrl: string) => {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        email,
        teamName,
        inviterName,
        inviteUrl
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
};

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

        // Log team creation
        await logTeamActivity(supabaseService, 'create_team', team.id, user.id, {
          team_name: teamName,
          subscription_tier: subscription?.subscription_tier
        });

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

        // Check current team size including pending invitations
        const { count: currentMembers } = await supabaseService
          .from('team_members')
          .select('id', { count: 'exact' })
          .eq('team_id', teamId);

        const { count: pendingInvitations } = await supabaseService
          .from('team_invitations')
          .select('id', { count: 'exact' })
          .eq('team_id', teamId)
          .eq('status', 'pending');

        const totalCount = (currentMembers || 0) + (pendingInvitations || 0);
        if (totalCount >= teamLimit) {
          throw new Error(`Limite d'équipe atteinte (${teamLimit} membres maximum pour votre plan)`);
        }

        // Check if already invited or member
        const { data: existingInvitation } = await supabaseService
          .from('team_invitations')
          .select('id, status')
          .eq('team_id', teamId)
          .eq('email', memberEmail)
          .maybeSingle();

        if (existingInvitation && existingInvitation.status === 'pending') {
          throw new Error("Une invitation est déjà en attente pour cet email");
        }

        // Check if user exists and is already a member
        const { data: invitedUser } = await supabaseService.auth.admin.listUsers();
        const targetUser = invitedUser.users.find(u => u.email === memberEmail);

        if (targetUser) {
          const { data: existingMember } = await supabaseService
            .from('team_members')
            .select('id')
            .eq('team_id', teamId)
            .eq('user_id', targetUser.id)
            .maybeSingle();

          if (existingMember) {
            throw new Error("Cet utilisateur est déjà membre de l'équipe");
          }
        }

        // Get inviter profile
        const { data: inviterProfile } = await supabaseService
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const inviterName = inviterProfile?.display_name || user.email;

        // Create invitation
        const { data: invitation, error: inviteError } = await supabaseService
          .from('team_invitations')
          .upsert({
            team_id: teamId,
            email: memberEmail,
            invited_by: user.id,
            role: 'member',
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }, {
            onConflict: 'team_id,email'
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        // Generate invitation URL  
        const baseUrl = Deno.env.get("NODE_ENV") === "production" 
          ? "https://your-production-domain.com" 
          : "https://000c91c6-f980-4359-901b-7034686d3ba2.sandbox.lovable.dev";
        const inviteUrl = `${baseUrl}/team/accept-invitation?token=${invitation.id}&email=${encodeURIComponent(memberEmail)}`;

        // Send invitation email
        try {
          await sendInvitationEmail(memberEmail, team.name, inviterName, inviteUrl);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the whole process if email fails
        }

        // Log invitation
        await logTeamActivity(supabaseService, 'invite_member', teamId, user.id, {
          invited_email: memberEmail,
          team_name: team.name,
          invitation_id: invitation.id
        });

        log("Member invited", { teamId, memberEmail, invitationId: invitation.id });
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Invitation envoyée avec succès",
          invitation
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'accept_invitation': {
        const { invitationId } = body;
        
        if (!invitationId) {
          throw new Error("ID d'invitation requis");
        }

        // Get invitation
        const { data: invitation, error: inviteError } = await supabaseService
          .from('team_invitations')
          .select('*, teams(name)')
          .eq('id', invitationId)
          .eq('email', user.email)
          .eq('status', 'pending')
          .single();

        if (inviteError || !invitation) {
          throw new Error("Invitation non trouvée ou expirée");
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
          await supabaseService
            .from('team_invitations')
            .update({ status: 'expired' })
            .eq('id', invitationId);
          throw new Error("Cette invitation a expiré");
        }

        // Check if user is already a member
        const { data: existingMember } = await supabaseService
          .from('team_members')
          .select('id')
          .eq('team_id', invitation.team_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingMember) {
          throw new Error("Vous êtes déjà membre de cette équipe");
        }

        // Add user to team
        const { error: memberError } = await supabaseService
          .from('team_members')
          .insert({
            team_id: invitation.team_id,
            user_id: user.id,
            role: invitation.role
          });

        if (memberError) throw memberError;

        // Update invitation status
        await supabaseService
          .from('team_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId);

        // Log acceptance
        await logTeamActivity(supabaseService, 'accept_invitation', invitation.team_id, user.id, {
          invitation_id: invitationId,
          team_name: invitation.teams?.name
        });

        log("Invitation accepted", { teamId: invitation.team_id, userId: user.id });
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Vous avez rejoint l'équipe ${invitation.teams?.name}`,
          teamId: invitation.team_id
        }), {
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
          .select('id, name')
          .eq('id', teamId)
          .eq('owner_id', user.id)
          .single();

        if (!team) {
          throw new Error("Équipe non trouvée ou vous n'êtes pas le propriétaire");
        }

        // Get member info before removing
        const { data: member } = await supabaseService
          .from('team_members')
          .select('user_id, profiles:user_id(display_name)')
          .eq('id', memberId)
          .eq('team_id', teamId)
          .single();

        // Remove member
        const { error: removeError } = await supabaseService
          .from('team_members')
          .delete()
          .eq('id', memberId)
          .eq('team_id', teamId);

        if (removeError) throw removeError;

        // Log removal
        await logTeamActivity(supabaseService, 'remove_member', teamId, user.id, {
          removed_user_id: member?.user_id,
          removed_user_name: member?.profiles?.display_name,
          team_name: team.name
        });

        log("Member removed", { teamId, memberId });
        return new Response(JSON.stringify({ success: true, message: "Membre supprimé" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'cancel_invitation': {
        const { invitationId } = body;
        
        if (!invitationId) {
          throw new Error("ID d'invitation requis");
        }

        // Get invitation to verify ownership
        const { data: invitation } = await supabaseService
          .from('team_invitations')
          .select('team_id, email, teams(name)')
          .eq('id', invitationId)
          .single();

        if (!invitation) {
          throw new Error("Invitation non trouvée");
        }

        // Verify team ownership
        const { data: team } = await supabaseService
          .from('teams')
          .select('id')
          .eq('id', invitation.team_id)
          .eq('owner_id', user.id)
          .single();

        if (!team) {
          throw new Error("Vous n'êtes pas le propriétaire de cette équipe");
        }

        // Cancel invitation
        const { error: cancelError } = await supabaseService
          .from('team_invitations')
          .delete()
          .eq('id', invitationId);

        if (cancelError) throw cancelError;

        // Log cancellation
        await logTeamActivity(supabaseService, 'cancel_invitation', invitation.team_id, user.id, {
          cancelled_email: invitation.email,
          team_name: invitation.teams?.name,
          invitation_id: invitationId
        });

        log("Invitation cancelled", { invitationId, email: invitation.email });
        return new Response(JSON.stringify({ success: true, message: "Invitation annulée" }), {
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

        // Get pending invitations for owned teams
        const ownedTeamIds = ownedTeams?.map(t => t.id) || [];
        const { data: pendingInvitations } = ownedTeamIds.length > 0 
          ? await supabaseService
              .from('team_invitations')
              .select('id, team_id, email, role, created_at, expires_at, status')
              .in('team_id', ownedTeamIds)
              .eq('status', 'pending')
          : { data: [] };

        const allTeams = [
          ...(ownedTeams || []).map(team => ({
            ...team,
            isOwner: true,
            pendingInvitations: pendingInvitations?.filter(inv => inv.team_id === team.id) || []
          })),
          ...(memberTeams || []).map(m => ({ 
            ...m.teams, 
            isOwner: false, 
            userRole: m.role,
            pendingInvitations: []
          }))
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

      case 'get_team_history': {
        const { teamId: historyTeamId } = body;
        
        if (!historyTeamId) {
          throw new Error("Team ID requis");
        }

        // Verify team access (owner or member)
        const { data: teamAccess } = await supabaseService
          .from('teams')
          .select('id, owner_id')
          .eq('id', historyTeamId)
          .single();

        if (!teamAccess) {
          throw new Error("Équipe non trouvée");
        }

        const isOwner = teamAccess.owner_id === user.id;

        if (!isOwner) {
          // Check if user is a member
          const { data: membership } = await supabaseService
            .from('team_members')
            .select('id')
            .eq('team_id', historyTeamId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!membership) {
            throw new Error("Accès refusé - vous n'êtes pas membre de cette équipe");
          }
        }

        // Get team history
        const { data: history } = await supabaseService
          .from('admin_logs')
          .select('id, action, created_at, details')
          .eq('details->>team_id', historyTeamId)
          .order('created_at', { ascending: false })
          .limit(50);

        return new Response(JSON.stringify({ 
          success: true, 
          history: history || []
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