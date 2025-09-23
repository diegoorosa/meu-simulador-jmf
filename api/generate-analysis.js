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
    - **Teto do MEI:** O teto de faturamento anual do MEI é R$ 81.000,00.
    - **Anexos do Simples Nacional (Regra Geral):**
      - **Anexo I:** Para atividades de Comércio (Ex: lojas, ecommerce). Alíquota inicial de 4%.
      - **Anexo III:** Para a maioria das atividades de Serviços (Ex: academias, oficinas, agências de viagem, fisioterapia). Alíquota inicial de 6%.
      - **Anexo V:** Para serviços de natureza intelectual, técnica e científica (Ex: consultoria, publicidade, engenharia, desenvolvimento de software). Alíquota inicial de 15.5%. Algumas atividades podem ir para o Anexo III se o Fator R for atendido.

    **Análise Requerida (Siga esta lógica usando as regras acima):**

    **Contexto e Humanização:**
    - Inicie a resposta de forma pessoal e amigável. Use a saudação "${greeting}" e o nome do cliente, "${formData.nome}".

    **Dados do Cliente:**
    - Nome: ${formData.nome}
    - Atividade: ${formData.atividade}
    - Cidade: ${formData.cidade}
    - Faturamento Mensal: R$ ${formData.faturamentoMensal || 'Não informado'}
    - Sócios: ${formData.socios}

    **1. Natureza Jurídica:**
    - Calcule o faturamento anual. Compare-o com o teto do MEI. Se ultrapassar, descarte o MEI e explique o porquê.
    - Recomende SLU para 1 sócio (acima do teto MEI) ou LTDA para 2+ sócios.

    **2. Regime Tributário (Análise Universal e Consultiva):**
    - **Passo 1: Classifique a Atividade.** Analise a atividade ("${formData.atividade}") e, usando as "Regras Mandatórias", classifique-a em uma das três categorias: Comércio (Anexo I), Serviços (Anexo III), ou Serviços Intelectuais/Técnicos (Anexo V).
    - **Passo 2: Informe a Base.** Com base na classificação, informe o Anexo do Simples Nacional e a alíquota inicial. Se for Anexo V, mencione a possibilidade do Fator R.
    - **Passo 3: Eduque e Exemplifique.**
      - **NÃO afirme um CNAE específico como sendo "o correto".**
      - Explique que a definição exata do CNAE é um passo crucial da consultoria e depende de detalhes da operação.
      - Para a categoria identificada, forneça **um ou dois exemplos de CNAEs plausíveis** para ilustrar o conceito, deixando claro que são apenas exemplos.
      - Por exemplo, se a atividade for "agência de marketing", classifique como Serviços (Anexo III/V), explique sobre o Fator R e dê como exemplos o CNAE 7311-4/00 (Agências de publicidade) e 7319-0/04 (Consultoria em publicidade).
      - Se a atividade for "venda de sapatos", classifique como Comércio (Anexo I) e dê como exemplo o CNAE 4782-2/01 (Comércio varejista de calçados).
    - **Passo 4: Chame para a Ação.** Reforce que a equipe da JMF Contabilidade tem a expertise para ajudar a definir o(s) código(s) perfeito(s) para o negócio dele.

    **3. Próximos Passos Essenciais:**
    - Mantenha a lista de passos práticos, incluindo a **JUCESC**, a importância da definição correta do CNAE (que você acabou de analisar) e a emissão do **Certificado Digital (e-CNPJ)**, mencionando que a JMF Contabilidade cuida disso através de parceiros.

    **Conclusão e Aviso Legal:**
    - Conclua com uma frase amigável e adicione o aviso legal completo.

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


