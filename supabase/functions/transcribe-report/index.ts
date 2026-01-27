import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, templateName, templateBaseText, patientInfo, examType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcription) {
      throw new Error("Transcription is required");
    }

    const systemPrompt = `És um radiologista experiente. Gera relatórios médicos a partir de ditados usando um template como guia de estrutura.

TEMPLATE (guia de estrutura e frases padrão):
${templateBaseText || 'Sem template específico'}

LÓGICA FUNDAMENTAL:
1. O template define a ORDEM e ESTRUTURA do relatório
2. Frases entre colchetes [...] são as frases NORMAIS/PADRÃO para quando não há achados
3. Se o médico NÃO MENCIONA uma estrutura/região → está NORMAL → usa a frase entre [...] SEM os colchetes
4. Se o médico MENCIONA algo específico → há um ACHADO → escreve o que ele disse no lugar apropriado

PROCESSO:
1. Lê o ditado e identifica o que o médico menciona
2. Segue a estrutura do template secção por secção
3. Para cada parte do template:
   - Se o médico não falou disso → usa a frase padrão [normal] removendo os colchetes
   - Se o médico mencionou algo → escreve os achados que ele ditou
4. Mantém a ordem exata do template
5. Adiciona CONCLUSÃO no final resumindo os achados

FORMATO FINAL - TEXTO LIMPO:
- SEM colchetes []
- SEM asteriscos ou markdown
- SEM bullets
- Texto corrido por secções
- Pronto para copiar e colar diretamente

SECÇÕES OBRIGATÓRIAS:
- Título do exame (ex: RESSONÂNCIA MAGNÉTICA ENCEFÁLICA)
- INFORMAÇÃO CLÍNICA: (do ditado)
- TÉCNICA: (escolher a apropriada do template)
- RELATÓRIO: (achados)
- CONCLUSÃO: (resumo breve)`;

    console.log("Processing transcription with AI...");
    console.log("Template:", templateName);
    console.log("Transcription length:", transcription.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `DITADO MÉDICO:\n\n${transcription}\n\nAdapta este ditado ao template e gera o relatório final completo com CONCLUSÃO.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar relatório" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let adaptedReport = data.choices?.[0]?.message?.content || transcription;
    
    // Clean up any remaining markdown or formatting
    adaptedReport = adaptedReport
      .replace(/\*\*/g, '')           // Remove bold markdown
      .replace(/\*/g, '')             // Remove italic markdown
      .replace(/^#+\s*/gm, '')        // Remove heading markdown
      .replace(/^\s*[-•]\s*/gm, '')   // Remove bullet points
      .replace(/\[([^\]]*)\]/g, '$1') // Remove remaining brackets, keep content
      .replace(/\n{3,}/g, '\n\n')     // Normalize line breaks
      .trim();
    
    console.log("AI processing complete, report length:", adaptedReport.length);

    return new Response(JSON.stringify({ 
      adaptedReport,
      originalTranscription: transcription 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
