// auth.js

const axios = require("axios");

const obterTokens = async (dados) => {
  try {
    // Estrutura do corpo da requisição
    const requestData = {
      arquivoCertificado: "ativo.pfx", // Nome do arquivo do certificado
      senhaCertificado: "Ativo@2024_", // Senha do certificado
      assinante: {
        numero: dados.numero, // CNPJ do cliente
        nome: dados.nome, // Nome do cliente
        tipo: dados.tipo, // Tipo de cliente (PJ ou PF)
        papel: dados.papel, // Papel do cliente
      },
    };

    // Enviar a requisição POST para a API externa
    const response = await axios.post(
      "https://planilha.cffranquias.com.br/integra/api.php",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Tokens obtidos:", response.data);

    // Retornar os tokens ou dados necessários
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao obter tokens:", error.message);
    throw error; // Lançar erro para ser tratado em outro lugar, se necessário
  }
};

module.exports = { obterTokens };
