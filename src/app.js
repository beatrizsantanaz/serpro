const express = require("express");
const guiaRoutes = require("./routes/guiaRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ API do Serpro rodando corretamente! Use as rotas /api/das para acessar os serviços.");
});

app.use(express.json()); // Suporte para JSON no corpo da requisição
app.use("/api", guiaRoutes); // Aqui registramos as rotas do DAS

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
