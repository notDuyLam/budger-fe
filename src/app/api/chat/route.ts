import { NextRequest, NextResponse } from "next/server";

// Keep track of the last known working API key index in-memory (per container lifecycle)
let currentKeyIndex = 0;

interface Category {
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface ChatRequest {
  message: string;
  wallets: string[];
  categories: Category[];
  partners?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, wallets, categories, partners = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Parse API keys
    const rawKeys = process.env.GEMINI_API_KEY || "";
    const apiKeys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (apiKeys.length === 0) {
      console.error("[Gemini API Error] GEMINI_API_KEY is not configured in environment variables.");
      return NextResponse.json(
        { error: "Gemini API key(s) not configured on the server." },
        { status: 500 }
      );
    }

    const result = await generateTransactionWithRotation(message, wallets, categories, partners, apiKeys);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Chat API Handler Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat input." },
      { status: 500 }
    );
  }
}

async function generateTransactionWithRotation(
  message: string,
  wallets: string[],
  categories: Category[],
  partners: string[],
  apiKeys: string[]
) {
  const numKeys = apiKeys.length;
  let attempts = 0;
  let lastError: any = null;

  const prompt = buildPrompt(message, wallets, categories, partners);
  const payload = buildGeminiPayload(prompt);

  while (attempts < numKeys) {
    const activeIndex = (currentKeyIndex + attempts) % numKeys;
    const apiKey = apiKeys[activeIndex];

    try {
      console.log(`[Gemini Rotation] Attempting parsing using API key index ${activeIndex}/${numKeys}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000), // 12 seconds timeout
        }
      );

      const status = response.status;
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Gemini Rotation] API key index ${activeIndex} failed with status ${status}: ${errorText}`);
        throw new Error(`HTTP ${status}: ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsedJSON = cleanAndParseJSON(rawText);
      const validatedResult = validateAndNormalize(parsedJSON, wallets, categories, partners);

      // Success! Update global state to use this working key next time
      currentKeyIndex = activeIndex;
      console.log(`[Gemini Rotation] Success on key index ${activeIndex}. Keeping index ${activeIndex} for next calls.`);
      return validatedResult;

    } catch (err: any) {
      console.error(`[Gemini Rotation] Key index ${activeIndex} failed. Error:`, err.message || err);
      lastError = err;
      attempts++;
    }
  }

  throw new Error(`All configured Gemini API keys (${numKeys}) failed to process request. Last error: ${lastError?.message || lastError}`);
}

function buildPrompt(message: string, wallets: string[], categories: Category[], partners: string[]) {
  const walletListStr = wallets.length > 0
    ? wallets.map((w) => `- ${w}`).join("\n")
    : "- Cash"; // Fallback default
  
  const categoryListStr = categories.length > 0
    ? categories.map((c) => `- ${c.name} (${c.type})`).join("\n")
    : "- Dining (EXPENSE)\n- Salary (INCOME)"; // Fallback default

  const partnerListStr = partners.length > 0
    ? partners.map((p) => `- ${p}`).join("\n")
    : "- None";

  return `You are a professional AI Personal Finance Assistant.
Your task is to analyze the user's financial record statement (income, expenses, or debt transactions like loans/borrowings) and extract the structured data in JSON.

Here are the user's existing settings:
[AVAILABLE WALLET ACCOUNTS]
${walletListStr}

[AVAILABLE CATEGORIES]
${categoryListStr}

[AVAILABLE DEBT PARTNERS]
${partnerListStr}

[BUSINESS RULES & MAPPING CRITERIA]
1. Extract 'amount' as a positive integer number representing the transaction value in VND. 
   - Parse terms like "50k" as 50000, "100k" as 100000, "15m" or "15 triệu" or "15 tr" as 15000000.
2. Determine transaction 'type':
   - 'EXPENSE': Regular spending (e.g. food, bills, shopping).
   - 'INCOME': Regular earnings (e.g. salary, gifts).
   - 'DEBT_LENT': When the user lends money to someone else or someone owes the user money (e.g., "cho Huy vay 500k", "Huy mượn 500k", "Huy nợ 500k", "Trân nợ 100k", "Hải nợ mình 200k").
   - 'DEBT_BORROWED': When the user borrows money from someone else or the user owes someone money (e.g., "vay anh Nam 10m", "anh Nam cho vay 10m", "nợ anh Nam 10m", "mình nợ anh Nam 10m").
   - 'DEBT_REPAYMENT': When the user repays a debt, pays back someone, or receives repayment from someone who owed them (e.g., "trả nợ anh Nam 500k", "Huy trả nợ 150k", "trả anh Nam 500k tiền nợ"). Ensure it contains active repayment/pay-back actions. Simple owing statements like "[Name] nợ [Amount]" must be classified as DEBT_LENT, and "nợ [Name] [Amount]" must be DEBT_BORROWED.
3. Map 'wallet' to one of the [AVAILABLE WALLET ACCOUNTS] listed above. It must match exactly.
   - If the user specifies a wallet (e.g., "momo", "vcb", "cash") that matches or is close to one in the list, map to it.
   - If no specific wallet is specified or it is ambiguous, select the most likely wallet, or default to the first wallet: "${wallets[0] || 'Momo'}".
4. Map 'category' to one of the [AVAILABLE CATEGORIES] listed above. It must match exactly and be of the correct type (EXPENSE or INCOME).
   - E.g., if type is EXPENSE, map to an EXPENSE category. If type is INCOME, map to an INCOME category.
   - For DEBT_LENT, DEBT_BORROWED, and DEBT_REPAYMENT, 'category' is not required and should be null or omitted.
5. Extract 'description' as a short, meaningful description of the transaction (e.g. "Highlands Coffee", "Supermarket shopping", "Salary payment", "Bus fare", "Cho Huy vay", "Vay anh Nam", "Trả nợ anh Nam", "Huy trả nợ"). Make sure it is descriptive.
6. Extract 'partner' (Only for DEBT_LENT, DEBT_BORROWED, or DEBT_REPAYMENT):
   - Extract the name of the person (e.g. "Huy", "Nam").
   - If the name matches or is close to a name in [AVAILABLE DEBT PARTNERS], map to it exactly. Otherwise, output the raw capitalized name.
   - For standard INCOME and EXPENSE transactions, 'partner' must be null.
7. Extract 'note' ONLY if the user provides additional context (e.g. "lunch with group", "birthday party", "monthly subscription").
   - **CRITICAL RULE:** If the user statement does not contain any extra details beyond the amount, merchant, wallet or category, you must set 'note' to null or empty string. Do NOT invent a note, do NOT copy description to note.
8. Extract 'due_date' (Only for DEBT_LENT and DEBT_BORROWED):
   - Extract any due date, payback deadline or repayment date specified in the user's message (e.g. 'cuối tuần sau', 'tháng sau', 'ngày 15/10').
   - Convert relative or absolute dates to an ISO date string format (YYYY-MM-DD) based on today's local date: ${new Date().toISOString().split("T")[0]}.
   - If no payback deadline or date is specified, set 'due_date' to null.

User Input: "${message}"`;
}

function buildGeminiPayload(prompt: string) {
  return {
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
          type: {
            type: "STRING",
            enum: ["INCOME", "EXPENSE", "DEBT_LENT", "DEBT_BORROWED", "DEBT_REPAYMENT"],
          },
          amount: {
            type: "INTEGER",
          },
          wallet: {
            type: "STRING",
            description: "The name of the wallet account matched exactly from the available wallets.",
          },
          category: {
            type: "STRING",
            description: "The name of the category matched exactly from the available categories. Set to null for DEBT_LENT, DEBT_BORROWED, and DEBT_REPAYMENT.",
          },
          description: {
            type: "STRING",
            description: "A brief merchant or activity description (e.g. 'Gasoline', 'Lunch', 'Vay anh Nam', 'Trả nợ anh Nam').",
          },
          partner: {
            type: "STRING",
            description: "The name of the person being lent to, borrowed from, or repayment partner. Set to null for regular INCOME/EXPENSE.",
          },
          note: {
            type: "STRING",
            description: "Any extra descriptive context, or null if no additional detail was specified.",
          },
          due_date: {
            type: "STRING",
            description: "An ISO format date string (YYYY-MM-DD) representing the payback deadline, or null if not specified. Only applicable for DEBT_LENT and DEBT_BORROWED.",
          },
        },
        required: ["type", "amount", "wallet", "description"],
      },
    },
  };
}

function cleanAndParseJSON(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

function validateAndNormalize(result: any, wallets: string[], categories: Category[], partners: string[]) {
  // Normalize type
  const allowedTypes = ["INCOME", "EXPENSE", "DEBT_LENT", "DEBT_BORROWED", "DEBT_REPAYMENT"];
  const type = allowedTypes.includes(result.type) ? result.type : "EXPENSE";

  // Normalize amount
  let amount = typeof result.amount === "number" ? result.amount : parseInt(result.amount, 10);
  if (isNaN(amount) || amount < 0) {
    amount = 0;
  }

  // Normalize wallet: find closest match or default
  let wallet = (result.wallet || "").trim();
  const matchedWallet = wallets.find(
    (w) => w.toLowerCase() === wallet.toLowerCase()
  );
  if (matchedWallet) {
    wallet = matchedWallet;
  } else if (wallets.length > 0) {
    wallet = wallets[0];
  }

  // Normalize category: only map for INCOME and EXPENSE
  let category: string | null = null;
  if (type === "INCOME" || type === "EXPENSE") {
    const rawCategory = (result.category || "").trim();
    const typedCategories = categories.filter((c) => c.type === type);
    const matchedCategory = typedCategories.find(
      (c) => c.name.toLowerCase() === rawCategory.toLowerCase()
    );
    if (matchedCategory) {
      category = matchedCategory.name;
    } else {
      // Try matching any category type just in case
      const fallbackMatched = categories.find(
        (c) => c.name.toLowerCase() === rawCategory.toLowerCase()
      );
      if (fallbackMatched) {
        category = fallbackMatched.name;
      } else if (typedCategories.length > 0) {
        category = typedCategories[0].name;
      } else if (categories.length > 0) {
        category = categories[0].name;
      }
    }
  }

  // Normalize description
  const description = (result.description || "").trim() || "Transaction";

  // Normalize partner: only map for DEBT_LENT, DEBT_BORROWED, and DEBT_REPAYMENT
  let partner: string | null = null;
  if (type === "DEBT_LENT" || type === "DEBT_BORROWED" || type === "DEBT_REPAYMENT") {
    const rawPartner = (result.partner || "").trim();
    if (rawPartner) {
      const matchedPartner = partners.find(
        (p) => p.toLowerCase() === rawPartner.toLowerCase()
      );
      partner = matchedPartner || rawPartner.charAt(0).toUpperCase() + rawPartner.slice(1);
    }
  }

  // Normalize note: filter out placeholders like "null", "undefined", ".", "none", etc.
  let note = result.note && String(result.note).trim() ? String(result.note).trim() : null;
  if (note) {
    const lowerNote = note.toLowerCase();
    if (
      lowerNote === "null" ||
      lowerNote === "undefined" ||
      lowerNote === "none" ||
      lowerNote === "." ||
      lowerNote === ""
    ) {
      note = null;
    }
  }

  // Normalize due_date
  let due_date = result.due_date && String(result.due_date).trim() ? String(result.due_date).trim() : null;
  if (due_date) {
    const lowerDate = due_date.toLowerCase();
    if (lowerDate === "null" || lowerDate === "undefined" || lowerDate === "none") {
      due_date = null;
    }
  }

  return {
    type,
    amount,
    wallet,
    category,
    description,
    partner,
    note,
    due_date,
  };
}
