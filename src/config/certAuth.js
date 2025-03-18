const axios = require('axios');
const { getTokens } = require('./auth'); // 🔹 Importando função de autenticação
require('dotenv').config();

const cache = {}; // 🔹 Cache para armazenar tokens temporários

// 🔹 Função para recuperar token do cache
function obterTokenDoCache(chave) {
    return cache[chave] || null;
}

// 🔹 Função para armazenar token no cache
function armazenarTokenNoCache(chave, valor) {
    cache[chave] = valor;
    console.log(`✅ Token armazenado no cache: ${chave} => ${valor}`);
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

        console.log("📜 Resposta da API intermediária:", JSON.stringify(response.data, null, 2));

        if (response.data && response.data.xml_base64) {
            console.log("✅ Certificado em Base64 extraído com sucesso.");
            return response.data.xml_base64;
        } else {
            console.error("❌ Erro: Certificado `xml_base64` não foi retornado.");
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
            console.error("❌ Erro ao obter tokens do Serpro.");
            throw new Error('Falha na autenticação com o Serpro.');
        }

        console.log("✅ Tokens obtidos com sucesso.");
        console.log(`📌 Enviando CNPJ do contribuinte: ${cnpjCliente}`);
        console.log(`📌 Contratante: ${cnpjContratante} | AutorPedidoDados: ${cnpjAutorPedido}`);

        let etagToken = cache[cnpjAutorPedido] || null;

        // 🔹 Definição correta do payload
        const payload = {
            "contratante": {
                "numero": cnpjContratante,
                "tipo": 2
            },
            "autorPedidoDados": {
                "numero": cnpjAutorPedido,
                "tipo": 2
            },
            "contribuinte": {
                "numero": cnpjCliente,
                "tipo": 2
            },
            "pedidoDados": {
                "idSistema": "AUTENTICAPROCURADOR",
                "idServico": "ENVIOXMLASSINADO81",
                "versaoSistema": "1.0",
                "dados": JSON.stringify({ xml: certificadoAssinado })
            }
        };

        console.log("🚀 Enviando certificado assinado para autenticação no Serpro...");
        console.log("📜 Payload enviado:", JSON.stringify(payload, null, 2));

        const headers = {
            Authorization: `Bearer ${tokens.accessToken}`,
            jwt_token: tokens.jwtToken,
            "Content-Type": "application/json"
        };

        if (etagToken && cnpjAutorPedido !== cnpjContratante) {
            console.log("⚡ Usando token etag armazenado:", etagToken);
            headers["If-None-Match"] = etagToken;
        }

        // 🔹 Faz a requisição ao Serpro
        const response = await axios.post(
            'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar',
            payload,
            { headers }
        );

        console.log("✅ Resposta da API Serpro:", JSON.stringify(response.data, null, 2));
        console.log("📥 Headers da resposta:", JSON.stringify(response.headers, null, 2));

        // 🔹 Verifica se o token do procurador veio no header da resposta
        if (response.headers) {
            const procuradorToken = response.headers['autenticar_procurador_token'] || 
                                    response.headers['Autenticar-Procurador-Token'] || 
                                    response.headers['AUTENTICAR_PROCURADOR_TOKEN'];
        
            if (procuradorToken) {
                armazenarTokenNoCache("autenticar_procurador_token", procuradorToken);
                console.log("✅ Token do Procurador armazenado:", procuradorToken);
            } else {
                console.warn("⚠️ Token do procurador não encontrado no header da resposta.");
            }
        }
        
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 304) {
            console.warn("⚠️ Resposta 304: Dados não modificados, recuperando do cache...");
            const etag = error.response.headers['etag'];

            if (etag) {
                console.log("✅ Armazenando novo etag no cache:", etag);
                cache[cnpjAutorPedido] = etag;
            }

            return { message: "Usando cache", etag };
        }

        console.error("❌ Erro ao autenticar no Serpro:", error.response ? error.response.data : error.message);
        throw error;
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
        const tokens = await autenticarNoSerpro(certificadoAssinado, cnpjCliente, cnpjAutorPedido, cnpjContratante);

        console.log('🚀 Autenticação via certificado concluída com sucesso.');
        return tokens;
    } catch (error) {
        console.error('❌ Erro no processo de autenticação via certificado:', error.message);
        return null;
    }
}

module.exports = { autenticarViaCertificado, cache };