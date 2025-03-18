const express = require("express");
const axios = require("axios");
const { getTokens } = require("../config/auth");
const { getLastTwoMonths, getFutureConsolidationDate } = require("../utils/dateUtils");
const { autenticarViaCertificado, cache } = require("../config/certAuth");

require('dotenv').config();

const router = express.Router();

const WEBHOOK_URLS = {
    "CF Contabilidade": "https://webhook.cfcontabilidade.com",
    "CF Smart": "https://n8n-n8n.k6fcpj.easypanel.host/webhook/32d4027e-cb57-49b1-85d5-76a472d001d0"
};

router.post("/das", async (req, res) => {
    try {
        const { cnpj_contratante, cnpj_autor, cnpj_contribuinte, periodoApuracao, recalcular, cliente, telefone } = req.body;

        if (!cnpj_contratante || !cnpj_autor || !cnpj_contribuinte || !cliente) {
            return res.status(400).json({
                erro: "Os parâmetros cnpj_contratante, cnpj_autor, cnpj_contribuinte e cliente são obrigatórios."
            });
        }

        // 🔹 Determinar período de apuração
        const periodo = periodoApuracao || getLastTwoMonths()[1];

        console.log("📦 Cache atual antes de pegar o Token do Procurador:", JSON.stringify(cache, null, 2));

         // 🔹 Se não há procuração, precisa autenticar via Certificado primeiro
        if (cnpj_contratante !== cnpj_autor) {
            console.log("⚠️ O contratante NÃO tem procuração. Autenticando via certificado...");
            tokens = await autenticarViaCertificado(cnpj_contribuinte);

            // 🛑 Certifique-se de extrair o Token do Procurador antes de usá-lo
            procuradorToken = tokens.procuradorToken;
            
            if (!procuradorToken) {  
                return res.status(500).json({ erro: "Falha na autenticação via certificado." });
            }
            
            console.log("✅ Retornando ao fluxo com Token do Procurador:", procuradorToken);
            cache["procurador_token"] = procuradorToken;
        
            if (!procuradorToken) {
                return res.status(500).json({ erro: "Erro: Token do Procurador não encontrado após autenticação." });
            }
        } else {
            // 🔹 Se há procuração, autentica normalmente
            console.log("✅ O contratante tem procuração. Autenticando via getTokens...");
            tokens = await getTokens();
        }

        if (!tokens || !tokens.accessToken) {
            return res.status(500).json({ erro: "Erro ao obter tokens do Serpro" });
        }

        const { accessToken, jwtToken } = tokens;

        let requestBody;

        if (recalcular) {
            // 🔹 Recalcular DAS
            const dataConsolidacao = getFutureConsolidationDate(5);
            requestBody = {
                contratante: { numero: cnpj_contratante.trim(), tipo: 2 },
                autorPedidoDados: { numero: cnpj_autor.trim(), tipo: 2 },
                contribuinte: { numero: cnpj_contribuinte.trim(), tipo: 2 },
                pedidoDados: {
                    idSistema: "PGDASD",
                    idServico: "GERARDAS12",
                    versaoSistema: "1.0",
                    dados: JSON.stringify({ periodoApuracao: periodo, dataConsolidacao })
                }
            };
            console.log("🔍 Recalculando DAS com:", requestBody);
        } else {
            // 🔹 Consultar DAS normal
            requestBody = {
                contratante: { numero: cnpj_contratante.trim(), tipo: 2 },
                autorPedidoDados: { numero: cnpj_autor.trim(), tipo: 2 },
                contribuinte: { numero: cnpj_contribuinte.trim(), tipo: 2 },
                pedidoDados: {
                    idSistema: "PGDASD",
                    idServico: "CONSDECLARACAO13",
                    versaoSistema: "1.0",
                    dados: JSON.stringify({ periodoApuracao: periodo })
                }
            };
            console.log("🔍 Consultando DAS com:", requestBody);
        }

       // 🔹 Definir cabeçalhos da requisição
const headers = {
    Authorization: `Bearer ${accessToken}`,
    jwt_token: jwtToken,
    "Content-Type": "application/json"
};

  // 🔹 Adiciona o Token do Procurador, se necessário
  if (procuradorToken) {
    headers["autenticar_procurador_token"] = procuradorToken;
    console.log("✅ Token do Procurador incluído no header.");
}

// 🔹 Enviar requisição ao Serpro com os cabeçalhos corretos
const response = await axios.post(
    "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Emitir",
    requestBody,
    { headers } // Envia o objeto `headers` com os valores corretos
);


        // 🔹 Enviar webhook em segundo plano
        const webhookUrl = WEBHOOK_URLS[cliente] || "https://contabhub.app.n8n.cloud/webhook/default";
        const webhookPayload = {
            ...response.data,
            cliente,
            cnpj_contratante,
            cnpj_autor,
            cnpj_contribuinte,
            periodo,
            telefone,
            recalculo: recalcular ? "Sim" : "Não"
        };

        console.log(`🚀 Enviando webhook para: ${webhookUrl}`);
        axios.post(webhookUrl, webhookPayload)
            .then(() => console.log("✅ Webhook enviado com sucesso."))
            .catch(err => console.error("❌ Erro ao enviar webhook:", err.response ? err.response.data : err.message));

    } catch (error) {
        console.error("❌ Erro ao processar DAS:", error.response ? error.response.data : error.message);
        res.status(500).json({ erro: "Erro ao processar DAS", detalhes: error.response ? error.response.data : error.message });
    }
});

module.exports = router;
