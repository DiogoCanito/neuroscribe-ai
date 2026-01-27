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

    // Build context from template
    const templateContext = templateName 
      ? `Template selecionado: ${templateName}\n${templateBaseText ? `Estrutura base do template:\n${templateBaseText}\n` : ''}`
      : '';

    // Build patient context if available
    const patientContext = patientInfo 
      ? `Paciente: ${patientInfo.name}${patientInfo.dateOfBirth ? `, Data de Nascimento: ${patientInfo.dateOfBirth}` : ''}${patientInfo.clinicalHistory ? `, Histórico Clínico: ${patientInfo.clinicalHistory}` : ''}`
      : '';

    const systemPrompt = `És um assistente médico especializado em radiologia e relatórios clínicos. O teu trabalho é adaptar ditados médicos à estrutura de um template de relatório.

CONTEXTO:
${templateContext}
${patientContext}
${examType ? `Tipo de Exame: ${examType}` : ''}

INSTRUÇÕES:
1. Analisa a transcrição do ditado médico
2. Adapta o conteúdo à estrutura do template fornecido, mantendo TODOS os cabeçalhos e secções do template
3. Preenche cada secção com a informação relevante extraída da transcrição
4. Se uma secção não tiver informação na transcrição, mantém o texto original do template ou indica "Sem alterações"
5. Mantém a terminologia médica original e profissional
6. Corrige erros de transcrição óbvios (palavras mal interpretadas pelo reconhecimento de voz)
7. Formata o texto de forma clara e profissional
8. Responde APENAS em português de Portugal
9. O resultado deve ser texto formatado pronto para o relatório final, NÃO em JSON

IMPORTANTE:
- Mantém a estrutura de secções do template
- Usa linguagem médica formal e precisa
- Não inventes informação que não esteja na transcrição
- Se o template tiver placeholders como [xxx], substitui-os pela informação relevante da transcrição`;

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
          { role: "user", content: `Transcrição do ditado:\n\n${transcription}\n\nAdapta este ditado à estrutura do template e devolve o relatório formatado.` },
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
    const adaptedReport = data.choices?.[0]?.message?.content || transcription;
    
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
