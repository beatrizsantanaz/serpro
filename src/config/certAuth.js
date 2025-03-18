const axios = require('axios');
const { getTokens } = require('./auth'); 
require('dotenv').config();

const cache = {}; // Cache para armazenar tokens temporários

// 🔹 Função para recuperar token do cache
function obterTokenDoCache(chave) {
    return cache[chave] || null;
}

// 🔹 Função para armazenar token no cache
function armazenarTokenNoCache(chave, valor) {
    cache[chave] = valor;
    console.log(`✅ Token armazenado no cache: ${chave} => ${valor}`);
    console.log("📦 Estado atual do cache:", JSON.stringify(cache, null, 2));
}


// 🔹 Função para gerar certificado assinado via API intermediária
async function gerarCertificadoAssinado() {
    try {
        console.log("🔄 Chamando API intermediária para gerar certificado...");
        const response = await axios.post('https://planilha.cffranquias.com.br/integra/api.php', {
            "arquivoCertificado": "ativo.pfx",
            "senhaCertificado": "Ativo@2024_",
            "assinante": {
                "numero": "28076286000108",
                "nome": "ATIVO ADVISORY CONTABILIDADE LTDA",
                "tipo": "PJ",
                "papel": "autor pedido de dados"
            }
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.xml_base64) {
            console.log("✅ Certificado em Base64 extraído com sucesso.");
            return response.data.xml_base64;
        } else {
            throw new Error('Erro ao obter certificado assinado.');
        }
    } catch (error) {
        console.error('❌ Erro ao gerar certificado:', error.message);
        throw error;
    }
}

// 🔹 Função para autenticar no Serpro usando o certificado assinado
async function autenticarNoSerpro(certificadoAssinado, cnpjCliente, cnpjAutorPedido, cnpjContratante) {
    try {
        console.log("🔄 Obtendo tokens de autenticação...");
        const tokens = await getTokens();

        if (!tokens || !tokens.accessToken) {
            throw new Error('Falha na autenticação com o Serpro.');
        }

        console.log("✅ Tokens obtidos com sucesso.");
        console.log(`📌 Enviando CNPJ do contribuinte: ${cnpjCliente}`);
        console.log(`📌 Contratante: ${cnpjContratante} | AutorPedidoDados: ${cnpjAutorPedido}`);

        // Recupera `etag` do cache
        let etag = obterTokenDoCache("autenticar_procurador_token");
        console.log(`🔍 ETag recuperado do cache (antes da requisição): ${etag}`);

        const payload = {
            "contratante": { "numero": cnpjContratante, "tipo": 2 },
            "autorPedidoDados": { "numero": cnpjAutorPedido, "tipo": 2 },
            "contribuinte": { "numero": cnpjCliente, "tipo": 2 },
            "pedidoDados": {
                "idSistema": "AUTENTICAPROCURADOR",
                "idServico": "ENVIOXMLASSINADO81",
                "versaoSistema": "1.0",
                "dados": JSON.stringify({ xml: certificadoAssinado })
            }
        };

        console.log("🚀 Enviando certificado assinado para autenticação no Serpro...");

        const headers = {
            Authorization: `Bearer ${tokens.accessToken}`,
            jwt_token: tokens.jwtToken,
            "Content-Type": "application/json"
        };

        if (etag) {
            headers["If-None-Match"] = etag;
            console.log("🔹 Enviando ETag no Header:", etag);
        }

        const response = await axios.post(
            'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar',
            payload,
            { headers }
        );

        console.log("✅ Resposta da API Serpro recebida!");

        // Extrai e armazena o ETag no cache
        if (response.headers && response.headers['etag']) {
            let etagValue = response.headers['etag'].replace(/"/g, ''); // Remove aspas duplas
            console.log(`📥 ETag bruto recebido: ${etagValue}`);

            if (etagValue.startsWith("autenticar_procurador_token:")) {
                let procuradorToken = etagValue.split(":")[1]; // Extrai o token após ":"
                console.log(`✅ Token do Procurador extraído: ${procuradorToken}`);

                // Armazena o token no cache
                armazenarTokenNoCache("autenticar_procurador_token", procuradorToken);
            }
        }

        return { status: "Sucesso" };
    } catch (error) {
        if (error.response && error.response.status === 304) {
            console.warn("⚠️ Resposta 304: Dados não modificados, recuperando do cache...");

            // Exibe todos os headers da resposta para análise
            console.log("📥 Headers completos da resposta 304:", JSON.stringify(error.response.headers, null, 2));

            // Recupera o token do cache
            const cachedToken = obterTokenDoCache("autenticar_procurador_token");
            console.log(`🔍 Token do Procurador recuperado do cache após erro 304: ${cachedToken}`);

            if (cachedToken) {
                return { etag: cachedToken };
            }

            throw new Error("❌ Nenhum Token do Procurador encontrado no cache.");
        }

        console.error("❌ Erro ao autenticar no Serpro:", error.response ? error.response.data : error.message);
        return null;
    }
}

// 🔹 Fluxo completo: Gera o certificado e autentica no Serpro
async function autenticarViaCertificado(cnpjCliente) {
    try {
        console.log(`🔹 Iniciando autenticação via certificado para CNPJ: ${cnpjCliente}`);

        const certificadoAssinado = await gerarCertificadoAssinado();
        console.log("📜 Certificado gerado com sucesso.");

        const cnpjContratante = "17422651000172";
        const cnpjAutorPedido = "28076286000108";

        // 🔹 Enviar certificado para autenticação no Serpro
        const result = await autenticarNoSerpro(certificadoAssinado, cnpjCliente, cnpjAutorPedido, cnpjContratante);

        if (!result || !result.procuradorToken) {
            throw new Error("❌ Erro ao obter o Token do Procurador.");
        }

        console.log('🚀 Autenticação via certificado concluída com sucesso.');
        return result;
    } catch (error) {
        console.error('❌ Erro no processo de autenticação via certificado:', error.message);
        return null;
    }
}

module.exports = { autenticarViaCertificado, cache };
