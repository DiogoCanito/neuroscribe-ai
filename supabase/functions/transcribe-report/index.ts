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
    const { transcription, templateName, templateBaseText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcription) {
      throw new Error("Transcription is required");
    }

    const systemPrompt = `És um radiologista experiente a gerar relatórios médicos estruturados.

TEMPLATE DE REFERÊNCIA:
${templateBaseText || 'Sem template específico'}

REGRAS FUNDAMENTAIS:

1. ESTRUTURA DO TEMPLATE:
   - O template tem frases entre colchetes [...] que representam achados NORMAIS
   - Quando o médico NÃO menciona uma estrutura → está NORMAL → usa a frase [...] SEM colchetes
   - Quando o médico MENCIONA algo específico → é um ACHADO → integra no local apropriado

2. COMO INTEGRAR ACHADOS:
   - Se o achado é sobre uma estrutura que tem frase normal no template, MODIFICA essa frase
   - Exemplo: Se template diz "[As vias de circulação de líquor são normais]" e médico diz "cavum do septo pelúcido", escreve:
     "Pequenos cavum do septo pelúcido e cavum de Vergae - sem relevância clínica. As restantes vias de circulação de líquor são simétricas e apresentam configuração normal."
   - O achado vem PRIMEIRO, depois o resto da frase adaptada

3. SECÇÕES OBRIGATÓRIAS:
   - TÍTULO DO EXAME (ex: RESSONÂNCIA MAGNÉTICA ENCEFÁLICA)
   - INFORMAÇÃO CLÍNICA: (extrai do ditado a queixa/motivo entre aspas)
   - TÉCNICA: (escolhe a opção técnica apropriada do template)
   - RELATÓRIO: (todos os achados, linha por linha)
   - CONCLUSÃO: (resume: "Exame sem alterações..." + lista achados específicos se houver)

4. FORMATO FINAL - TEXTO LIMPO:
   - SEM colchetes []
   - SEM asteriscos ** ou markdown
   - SEM bullets ou listas numeradas
   - Cada frase do relatório numa linha separada
   - Pronto para copiar e colar diretamente

EXEMPLO DE OUTPUT ESPERADO:

RESSONÂNCIA MAGNÉTICA ENCEFÁLICA

INFORMAÇÃO CLÍNICA:

"Hipoestesia do hemicorpo esquerdo com face"

TÉCNICA:

Para estudo do conteúdo endocraniano foram obtidos cortes sagitais T2, cortes coronais T2 e cortes axiais T1, T2, T2-FLAIR, T2* e difusão. Não foi injetado produto de contraste.

RELATÓRIO:

Não há alterações valorizáveis do sinal ou da morfologia do parênquima encefálico.

O estudo da difusão é normal.

[...continua com achados normais e específicos...]

CONCLUSÃO:

Exame sem alterações valorizáveis do parênquima encefálico.

[Achados específicos se mencionados]`;

    console.log("Processing transcription with AI...");
    console.log("Template:", templateName);
    console.log("Transcription:", transcription);

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
          { role: "user", content: `DITADO MÉDICO (transcrição do áudio):\n\n${transcription}\n\nGera o relatório final estruturado seguindo EXATAMENTE as regras. Tudo o que não foi mencionado está NORMAL.` },
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
      .replace(/^\s*\d+\.\s*/gm, '')  // Remove numbered lists
      .replace(/\[([^\]]*)\]/g, '$1') // Remove remaining brackets, keep content
      .replace(/\n{3,}/g, '\n\n')     // Normalize line breaks
      .trim();
    
    console.log("AI processing complete");
    console.log("Report preview:", adaptedReport.substring(0, 200));

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
