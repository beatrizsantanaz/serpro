const express = require("express");
const guiaRoutes = require("./routes/guiaRoutes");
const { consultarSerpro } = require("./src/config/serproApi"); // Caminho ajustado para o diretório correto


const app = express();
const PORT = process.env.PORT || 3000;

app.post("/consultar", async (req, res) => {
  const dados = {
    numero: "28076286000108", // CNPJ do assinante
    nome: "ATIVO ADVISORY CONTABILIDADE LTDA",
    tipo: "PJ", // Tipo de pessoa
    papel: "autor pedido de dados", // Papel do assinante
    cnpj_contratante: req.body.cnpj_contratante, // CNPJ do contratante (do cliente)
    cnpj_autor: req.body.cnpj_autor, // CNPJ do autor (do cliente)
    cnpj_contribuinte: req.body.cnpj_contribuinte, // CNPJ do contribuinte
  };

  try {
    // Usando consultarSerpro para obter os dados da API externa
    const result = await consultarSerpro(dados); // Chama a função consultarSerpro
    res.json(result); // Retorna os dados obtidos da API externa
  } catch (error) {
    res.status(500).json({ erro: "Erro ao consultar Serpro", detalhes: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API do Serpro rodando corretamente! Use as rotas /api/das para acessar os serviços.");
});

app.use(express.json()); // Suporte para JSON no corpo da requisição
app.use("/api", guiaRoutes); // Aqui registramos as rotas do DAS

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});