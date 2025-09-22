// Este é o código final e completo para a sua função de backend.
// Local: /api/generate-analysis.js

import { GoogleGenerativeAI } from "@google/generative-ai";

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
    
    // ATUALIZAÇÃO: Adicionado o pedido do aviso legal no final do prompt.
    const prompt = `Aja como um contador consultor sênior da JMF Contabilidade, especialista em abertura de empresas em Santa Catarina. Sua análise deve ser integrada e holística, onde cada recomendação considera TODOS os dados fornecidos pelo cliente para evitar contradições.
    
    **Dados do Cliente:**
    - Atividade Principal: ${formData.atividade}
    - Cidade da Sede: ${formData.cidade}
    - Faturamento Mensal Estimado: R$ ${formData.faturamentoMensal || 'Não informado'}
    - Número de Sócios: ${formData.socios}
    - Número de Funcionários: ${formData.funcionarios}
    
    **Análise Requerida:**
    
    **1. Natureza Jurídica (Tipo de Empresa):**
    Sua primeira verificação deve ser o faturamento. Se o faturamento anual (faturamento mensal * 12) ultrapassar R$ 81.000,00, **NÃO mencione o MEI (Microempreendedor Individual)** como uma opção viável, mesmo que haja apenas um sócio.
    - Se houver apenas 1 sócio e o faturamento for superior ao limite do MEI, sugira a **SLU (Sociedade Limitada Unipessoal)**, explicando que ela oferece a proteção do patrimônio pessoal sem a necessidade de outros sócios.
    - Se houver mais de 1 sócio, sugira a **Sociedade Limitada (LTDA)**.
    
    **2. Regime Tributário Preliminar:**
    Baseado na Natureza Jurídica sugerida (SLU ou LTDA) e no faturamento, explique por que o **Simples Nacional** é a escolha mais comum e vantajosa para este porte de empresa. Dê uma estimativa da alíquota inicial para a atividade ("${formData.atividade}") dentro do anexo correspondente do Simples Nacional (geralmente Anexo III ou IV para serviços). Deixe claro que o enquadramento exato depende do CNAE específico.
    
    **3. Próximos Passos Essenciais em Santa Catarina:**
    Liste de 3 a 4 passos práticos e essenciais para a abertura, mencionando a **Junta Comercial de Santa Catarina (JUCESC)**, a importância da definição do CNAE correto para a atividade, e a necessidade do Certificado Digital.
    
    Conclua a análise com uma frase amigável, informando que a equipe da JMF Contabilidade já está preparando uma proposta comercial detalhada.

    **IMPORTANTE:** Ao final de TODA a resposta, adicione o seguinte aviso legal, sem nenhuma alteração:
    ---
    *Aviso Legal: Esta análise é uma simulação preliminar gerada por Inteligência Artificial com base nos dados fornecidos. Ela não substitui a consultoria de um profissional de contabilidade e está sujeita a confirmação. Os valores e regimes sugeridos são estimativas e podem variar.*`;

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

