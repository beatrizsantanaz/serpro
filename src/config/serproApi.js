const express = require("express");
const axios = require("axios");
const { getTokens } = require("./auth");
const { getLastTwoMonths } = require("../utils/dateUtils");
const procuradorToken = cache["autenticar_procurador_token"] || null;

const router = express.Router();

// Endpoint para consultar DAS dos últimos dois meses
router.get("/das", async (req, res) => {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return res.status(500).json({ erro: "Erro ao obter tokens do Serpro" });
    }

    const { accessToken, jwtToken } = tokens;
    const [periodo1, periodo2] = getLastTwoMonths();
    const { cnpj_contratante, cnpj_autor, cnpj_contribuinte } = req.query;

    if (!cnpj_contratante || !cnpj_autor || !cnpj_contribuinte) {
      return res.status(400).json({
        erro: "Os parâmetros cnpj_contratante, cnpj_autor e cnpj_contribuinte são obrigatórios.",
      });
    }

    // Montar o corpo da requisição corretamente
    const requestBody = {
      contratante: {
        numero: cnpj_contratante,
        tipo: 2,
      },
      autorPedidoDados: {
        numero: cnpj_autor,
        tipo: 2,
      },
      contribuinte: {
        numero: cnpj_contribuinte.trim(), // Removendo quebras de linha ou espaços extras
        tipo: 2,
      },
      pedidoDados: {
        idSistema: "PGDASD",
        idServico: "CONSDECLARACAO13",
        versaoSistema: "1.0",
        dados: JSON.stringify({ periodoApuracao: [periodo1, periodo2] }),
      },
    };

    console.log("🔍 Enviando requisição para Serpro:", requestBody);

    const response = await axios.post(
      "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          jwt_token: jwtToken, // Adicionando o JWT Token no cabeçalho
          "Content-Type": "application/json",
        },
      }
    );

    // 🔹 Adicionar token do procurador se estiver disponível
if (procuradorToken) {
  headers["autenticar_procurador_token"] = procuradorToken;
  console.log("✅ Token do Procurador incluído no header.");
} else {
  console.warn("⚠️ Token do Procurador NÃO encontrado no cache.");
}

    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro ao consultar DAS:", error.response ? error.response.data : error.message);
    res.status(500).json({ erro: "Erro ao consultar DAS", detalhes: error.response ? error.response.data : error.message });
  }
});

module.exports = router;