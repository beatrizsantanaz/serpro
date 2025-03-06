/*const express = require("express");
const axios = require("axios");
const { getTokens } = require("../config/auth");
const { getLastTwoMonths, getFutureConsolidationDate } = require("../utils/dateUtils");

const router = express.Router();

router.post("/das", async (req, res) => {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return res.status(500).json({ erro: "Erro ao obter tokens do Serpro" });
    }

    const { accessToken, jwtToken } = tokens;
    const { cnpj_contratante, cnpj_autor, cnpj_contribuinte, periodoApuracao, recalcular } = req.body;

    if (!cnpj_contratante || !cnpj_autor || !cnpj_contribuinte) {
      return res.status(400).json({
        erro: "Os parâmetros cnpj_contratante, cnpj_autor e cnpj_contribuinte são obrigatórios.",
      });
    }

    // Se não for enviado o período, usamos o mais recente automaticamente
    const periodo = periodoApuracao || getLastTwoMonths()[1]; // Sempre pega o último mês

    let requestBody;

    if (recalcular) {
      // 🔹 Se "recalcular" for true, geramos um novo DAS
      const dataConsolidacao = getFutureConsolidationDate(5); // 5 dias à frente

      requestBody = {
        contratante: { numero: cnpj_contratante.trim(), tipo: 2 },
        autorPedidoDados: { numero: cnpj_autor.trim(), tipo: 2 },
        contribuinte: { numero: cnpj_contribuinte.trim(), tipo: 2 },
        pedidoDados: {
          idSistema: "PGDASD",
          idServico: "GERARDAS12",
          versaoSistema: "1.0",
          dados: JSON.stringify({ periodoApuracao: periodo, dataConsolidacao }),
        },
      };

      console.log("🔍 Recalculando DAS com:", requestBody);
    } else {
      // 🔹 Se "recalcular" for false ou ausente, apenas consultamos o DAS existente
      requestBody = {
        contratante: { numero: cnpj_contratante.trim(), tipo: 2 },
        autorPedidoDados: { numero: cnpj_autor.trim(), tipo: 2 },
        contribuinte: { numero: cnpj_contribuinte.trim(), tipo: 2 },
        pedidoDados: {
          idSistema: "PGDASD",
          idServico: "CONSDECLARACAO13",
          versaoSistema: "1.0",
          dados: JSON.stringify({ periodoApuracao: periodo }),
        },
      };

      console.log("🔍 Consultando DAS com:", requestBody);
    }

    const response = await axios.post(
      "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Emitir",
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

    res.status(200).json({
      sucesso: true,
      dadosRetornados: response.data,
    });

  } catch (error) {
    console.error("❌ Erro ao processar DAS:", error.response ? error.response.data : error.message);
    res.status(500).json({ erro: "Erro ao processar DAS", detalhes: error.response ? error.response.data : error.message });
  }
});

module.exports = router;
*/