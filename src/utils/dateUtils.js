const getLastTwoMonths = () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Formato AAAAMM exigido pela API do Serpro
  const lastMonthStr = `${lastMonth.getFullYear()}${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}${String(twoMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

  return [twoMonthsAgoStr, lastMonthStr];
};

const getFutureConsolidationDate = (daysAhead = 5) => {
  const now = new Date();
  now.setDate(now.getDate() + daysAhead); // Adiciona 5 dias à data atual

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Sempre 2 dígitos
  const day = String(now.getDate()).padStart(2, "0"); // Sempre 2 dígitos

  return `${year}${month}${day}`; // Formato AAAAMMDD
};

// 🔹 Exportamos as funções corretamente
module.exports = { getLastTwoMonths, getFutureConsolidationDate };
