import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No texts provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If target is Polish, return original texts (assuming source is Polish)
    if (targetLanguage === 'pl') {
      return new Response(
        JSON.stringify({ translations: texts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare texts for translation
    const textsToTranslate = texts.map((t: string, i: number) => `[${i}]: ${t}`).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following Polish texts to ${targetLanguage === 'en' ? 'English' : targetLanguage}. 
Maintain the exact same format with [index]: translation.
Keep any HTML tags, special characters, and formatting intact.
Translate naturally, not literally - make it sound native.
Only output the translations, nothing else.`
          },
          {
            role: 'user',
            content: textsToTranslate
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content;

    // Parse translations back to array
    const translations: string[] = [];
    const lines = translatedText.split('\n');
    
    for (let i = 0; i < texts.length; i++) {
      const regex = new RegExp(`\\[${i}\\]:\\s*(.+?)(?=\\[\\d+\\]:|$)`, 's');
      const match = translatedText.match(regex);
      if (match) {
        translations[i] = match[1].trim();
      } else {
        // Fallback to original if translation failed
        translations[i] = texts[i];
      }
    }

    return new Response(
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
