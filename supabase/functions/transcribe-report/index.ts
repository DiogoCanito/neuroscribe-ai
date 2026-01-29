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
1. Título do exame (em MAIÚSCULAS)
2. INFORMAÇÃO CLÍNICA:
3. TÉCNICA:
4. RELATÓRIO:
5. CONCLUSÃO:

⭐ REGRA DE OURO (NÃO NEGOCIÁVEL)
A IA deve respeitar RIGOROSAMENTE os parágrafos e espaçamentos definidos na template.
Cada bloco entre [ ] corresponde a UM parágrafo clínico independente.
O espaçamento, separação de linhas e ordem devem ser mantidos EXATAMENTE como na template.

🧩 FUNCIONAMENTO DOS BLOCOS [ ]

1️⃣ PARÁGRAFOS COMO UNIDADES CLÍNICAS
- Cada frase entre [ ] é um parágrafo autónomo e um tema clínico específico
- A IA NUNCA deve fundir parágrafos
- A IA NUNCA deve alterar a ordem dos parágrafos
- Cada parágrafo mantém a sua posição e espaçamento originais

2️⃣ QUANDO O MÉDICO FALA SOBRE O TEMA
Se o ditado mencionar o tema de um bloco [ ]:
- Ir EXATAMENTE a esse parágrafo
- Reformular o texto dentro desse parágrafo com linguagem médica formal
- O novo texto SUBSTITUI o conteúdo entre [ ]
- O parágrafo mantém o MESMO LUGAR e ESPAÇAMENTO
- Continua a ser um parágrafo independente

3️⃣ QUANDO O MÉDICO NÃO FALA SOBRE O TEMA
Se o ditado NÃO mencionar o tema do bloco [ ]:
- Manter o texto EXATAMENTE como está
- APENAS remover os parênteses retos [ ]
- O parágrafo mantém-se com o mesmo texto, no mesmo local, com o mesmo espaçamento

📐 REGRAS DE FORMATAÇÃO ESPECÍFICAS

SECÇÃO "INFORMAÇÃO CLÍNICA":
- Extrair o motivo do exame do ditado
- Inserir o texto entre aspas duplas: "texto aqui"
- Se nada for dito → escrever "Não fornecida."
- Exemplo: "Cefaleias persistentes há 2 semanas."

SECÇÃO "TÉCNICA":
- A template pode conter vários blocos [ ] de técnicas diferentes
- Selecionar o bloco técnico compatível com o exame descrito
- Remover os restantes blocos técnicos não usados
- Manter descrição técnica completa sem abreviar

SECÇÃO "RELATÓRIO":
- Percorrer CADA bloco [ ] da template, um por um
- Para cada bloco:
  - Se o ditado NÃO menciona esse tema → manter frase de normalidade (remover [ ]) como parágrafo independente
  - Se o ditado MENCIONA esse tema → reformular APENAS esse parágrafo integrando o achado
- Achados incidentais → integrar no bloco temático correto
- PRESERVAR a separação entre parágrafos (linha em branco entre cada um)
- Cada parágrafo deve começar com letra maiúscula e terminar com ponto final

SECÇÃO "CONCLUSÃO":
- Resumo do RELATÓRIO (nunca adiciona informação nova)
- FORMATO OBRIGATÓRIO: lista com travessão "- " no início de cada item
- Cada achado relevante numa linha separada
- Exame normal → "- Exame sem alterações valorizáveis."
- Exemplo de formato:
  - Achado 1 descrito aqui.
  - Achado 2 descrito aqui.
  - Achado incidental sem relevância clínica.

📐 REGRAS DE ESPAÇAMENTO

MANTER SEMPRE:
- Uma linha em branco entre cada secção (INFORMAÇÃO CLÍNICA, TÉCNICA, RELATÓRIO, CONCLUSÃO)
- Uma linha em branco entre cada parágrafo dentro do RELATÓRIO
- Estrutura visual limpa e profissional

NUNCA FAZER:
- Juntar dois parágrafos num só
- Criar bullets com asteriscos ou outros símbolos (usar apenas "- ")
- Alterar o número de parágrafos do template
- Reordenar blocos
- Usar formatação markdown (**, *, #)

❌ O QUE NUNCA FAZER:
- Omitir blocos da template
- Inventar achados não mencionados
- Deixar texto entre [ ] no resultado final
- Usar formatação markdown (**, *, #, bullets com asterisco)
- Fundir parágrafos
- Reordenar blocos

✅ FORMATO DO OUTPUT:
- Texto limpo, sem qualquer formatação markdown
- Pronto para copiar e colar diretamente
- Cada parágrafo do RELATÓRIO separado por linha em branco
- Conclusões em lista com travessão "- "
- Estrutura visual profissional

🧠 FRASE-GUIA MENTAL:
"Cada parágrafo da template é intocável na forma. Só posso mudar o conteúdo se o médico falar sobre esse tema."`;

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
