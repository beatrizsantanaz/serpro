const axios = require('axios');
const { getTokens } = require('./auth'); // 🔹 Importando função de autenticação
require('dotenv').config();

const cache = {}; // 🔹 Cache para armazenar o etag/token

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

        // 🔹 Log para depuração da resposta da API
        console.log("📜 Resposta da API intermediária:", JSON.stringify(response.data, null, 2));

        if (response.data && response.data.xml_base64) {
            console.log("✅ Certificado em Base64 extraído com sucesso.");
            return response.data.xml_base64;  
        } else {
            console.error("❌ Erro: Certificado `xml_base64` não foi retornado pela API intermediária.");
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

        // 🔹 Log dos CNPJs
        console.log(`📌 Enviando CNPJ do contribuinte: ${cnpjCliente}`);
        console.log(`📌 Contratante: ${cnpjContratante} | AutorPedidoDados: ${cnpjAutorPedido}`);

        // 🔹 Verifica se o autor do pedido é diferente do contratante e se já temos o etag armazenado
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

        // 🔹 Função para recuperar o token do cache
function obterTokenDoCache(chave) {
    return cache[chave] || null;
}
        // 1️⃣ Recupera o Token do Procurador do cache
// 1️⃣ Recupera o Token do Procurador do cache
const procuradorToken = obterTokenDoCache("autenticar_procurador_token");

if (!procuradorToken) {
    console.error("❌ Erro: Token do procurador não encontrado no cache.");
    return;
}

console.log("🆔 Token do Procurador encontrado:", procuradorToken);

// 2️⃣ Define os headers corretamente
const headers = {
    Authorization: `Bearer ${tokens.accessToken}`,
    jwt_token: tokens.jwtToken,
    autenticar_procurador_token: procuradorToken, // Adicionado ao header
    "Content-Type": "application/json"
};

// 3️⃣ Faz a requisição ao Serpro com os headers corrigidos
axios.post('https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar', payload, { headers })
    .then(response => console.log("✅ Sucesso:", response.data))
    .catch(error => console.error("❌ Erro ao enviar requisição:", error.response ? error.response.data : error.message));
       
    if (etagToken && cnpjAutorPedido !== cnpjContratante) {
            console.log("⚡ Usando token etag armazenado:", etagToken);
            headers["If-None-Match"] = etagToken; // Adiciona o etag ao header
        }

        const response = await axios.post(
            'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar',
            payload,
            { headers }
        );

        console.log("✅ Resposta do Serpro:", response.data);
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

        // 🔹 Definição dos CNPJs corretamente
        const cnpjContratante = "17422651000172"; // ✅ Corrigido
        const cnpjAutorPedido = "28076286000108"; // ✅ Corrigido

        // 🔹 Enviar certificado para autenticação no Serpro
        const tokens = await autenticarNoSerpro(certificadoAssinado, cnpjCliente, cnpjAutorPedido, cnpjContratante);
        
        console.log('🚀 Autenticação via certificado concluída com sucesso.');
        return tokens;
    } catch (error) {
        console.error('❌ Erro no processo de autenticação via certificado:', error.message);
        return null;
    }
}

module.exports = { autenticarViaCertificado };