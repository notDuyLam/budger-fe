import { NextRequest, NextResponse } from "next/server";

let currentKeyIndex = 0;

export async function POST(request: NextRequest) {
  try {
    const { categoryName } = await request.json();

    if (!categoryName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const rawKeys = process.env.GEMINI_API_KEY || "";
    const apiKeys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: "Gemini API key(s) not configured on the server." },
        { status: 500 }
      );
    }

    const result = await suggestIconWithRotation(categoryName, apiKeys);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Suggest Icon API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to suggest icon." },
      { status: 500 }
    );
  }
}

async function suggestIconWithRotation(categoryName: string, apiKeys: string[]) {
  const numKeys = apiKeys.length;
  let attempts = 0;
  let lastError: any = null;

  const prompt = `Suggest a matching Lucide icon for the following finance transaction category name: "${categoryName}".
Choose from these exact options ONLY: Coffee, ShoppingBag, Home, Car, Activity, BookOpen, Gamepad2, DollarSign, TrendingUp, Gift, HelpCircle.
Output only a JSON object containing the icon name.
Example: Category: "Starbucks Coffee" -> { "icon": "Coffee" }
Example: Category: "Salary Payment" -> { "icon": "DollarSign" }
Example: Category: "Gym membership" -> { "icon": "Activity" }`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          icon: {
            type: "STRING",
            enum: ["Coffee", "ShoppingBag", "Home", "Car", "Activity", "BookOpen", "Gamepad2", "DollarSign", "TrendingUp", "Gift", "HelpCircle"],
          },
        },
        required: ["icon"],
      },
    },
  };

  while (attempts < numKeys) {
    const activeIndex = (currentKeyIndex + attempts) % numKeys;
    const apiKey = apiKeys[activeIndex];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(6000), // 6 seconds timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response from model.");
      }

      const cleaned = rawText.trim();
      const parsed = JSON.parse(cleaned);

      currentKeyIndex = activeIndex;
      return parsed;

    } catch (err: any) {
      console.warn(`[Suggest Icon Rotation] Key index ${activeIndex} failed. Error:`, err.message || err);
      lastError = err;
      attempts++;
    }
  }

  throw new Error(`All configured API keys failed. Last error: ${lastError?.message || lastError}`);
}
