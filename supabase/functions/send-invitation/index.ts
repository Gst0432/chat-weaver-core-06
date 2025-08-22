import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[SEND-INVITATION] Start');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, teamName, inviterName, inviteUrl }: InvitationRequest = await req.json();

    console.log('[SEND-INVITATION] Sending email to:', email);

    const emailResponse = await resend.emails.send({
      from: "ChAtélix <onboarding@resend.dev>",
      to: [email],
      subject: `Invitation à rejoindre l'équipe ${teamName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invitation d'équipe</h1>
          </div>
          
          <div style="background: white; padding: 40px 20px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px;">Bonjour !</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>${teamName}</strong> sur ChAtélix.
            </p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Cliquez sur le bouton ci-dessous pour accepter cette invitation :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Rejoindre l'équipe
              </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
              Si vous n'arrivez pas à cliquer sur le bouton, copiez et collez ce lien dans votre navigateur :<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
        </div>
      `,
    });

    console.log("[SEND-INVITATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[SEND-INVITATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);