// Este é o código final e completo para a sua função de backend.
// Local: /api/generate-analysis.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Função para obter a saudação correta baseada no fuso horário de Brasília
function getGreeting() {
    const now = new Date();
    const options = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
    const hour = parseInt(new Intl.DateTimeFormat('pt-BR', options).format(now), 10);

    if (hour >= 5 && hour < 12) {
        return "Bom dia";
    } else if (hour >= 12 && hour < 18) {
        return "Boa tarde";
    } else {
        return "Boa noite";
    }
}

// Função para enviar o lead para o Formspree
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


// Função principal que lida com a requisição do site
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;
  if (!formData.atividade || !formData.cidade || !formData.socios) {
      return res.status(400).json({ error: "Dados do formulário incompletos." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;

  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API não configurada no servidor." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // NOVO PROMPT - Mais dinâmico e inteligente
    const prompt = `Aja como um contador consultor sênior da JMF Contabilidade, especialista em abertura de empresas em Santa Catarina. Sua tarefa é criar uma análise personalizada, calorosa e precisa para um potencial cliente.

    **Contexto e Humanização:**
    - Inicie a resposta de forma pessoal e amigável. Use a saudação "${greeting}" e o nome do cliente, "${formData.nome}".
    - Demonstre empatia, reconhecendo que abrir uma empresa é um passo importante.

    **Dados do Cliente para Análise:**
    - Nome do Cliente: ${formData.nome}
    - Atividade Principal: ${formData.atividade}
    - Cidade da Sede: ${formData.cidade}
    - Faturamento Mensal Estimado: R$ ${formData.faturamentoMensal || 'Não informado'}
    - Número de Sócios: ${formData.socios}
    - Número de Funcionários: ${formData.funcionarios}

    **Análise Técnica Requerida (Siga esta lógica):**

    **1. Natureza Jurídica (Tipo de Empresa):**
    - Verifique o faturamento anual (faturamento mensal * 12) contra o **teto de faturamento ATUAL do MEI (Microempreendedor Individual)** que você conhece em sua base de dados.
    - Se o faturamento ultrapassar o teto atual do MEI, **NÃO sugira o MEI**. Explique brevemente o porquê.
    - Se for 1 sócio e o faturamento estiver acima do teto do MEI, recomende a **SLU (Sociedade Limitada Unipessoal)**, explicando os benefícios da proteção patrimonial.
    - Se for mais de 1 sócio, recomende a **Sociedade Limitada (LTDA)**.

    **2. Regime Tributário (Análise Aprofundada):**
    - Com base na atividade "${formData.atividade}", **pesquise em sua base de dados o código CNAE (Classificação Nacional de Atividades Econômicas) mais comum e adequado.**
    - Uma vez identificado o CNAE provável, **determine o Anexo correto do Simples Nacional** para essa atividade.
    - **Justifique a escolha do Anexo** (ex: "atividades de desenvolvimento de software se enquadram no Anexo V, mas podem ir para o Anexo III se o Fator R for atendido").
    - Com base no Anexo, **informe a alíquota inicial da primeira faixa** de faturamento do Simples Nacional. Deixe claro que esta é uma estimativa inicial.
    - **NÃO sugira genericamente "Anexo III ou IV".** Faça uma análise real e apresente a conclusão mais provável.

    **3. Próximos Passos Essenciais em Santa Catarina:**
    - Mantenha a lista de passos práticos, incluindo a **JUCESC**, a importância da definição correta do CNAE (que você acabou de analisar) e a emissão do **Certificado Digital (e-CNPJ)**, mencionando que a JMF Contabilidade cuida disso através de parceiros.

    **Conclusão:**
    - Finalize com uma frase amigável, informando que a equipe da JMF Contabilidade já está preparando uma proposta comercial detalhada e personalizada.

    **IMPORTANTE:** Ao final de TODA a resposta, adicione o seguinte aviso legal, sem nenhuma alteração:
    ---
    *Aviso Legal: Esta análise é uma simulação preliminar gerada por Inteligência Artificial com base nos dados fornecidos. Ela não substitui a consultoria de um profissional de contabilidade e está sujeita a confirmação. Os valores, CNAEs e regimes sugeridos são estimativas e podem variar.*`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analiseGerada = await response.text();

    const leadData = {
        subject: `Novo Lead (Simulador JMF): ${formData.nome}`,
        ...formData,
        faturamentoAnual: (Number(formData.faturamentoMensal) * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        "Análise Gerada pela IA": analiseGerada
    };
    
    await sendLeadToFormspree(leadData, formspreeEndpoint);
    
    const respostaParaSite = {
      analise: analiseGerada
    };

    return res.status(200).json(respostaParaSite);

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


