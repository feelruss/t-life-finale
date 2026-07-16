// This is the api/wellness-recommendations.js file
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const { riskScore, studentsAtRisk, studentsHighRisk, facultyBreakdown } =
    req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured in Vercel environment variables.",
    });
  }

  const prompt = `
You are an AI wellness advisor for a university admin dashboard.

Generate 4 short, single-line recommendations based on this campus burnout data:

Campus Risk Score: ${riskScore}%
At-Risk Students: ${studentsAtRisk}
High-Risk Students: ${studentsHighRisk}

Faculty Risk Breakdown:
${JSON.stringify(facultyBreakdown, null, 2)}

Return JSON ONLY with this structure:
{
  "recommendations": [
    "recommendation 1",
    "recommendation 2",
    "recommendation 3",
    "recommendation 4"
  ]
}
`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
      },
    );

    const rawText = await response.text();

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(
        `API did not return JSON. Response was: ${rawText || "empty response"}`,
      );
    }

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch from Groq");
    }

    const result = JSON.parse(data.choices[0].message.content);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Wellness Recommendations Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}
