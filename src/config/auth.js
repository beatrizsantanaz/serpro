const fs = require("fs");
const https = require("https");
const axios = require("axios");
require("dotenv").config();

const CERT_PATH = process.env.CERT_PATH;
const CERT_PASSWORD = process.env.CERT_PASSWORD;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

const agent = new https.Agent({
  pfx: fs.readFileSync(CERT_PATH),
  passphrase: CERT_PASSWORD,
});

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
    const jwtToken = response.data.jwt_token; // Se o Serpro retornar um JWT separado

    if (!accessToken) {
      console.error("❌ Erro: O Bearer Token não foi retornado.");
      return null;
    }

    console.log("✅ Bearer Token obtido:", accessToken);
    console.log("✅ JWT Token obtido:", jwtToken || "Não retornado separadamente.");

    return { accessToken, jwtToken };
  } catch (error) {
    console.error("❌ Erro ao obter tokens:");
    console.log(error.response ? error.response.data : error.message);
    return null;
  }
};

module.exports = { getTokens };
