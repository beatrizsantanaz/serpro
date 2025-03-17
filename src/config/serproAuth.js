const axios = require('axios');
require('dotenv').config();

async function obterTokenAutenticacao() {
    try {
        const resposta = await axios.post('https://planilha.cffranquias.com.br/integra/api.php', {
            arquivoCertificado: 'ativo.pfx',
            senhaCertificado: process.env.CERT_PASSWORD,
            assinante: {
                numero: '28076286000108',
                nome: 'ATIVO ADVISORY CONTABILIDADE LTDA',
                tipo: 'PJ',
                papel: 'autor pedido de dados'
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (resposta.data && resposta.data.token) {
            return resposta.data.token;
        } else {
            throw new Error('Token de autenticação não encontrado na resposta.');
        }
    } catch (erro) {
        console.error('Erro ao obter token de autenticação:', erro);
        throw erro;
    }
}

module.exports = {
    obterTokenAutenticacao
};
