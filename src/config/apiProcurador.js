// serproApi.js

const axios = require("axios");
const { obterTokens } = require("./authProcurador");

const consultarSerpro = async (dados) => {
  try {
    // Obter os tokens de autenticação
    const tokens = await obterTokens(dados);
    if (!tokens) {
      throw new Error("Falha na autenticação");
    }

    // Aqui você pode usar os tokens para fazer a requisição à API do Serpro
    const { accessToken, jwtToken } = tokens;

    // Exemplo de dados para a consulta (ajuste conforme necessário)
    const requestBody = {
      contratante: {
        numero: dados.cnpj_contratante,
        tipo: 2,
      },
      autorPedidoDados: {
        numero: dados.cnpj_autor,
        tipo: 2,
      },
      contribuinte: {
        numero: dados.cnpj_contribuinte,
        tipo: 2,
      },
      pedidoDados: {
        idSistema: "PGDASD",
        idServico: "CONSDECLARACAO13",
        versaoSistema: "1.0",
        dados: JSON.stringify({ periodoApuracao: ["202301", "202302"] }), // Exemplo de períodos
      },
    };

    const response = await axios.post(
      "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          jwt_token: jwtToken,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Resposta da API do Serpro:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao consultar a API do Serpro:", error.message);
    throw error; // Lançar erro para ser tratado em outro lugar, se necessário
  }
};

module.exports = { consultarSerpro };
