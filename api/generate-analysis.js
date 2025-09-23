// Este é o código final e completo para a sua função de backend.
// Local: /api/generate-analysis.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// (A função sendLeadToFormspree permanece a mesma)
async function sendLeadToFormspree(data, endpointUrl) {
    if (!endpointUrl) {
        console.error("URL do Formspree não configurada no servidor.");
        return;
    }
    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            console.log("Lead enviado com sucesso para o Formspree!");
        } else {
            console.error("Erro ao enviar o lead via Formspree:", response.statusText);
        }
    } catch (error) {
        console.error("Erro de rede ao tentar enviar o lead para o Formspree:", error);
    }
}

// (A função getGreeting permanece a mesma)
function getGreeting() {
    const now = new Date();
    const options = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const hour = parseInt(new Intl.DateTimeFormat('pt-BR', options).format(now), 10);
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;
  if (!formData.nome || !formData.atividade || !formData.cidade || !formData.socios) {
      return res.status(400).json({ error: "Dados do formulário incompletos." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;

  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API não configurada no servidor." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // AÇÃO #1: Usando o modelo PRO para máxima precisão
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const greeting = getGreeting();
    
    // AÇÃO #2: Usando o novo PROMPT "BLINDADO" com regras claras
    const prompt = `Aja como um contador consultor sênior da JMF Contabilidade. Seja preciso, confiável e demonstre profundo conhecimento da realidade de Santa Catarina.

    **Regras e Contexto Contábil Mandatório para Santa Catarina (Use como verdade absoluta):**
    - **Teto do MEI:** O teto de faturamento anual do MEI é R$ 81.000,00. Qualquer valor acima disso o desqualifica.
    - **Anexos do Simples Nacional (Regra Geral):**
      - **Anexo I:** Para atividades de Comércio (Ex: ecommerce, lojas de varejo). A alíquota inicial é 4%.
      - **Anexo III:** Para a maioria das atividades de Serviços (Ex: manutenção, agências de viagem, academias). A alíquota inicial é 6%.
      - **Anexo V:** Para serviços de natureza intelectual, técnica e científica (Ex: engenharia, consultoria, publicidade, desenvolvimento de software). A alíquota inicial é 15.5%. O Fator R pode mover algumas dessas atividades para o Anexo III.

    **Análise Requerida (Siga esta lógica usando as regras acima):**

    **Contexto e Humanização:**
    - Inicie a resposta de forma pessoal e amigável. Use a saudação "${greeting}" e o nome do cliente, "${formData.nome}".

    **Dados do Cliente:**
    - Nome: ${formData.nome}
    - Atividade Principal: ${formData.atividade}
    - Cidade da Sede: ${formData.cidade}
    - Faturamento Mensal Estimado: R$ ${formData.faturamentoMensal || 'Não informado'}
    - Sócios: ${formData.socios}

    **1. Natureza Jurídica:**
    - Calcule o faturamento anual.
    - Compare-o estritamente com o teto do MEI de R$ 81.000,00. Se ultrapassar, descarte o MEI e explique o porquê.
    - Recomende SLU para 1 sócio (acima do teto MEI) ou LTDA para 2+ sócios, explicando a proteção patrimonial.

    **2. Regime Tributário (Análise Guiada):**
    - Para a atividade "${formData.atividade}", identifique o Anexo do Simples Nacional **usando as regras mandatórias definidas no início deste prompt.**
    - Exemplo de raciocínio: "Como sua atividade é ecommerce, ela se enquadra em Comércio, que pertence ao Anexo I do Simples Nacional."
    - Informe a alíquota inicial correta para o Anexo identificado (Ex: 4% para Anexo I).
    - Mencione o CNAE mais comum para a atividade, mas deixe claro que a confirmação é um passo da consultoria. Para "ecommerce", o CNAE comum é 47.91-7/01.

    **3. Próximos Passos Essenciais:**
    - Mantenha a lista de passos: JUCESC, definição do CNAE com ajuda da JMF, e o Certificado Digital com os parceiros da JMF.

    **Conclusão e Aviso Legal:**
    - Conclua com a frase amigável sobre a proposta comercial.
    - Adicione o aviso legal completo no final.

    ---
    *Aviso Legal: Esta análise é uma simulação preliminar gerada por Inteligência Artificial com base nos dados fornecidos. Ela não substitui a consultoria de um profissional de contabilidade e está sujeita a confirmação. Os valores, CNAEs e regimes sugeridos são estimativas e podem variar.*`;

    const result = await model.generateContent(prompt);
    const analiseGerada = await result.response.text();

    const leadData = {
        subject: `Novo Lead (Simulador JMF): ${formData.nome}`,
        ...formData,
        faturamentoAnual: (Number(formData.faturamentoMensal) * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        "Análise Gerada pela IA": analiseGerada
    };
    
    await sendLeadToFormspree(leadData, formspreeEndpoint);
    
    return res.status(200).json({ analise: analiseGerada });

  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    
    const leadData = {
        subject: `Lead com FALHA NO GEMINI (Simulador JMF): ${formData.nome}`,
        ...formData,
        "Análise Gerada pela IA": "FALHA NA GERAÇÃO. Ocorreu um erro na API do Gemini. Contatar o lead manualmente."
    };
    await sendLeadToFormspree(leadData, formspreeEndpoint);

    return res.status(500).json({ error: "Falha ao gerar a análise." });
  }
}
