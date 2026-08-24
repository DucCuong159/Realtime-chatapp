import "dotenv/config";
import { getAvailableTextOutModelsService } from "../services/ai.service.js";

const formatTokens = (tokens?: number): string => {
  if (!tokens) return "-";
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return `${tokens}`;
};

const run = async () => {
  console.log("🔍 Checking Google Gemini Text-out Models and Quotas...\n");

  try {
    const { models } = await getAvailableTextOutModelsService(true);

    const tableData = models.map((m) => ({
      "Model ID": m.id,
      Name: m.name,
      Status: m.statusBadge,
      In: formatTokens(m.inputTokenLimit),
      Out: formatTokens(m.outputTokenLimit),
      Note: m.note,
    }));

    console.log(`✅ Found ${models.length} supported Text-out Models:\n`);
    console.table(tableData);

    console.log("\n📌 Quota Legend:");
    console.log("• 🟢: Ready to use");
    console.log("• 🔴 429: Daily rate limit reached (20 RPD / Free Tier)");
    console.log("• 🟡 503: Google AI server busy\n");
  } catch (error: any) {
    console.error("❌ Failed to list models:", error.message || error);
    process.exit(1);
  }
};

run();
