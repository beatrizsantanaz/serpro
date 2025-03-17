const axios = require('axios');
const { getTokens } = require('./auth'); // 🔹 Importando função de autenticação
require('dotenv').config();

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

        // 🔹 Extraindo apenas o campo `xml_base64`
        if (response.data && response.data.xml_base64) {
            console.log("✅ Certificado em Base64 extraído com sucesso.");
            return response.data.xml_base64;  // ✅ Pegando apenas o valor correto
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
async function autenticarNoSerpro(certificadoAssinado, cnpjCliente) {
    try {
        console.log("🔄 Obtendo tokens de autenticação...");
        const tokens = await getTokens(); // 🔹 Obtendo accessToken e jwtToken

        if (!tokens || !tokens.accessToken) {
            console.error("❌ Erro ao obter tokens do Serpro.");
            throw new Error('Falha na autenticação com o Serpro.');
        }

        console.log("✅ Tokens obtidos com sucesso.");

        // 🔹 Log para verificar qual CNPJ está sendo enviado
        console.log(`📌 Enviando CNPJ do contribuinte: ${cnpjCliente}`);

        const payload = {
            "contratante": {
                "numero": "17422651000172",
                "tipo": 2
            },
            "autorPedidoDados": {
                "numero": "28076286000108",
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
                "dados": JSON.stringify({ xml: certificadoAssinado }) // 🔹 Agora o certificado correto é enviado
            }
        };

        console.log("🚀 Enviando certificado assinado para autenticação no Serpro...");
        console.log("📜 Payload enviado:", JSON.stringify(payload, null, 2)); // 🔹 Log do payload completo

        const response = await axios.post('https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Apoiar', payload, {
            
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`, // 🔹 Agora passamos o token correto
                jwt_token: tokens.jwtToken, // 🔹 Enviando JWT Token no header
                "Content-Type": "application/json"
            }
        });

        console.log("✅ Resposta do Serpro:", response.data);
        return response.data; // 🔹 Retorna os dados da autenticação do Serpro
    } catch (error) {
        console.error("❌ Erro ao autenticar no Serpro:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// 🔹 Fluxo completo: Gera o certificado e autentica no Serpro
async function autenticarViaCertificado(cnpjCliente) {
    try {
        console.log(`🔹 Iniciando autenticação via certificado para CNPJ: ${cnpjCliente}`);

        // 1. Gerar certificado assinado
        const certificadoAssinado = await gerarCertificadoAssinado();
        console.log("📜 Certificado gerado:", certificadoAssinado);

        // 2. Enviar certificado para autenticação no Serpro
        const tokens = await autenticarNoSerpro(certificadoAssinado, cnpjCliente);
        
        console.log('🚀 Autenticação via certificado concluída com sucesso.');
        return tokens;
    } catch (error) {
        console.error('❌ Erro no processo de autenticação via certificado:', error.message);
        return null;
    }
}

module.exports = { autenticarViaCertificado };
