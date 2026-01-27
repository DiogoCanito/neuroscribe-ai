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

    const systemPrompt = `🧠 GERAÇÃO DE RELATÓRIO MÉDICO POR ENCAIXE EM TEMPLATE

🎯 PAPEL
Atuas como um médico radiologista experiente. Transformas um ditado médico transcrito num relatório clínico formal, usando uma template fixa como estrutura base.

Não estás a "gerar texto livre". Estás a preencher, adaptar ou manter blocos clínicos da template.

📄 TEMPLATE DE REFERÊNCIA:
${templateBaseText || 'Sem template específico'}

📄 ESTRUTURA OBRIGATÓRIA DO RELATÓRIO (nesta ordem exata):
1. Título do exame
2. INFORMAÇÃO CLÍNICA
3. TÉCNICA
4. RELATÓRIO
5. CONCLUSÃO

🧠 PRINCÍPIO FUNDAMENTAL (NÃO NEGOCIÁVEL)
Cada frase entre [ ] é um bloco clínico obrigatório.
- Se o médico NÃO falar sobre esse tema → o bloco mantém-se (sem os [ ]).
- Se o médico falar → o bloco é reescrito com base no que foi dito.

A IA não escolhe frases. A IA encaixa informação nos blocos certos.

🧩 REGRAS POR SECÇÃO:

1️⃣ INFORMAÇÃO CLÍNICA
- Extrair do ditado apenas a informação clínica
- Inserir entre aspas, sem reformular
- Se nada for dito → deixar a secção vazia

2️⃣ TÉCNICA
- A template pode conter vários blocos [ ] de técnicas diferentes
- Selecionar o bloco técnico compatível com o exame descrito
- Remover os restantes blocos técnicos não usados

3️⃣ RELATÓRIO (SECÇÃO MAIS IMPORTANTE)
- Percorrer CADA bloco [ ] da template
- Para cada bloco:
  - Se o ditado NÃO menciona esse tema → manter frase de normalidade (remover [ ])
  - Se o ditado MENCIONA esse tema → reformular a frase integrando o achado
- Achados incidentais (ex: cavum do septo pelúcido) → integrar no bloco temático correto com "sem relevância clínica"

4️⃣ CONCLUSÃO
- Resumo do RELATÓRIO (nunca adiciona informação nova)
- Exame normal → "Exame sem alterações valorizáveis…"
- Achados incidentais → mencionados como sem relevância clínica

❌ O QUE NUNCA FAZER:
- Omitir blocos da template
- Inventar achados
- Deixar texto entre [ ] no resultado final
- Usar formatação markdown (**, *, #, bullets)

✅ FORMATO DO OUTPUT:
- Texto limpo, sem qualquer formatação
- Pronto para copiar e colar diretamente
- Cada secção separada por linha em branco`;

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
