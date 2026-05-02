import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] as string));

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ContactEmailRequest = await req.json();

    // Server-side validation
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();

    if (!name || name.length > 100) throw new Error("Invalid name");
    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Invalid email");
    if (phone && phone.length > 50) throw new Error("Invalid phone");
    if (!subject || subject.length > 200) throw new Error("Invalid subject");
    if (!message || message.length > 5000) throw new Error("Invalid message");

    // Escape user-provided content before embedding into HTML
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = phone ? escapeHtml(phone) : "";
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

    console.log(`Processing contact form from: ${name} (${email})`);

    // Send notification email to admin
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Aerial Paradise <onboarding@resend.dev>",
        to: ["piotr6665@gmail.com"],
        subject: `Nowa wiadomość kontaktowa: ${safeSubject}`,
        html: `
          <h2>Nowa wiadomość z formularza kontaktowego</h2>
          <p><strong>Od:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          ${safePhone ? `<p><strong>Telefon:</strong> ${safePhone}</p>` : ''}
          <p><strong>Temat:</strong> ${safeSubject}</p>
          <hr />
          <h3>Wiadomość:</h3>
          <p>${safeMessage}</p>
        `,
      }),
    });

    const adminResult = await adminEmailResponse.json();
    console.log("Admin notification sent:", adminResult);

    // Send confirmation email to user
    const userEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Aerial Paradise <onboarding@resend.dev>",
        to: [email],
        subject: "Dziękujemy za kontakt - Aerial Paradise",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0891b2;">Dziękujemy za wiadomość!</h1>
            <p>Drogi/a ${safeName},</p>
            <p>Dziękujemy za kontakt z Aerial Paradise. Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe.</p>
            <h3>Twoja wiadomość:</h3>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
              <p><strong>Temat:</strong> ${safeSubject}</p>
              <p>${safeMessage}</p>
            </div>
            <p style="margin-top: 20px;">Pozdrawiamy,<br>Zespół Aerial Paradise</p>
          </div>
        `,
      }),
    });

    const userResult = await userEmailResponse.json();
    console.log("User confirmation sent:", userResult);

    if (!adminEmailResponse.ok || !userEmailResponse.ok) {
      throw new Error(adminResult.message || userResult.message || "Failed to send emails");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminEmail: adminResult, 
        userEmail: userResult 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
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
