import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
}


// Health check
app.get("/", (req, res) => {
  res.send("🚀 Gemini AI Food Backend Running");
});



// Analyze endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    console.log("🔥 RAW BODY:", req.body);
    console.log("🔥 IMAGE EXISTS:", !!req.body?.image);

    const image = req.body?.image;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "No image received from frontend"
      });
    }

    const base64Data = image.includes(",")
      ? image.split(",")[1]
      : image;

    console.log("📸 Base64 length:", base64Data.length);

   const prompt = `
You are a highly accurate food nutrition analysis expert.

Analyze the food image carefully and return ONLY human-readable text.

Your tasks:

1. Identify all visible food items (be specific: Indian, Asian, Western if possible)
2. Estimate portion size (small, medium, large or in grams/ml if possible)
3. Provide calorie estimate per item and total calories
4. Provide macronutrients:
   - Protein (grams)
   - Carbohydrates (grams)
   - Fat (grams)
5. List key ingredients if identifiable
6. Provide a short health note (1–2 lines)
7. If multiple items exist, separate them clearly and give a total summary at the end

STRICT RULES:
- Do NOT use JSON
- Do NOT use markdown
- Do NOT use **bold**, *, or formatting symbols
- Do NOT include backticks
- Output must be plain clean text only
- Be structured using line breaks only
- Be precise but realistic
- If unsure, give a range instead of exact numbers

FORMAT:

Food Name:
Portion Size:
Calories:
Protein:
Carbs:
Fat:
Ingredients:
Health Note:
Explanation:
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    // 🔥 CHECK GEMINI RESPONSE STATUS
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ GEMINI API FAILED:", errText);

      return res.status(500).json({
        success: false,
        error: "Gemini API failed",
        details: errText
      });
    }

    const data = await response.json();

    console.log("🤖 GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // 🔥 FINAL SAFETY CHECK
    if (!text || text.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: "No analysis returned from Gemini",
        raw: data
      });
    }

    // ✅ ALWAYS RETURN JSON (THIS FIXES YOUR "NULL" ISSUE)
   console.log("🚀 RETURNING TO FRONTEND:", {
  success: true,
  resultLength: text.length
});

return res.json({
  success: true,
  result: text
});

  } catch (err) {
    console.error("🔥 ANALYZE ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Server running on http://0.0.0.0:8080");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});