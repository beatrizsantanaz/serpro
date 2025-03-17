const fs = require("fs");
const https = require("https");
const axios = require("axios");
require("dotenv").config();

// 🔹 Obtendo variáveis de ambiente
const CERTIFICADO_BASE64 = process.env.CERTIFICADO_PFX_BASE64;
const CERT_PASSWORD = process.env.CERT_PASSWORD;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

// 🔹 Verificação do certificado
if (!CERTIFICADO_BASE64) {
  throw new Error("❌ ERRO: Certificado PFX não encontrado nas variáveis de ambiente!");
}

// 🔹 Criando um caminho seguro para o certificado na Vercel
const TEMP_CERT_PATH = "/tmp/temp_cert.pfx"; // Diretório permitido na Vercel

try {
  console.log("📄 Criando certificado temporário na Vercel...");
  fs.writeFileSync(TEMP_CERT_PATH, Buffer.from(CERTIFICADO_BASE64, "base64"));
  console.log("✅ Certificado criado com sucesso.");
} catch (error) {
  console.error("❌ ERRO ao criar o certificado temporário:", error.message);
  process.exit(1);
}

// 🔹 Criando o agente HTTPS usando o certificado
const agent = new https.Agent({
  pfx: fs.readFileSync(TEMP_CERT_PATH),
  passphrase: CERT_PASSWORD,
});

/**
 * 🔄 Obtém os tokens de autenticação da API do Serpro
 */
const getTokens = async () => {
  console.log("🔄 Obtendo novo Bearer Token e JWT Token...");

  try {
    const authHeader = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");

    const response = await axios.post(
      "https://autenticacao.sapi.serpro.gov.br/authenticate",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        httpsAgent: agent,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
          "Role-Type": "TERCEIROS",
        },
      }
    );

    console.log("✅ Resposta da API do Serpro:", response.data);

    const accessToken = response.data.access_token;
    const jwtToken = response.data.jwt_token || null; // Caso não seja retornado separadamente

    if (!accessToken) {
      console.error("❌ Erro: O Bearer Token não foi retornado.");
      return null;
    }

    console.log("✅ Bearer Token obtido com sucesso!");
    if (jwtToken) {
      console.log("✅ JWT Token obtido!");
    } else {
      console.warn("⚠️ Atenção: O JWT Token não foi retornado separadamente.");
    }

    return { accessToken, jwtToken };
  } catch (error) {
    console.error("❌ Erro ao obter tokens:");
    console.error(error.response ? error.response.data : error.message);
    return null;
  }
};

// 🔹 Exportando funções e agente HTTPS
module.exports = { getTokens, agent };