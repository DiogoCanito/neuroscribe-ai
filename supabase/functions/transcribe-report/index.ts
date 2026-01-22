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
    const { transcription, patientInfo, examType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `És um assistente médico especializado em neurologia. O teu trabalho é estruturar relatórios clínicos a partir de ditados médicos.

CONTEXTO:
- Doente: ${patientInfo.name}
- Tipo de Exame: ${examType}
${patientInfo.dateOfBirth ? `- Data de Nascimento: ${patientInfo.dateOfBirth}` : ''}
${patientInfo.clinicalHistory ? `- Histórico Clínico: ${patientInfo.clinicalHistory}` : ''}

INSTRUÇÕES:
1. Analisa a transcrição do ditado médico
2. Extrai e organiza a informação nas seguintes secções:
   - Motivo da Consulta/Exame
   - Achados do Exame
   - Diagnóstico/Impressão
   - Recomendações/Plano Terapêutico
   - Observações Adicionais

3. Mantém a terminologia médica original
4. Corrige erros de transcrição óbvios
5. Formata o texto de forma clara e profissional
6. Responde APENAS em português de Portugal

FORMATO DE RESPOSTA (JSON):
{
  "consultation_reason": "texto",
  "exam_findings": "texto",
  "diagnosis": "texto",
  "therapeutic_plan": "texto",
  "observations": "texto"
}`;

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
          { role: "user", content: `Transcrição do ditado:\n\n${transcription}` },
        ],
        response_format: { type: "json_object" },
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
    const content = data.choices?.[0]?.message?.content;
    
    let structuredReport;
    try {
      structuredReport = JSON.parse(content);
    } catch {
      structuredReport = {
        consultation_reason: "",
        exam_findings: content,
        diagnosis: "",
        therapeutic_plan: "",
        observations: ""
      };
    }

    return new Response(JSON.stringify(structuredReport), {
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
