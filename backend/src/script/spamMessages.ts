import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config.js";
import ConversationModel from "../models/Conversation.js";
import MessageModel from "../models/Message.js";
import UserModel from "../models/User.js";

/**
 * Benchmark message generation script for testing:
 * - Real-time chat performance
 * - Cursor-based pagination (keyset loading)
 * - Infinite scroll up & Element-Anchor scroll restoration
 * - Virtual list & DOM rendering under heavy load
 *
 * Usage:
 *   yarn --cwd backend spam:messages
 *   yarn tsx ./src/script/spamMessages.ts [count] [conversationId]
 *
 * Options:
 *   --count, -c <number>          Number of benchmark messages to generate (default: 1000)
 *   --id, --conversation <id>     Target conversation ObjectId (default: latest active)
 *   --batch-size, -b <number>     Batch chunk size for bulk writes (default: 500)
 *   --help, -h                    Display usage instructions
 */

interface CommandLineOptions {
  count: number;
  conversationId?: string;
  batchSize: number;
  showHelp: boolean;
}

/**
 * Parses command-line arguments and environment variables.
 */
const parseCommandLineArgs = (): CommandLineOptions => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { count: 1000, batchSize: 500, showHelp: true };
  }

  let count = Number(process.env.SPAM_COUNT) || 1000;
  let batchSize = Number(process.env.SPAM_BATCH_SIZE) || 500;
  let conversationId = process.env.CONVERSATION_ID;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if ((arg === "--count" || arg === "-c") && nextArg) {
      const parsed = parseInt(nextArg, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        count = parsed;
        i++;
      }
    } else if ((arg === "--id" || arg === "--conversation") && nextArg) {
      conversationId = nextArg;
      i++;
    } else if ((arg === "--batch-size" || arg === "-b") && nextArg) {
      const parsed = parseInt(nextArg, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        batchSize = parsed;
        i++;
      }
    } else if (arg && /^[0-9a-fA-F]{24}$/.test(arg)) {
      conversationId = arg;
    } else if (arg && !Number.isNaN(Number(arg)) && Number(arg) > 0) {
      count = parseInt(arg, 10);
    }
  }

  return { count, conversationId, batchSize, showHelp: false };
};

/**
 * Displays CLI help instructions.
 */
const printUsageHelp = () => {
  console.log(`
==============================================================
💬 Realtime Chat - Message Benchmark Generator
==============================================================

Usage:
  yarn --cwd backend spam:messages [options]
  yarn tsx ./src/script/spamMessages.ts [count] [conversationId]

Options:
  -c, --count <number>          Number of messages to insert (default: 1000)
  --id, --conversation <id>     24-hex MongoDB Conversation ID (default: latest active)
  -b, --batch-size <number>     Bulk insertion batch size (default: 500)
  -h, --help                    Show this help message

Examples:
  yarn --cwd backend spam:messages 2500
  yarn --cwd backend spam:messages 5000 66c5a000e4b0a1a2b3c4d5e0
  yarn --cwd backend spam:messages --count 10000 --batch-size 1000
==============================================================
`);
};

/**
 * Main execution handler for benchmarking message insertion.
 */
export const spamMessages = async () => {
  const { count, conversationId, batchSize, showHelp } = parseCommandLineArgs();

  if (showHelp) {
    printUsageHelp();
    return;
  }

  console.log("⏳ Connecting to MongoDB database...");
  await connectDatabase();

  // 1. Locate the target conversation
  const targetConversation = conversationId
    ? await ConversationModel.findById(conversationId).select("_id participants updatedAt").lean()
    : await ConversationModel.findOne().sort({ updatedAt: -1 }).select("_id participants updatedAt").lean();

  if (!targetConversation) {
    console.error(
      "❌ No conversations found in the database. Please create at least one conversation first.",
    );
    process.exit(1);
  }

  // 2. Resolve participants for realistic sender rotation
  const participantIds = targetConversation.participants || [];
  if (participantIds.length === 0) {
    console.error("❌ Target conversation does not contain any participants.");
    process.exit(1);
  }

  // Fetch participant profiles for formatted logging
  const participantUsers = await UserModel.find({ _id: { $in: participantIds } })
    .select("_id name isAI")
    .lean();

  const participantMap = new Map(participantUsers.map((u) => [String(u._id), u.name || "Unknown"]));
  const senderNames = participantIds.map((id) => participantMap.get(String(id)) || String(id)).join(", ");

  console.log("\n==============================================================");
  console.log(`🎯 Conversation ID : ${targetConversation._id}`);
  console.log(`👥 Participants (${participantIds.length}) : ${senderNames}`);
  console.log(`📊 Message Count   : ${count.toLocaleString()} messages`);
  console.log(`📦 Batch Size      : ${batchSize.toLocaleString()} msgs / write`);
  console.log("==============================================================\n");

  const startTime = Date.now();
  const intervalMs = 1000; // 1-second interval between message timestamps
  const baseTime = Date.now() - count * intervalMs;

  let insertedCount = 0;
  let lastInsertedMsgId: mongoose.Types.ObjectId | null = null;
  let lastInsertedCreatedAt: Date | null = null;

  console.log(`🚀 Starting bulk message insertion (${count.toLocaleString()} total)...`);

  // 3. Process insertion chunk by chunk (memory-efficient generator)
  for (let offset = 0; offset < count; offset += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - offset);
    const batch = new Array(currentBatchSize);

    for (let j = 0; j < currentBatchSize; j++) {
      const currentIndex = offset + j + 1;
      const timestamp = new Date(baseTime + currentIndex * intervalMs);
      const senderId = participantIds[(currentIndex - 1) % participantIds.length];

      batch[j] = {
        conversationId: targetConversation._id,
        sender: senderId,
        content: `[Benchmark #${currentIndex}/${count}] Real-time chat load testing message 🚀 (${timestamp.toISOString()})`,
        image: null,
        replyTo: null,
        contentType: "text",
        messageStatus: "send",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }

    // Execute bulk write operation
    const insertedDocs = await MessageModel.insertMany(batch, { ordered: false });
    insertedCount += insertedDocs.length;

    // Track the latest inserted record
    if (insertedDocs.length > 0) {
      const lastDoc = insertedDocs[insertedDocs.length - 1];
      if (lastDoc) {
        lastInsertedMsgId = lastDoc._id as mongoose.Types.ObjectId;
        lastInsertedCreatedAt = lastDoc.createdAt;
      }
    }

    const progressPercent = ((insertedCount / count) * 100).toFixed(1);
    const elapsedSec = (Date.now() - startTime) / 1000;
    const currentRate = elapsedSec > 0 ? (insertedCount / elapsedSec).toFixed(0) : "0";

    console.log(
      `  -> Inserted ${insertedCount.toLocaleString()}/${count.toLocaleString()} (${progressPercent}%) [${currentRate} msgs/sec]`,
    );
  }

  // 4. Update the Conversation's lastMessage reference and updatedAt timestamp
  if (lastInsertedMsgId && lastInsertedCreatedAt) {
    await ConversationModel.findByIdAndUpdate(targetConversation._id, {
      lastMessage: lastInsertedMsgId,
      updatedAt: lastInsertedCreatedAt,
    });
  }

  const totalDurationSec = Math.max((Date.now() - startTime) / 1000, 0.001);
  const avgThroughput = (count / totalDurationSec).toFixed(0);

  console.log("\n==============================================================");
  console.log(`✅ Successfully generated and inserted ${count.toLocaleString()} messages!`);
  console.log(`⏱️ Total Time    : ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`⚡ Avg Throughput: ${Number(avgThroughput).toLocaleString()} messages / second`);
  console.log(`👉 Open conversation [${targetConversation._id}] in UI to test pagination & scroll.`);
  console.log("==============================================================\n");
};

// Auto-execute script when invoked directly from CLI
spamMessages()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Execution error:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });

