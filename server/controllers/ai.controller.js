
const { GoogleGenAI } = require("@google/genai");

// Initialize Gemini SDK with API Key from environment
// If running locally without .env, ensure process.env.API_KEY is set or passed in launch config
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analyzeBlockEfficiency = async (req, res) => {
  try {
    const { block, orders } = req.body;

    const orderDetails = orders
      .filter(o => block.orderIds.includes(o.id))
      .map(o => `- Pickup at ${o.auctionHouse} for ${o.dropoffAddress} (${o.items.length} items)`)
      .join('\n');

    const prompt = `
      You are a logistics optimization expert for an auction delivery service called AbSo.
      Analyze the following delivery block and provide a 2-sentence summary on why this route is efficient.
      Focus on grouping of pickup locations and density of drop-offs.
      
      Block Region: ${block.region}
      Time: ${block.startTime} - ${block.endTime}
      Orders:
      ${orderDetails}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini optimization failed:", error);
    res.status(500).json({ error: "AI processing failed", details: error.message });
  }
};

const generateDailyOpsReport = async (req, res) => {
  try {
    const { blocks } = req.body;
    const claimed = blocks.filter(b => b.status !== 'open').length;
    const total = blocks.length;
    
    const prompt = `
      Generate a very short, professional "Morning Standup" status message for the logistics dashboard of "AbSo".
      Data: ${claimed} out of ${total} delivery blocks are claimed for today.
      Mention that high-volume auction days require driver incentives if coverage is low.
      Keep it under 40 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini report failed:", error);
    res.json({ text: "Daily operations status: Normal volume detected (AI Offline)." });
  }
};

const generateSupportSuggestion = async (req, res) => {
  try {
    const { issueType, userRole } = req.body;
    const prompt = `
      You are an AI support assistant for "AbSo", an auction delivery app. 
      A ${userRole} has reported an issue: "${issueType}".
      Provide a helpful, 1-sentence suggested resolution or next step for the operations team to take.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini support failed:", error);
    res.json({ text: "Suggest contacting the user directly to resolve the discrepancy." });
  }
};

module.exports = {
    analyzeBlockEfficiency,
    generateDailyOpsReport,
    generateSupportSuggestion
};
