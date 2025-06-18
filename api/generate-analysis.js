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
    const prompt = `Aja como um contador consultor especialista em abertura de empresas no Brasil. Com base nos dados a seguir, gere uma análise preliminar OBJETIVA e CLARA em 3 partes, usando markdown para formatação (negrito para títulos).
    
    **Dados do Cliente:**
    - Atividade Principal: ${formData.atividade}
    - Cidade da Sede: ${formData.cidade}
    - Faturamento Mensal Estimado: R$ ${formData.faturamentoMensal || 'Não informado'}
    - Número de Sócios: ${formData.socios}
    - Número de Funcionários: ${formData.funcionarios}
    
    **Análise Requerida:**
    
    **1. Natureza Jurídica Sugerida:**
    Analise o número de sócios e sugira o tipo de empresa mais adequado (SLU, Sociedade Limitada, etc.). Justifique brevemente a escolha.
    
    **2. Regime Tributário Preliminar:**
    Considerando a atividade e o faturamento, indique se o Simples Nacional é uma opção viável. Se não, mencione Lucro Presumido como alternativa. Dê uma estimativa superficial da alíquota inicial para a atividade no regime sugerido.
    
    **3. Próximos Passos Essenciais:**
    Liste 3 a 4 passos práticos que o empreendedor deve tomar para prosseguir com a abertura da empresa, como "Consulta de Viabilidade na Junta Comercial" e "Definição do Capital Social".
    
    Conclua a análise com uma frase amigável, informando que os detalhes finais serão fornecidos na proposta comercial.

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
