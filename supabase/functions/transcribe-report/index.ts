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

    const systemPrompt = `És um radiologista experiente especializado em relatórios médicos. O teu trabalho é adaptar ditados médicos à estrutura de um template de relatório.

TEMPLATE A USAR:
${templateBaseText || 'Sem template específico'}

REGRAS DE FORMATAÇÃO DO TEMPLATE:
1. O template contém OPÇÕES entre colchetes []. Cada bloco [...] representa uma frase opcional ou alternativa.
2. Com base no ditado, ESCOLHE as opções apropriadas removendo os colchetes.
3. Se o ditado menciona achados específicos, MODIFICA a frase escolhida para incluir esses achados.
4. Se uma opção não se aplica (o ditado não menciona esse aspeto), podes OMITIR essa linha.
5. Quando há várias opções similares (ex: diferentes técnicas), escolhe A QUE CORRESPONDE ao que foi ditado.

ESTRUTURA DO RELATÓRIO:
- INFORMAÇÃO CLÍNICA: Extrai do ditado a queixa/motivo do exame
- TÉCNICA: Escolhe a opção técnica apropriada do template
- RELATÓRIO: Preenche com os achados, escolhendo e adaptando as opções do template
- CONCLUSÃO: ADICIONA SEMPRE uma secção de conclusão no final resumindo os achados principais

INSTRUÇÕES ESPECÍFICAS:
1. Mantém TODOS os cabeçalhos do template (INFORMAÇÃO CLÍNICA, TÉCNICA, RELATÓRIO, etc.)
2. Remove TODOS os colchetes [] do resultado final
3. Quando o ditado menciona achados específicos (ex: "cavum do septo pelúcido"), integra-os na frase apropriada
4. A CONCLUSÃO deve ser breve e destacar os achados relevantes ou indicar "exame sem alterações" se normal
5. Usa português de Portugal formal e terminologia médica precisa
6. NÃO inventes achados - usa apenas o que está no ditado
7. Se algo não foi mencionado no ditado, usa as opções "normais" do template

EXEMPLO DE TRANSFORMAÇÃO:
- Template: "[Não há alterações valorizáveis do sinal ou da morfologia do parênquima encefálico.]"
- Se ditado diz "parênquima normal": Remove colchetes → "Não há alterações valorizáveis do sinal ou da morfologia do parênquima encefálico."
- Se ditado menciona lesão: Adapta → "Identifica-se pequena lesão hiperintensa em T2..."

FORMATO DE SAÍDA:
Devolve o relatório completo formatado, sem colchetes, com todas as secções preenchidas e uma CONCLUSÃO no final.`;

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
