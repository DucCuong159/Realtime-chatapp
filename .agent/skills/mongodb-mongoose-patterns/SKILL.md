---
name: mongodb-mongoose-patterns
description: "Expert guide for MongoDB and Mongoose in TypeScript/Node.js applications. Covers schema modeling, compound & TTL indexing, aggregation pipelines, optimistic locking, lean queries, pagination strategies, connection pooling, and data integrity."
risk: safe
source: "AAS Specialist"
date_added: "2026-08-25"
---

# MongoDB & Mongoose Specialist Skill

Expert guidelines and design patterns for building high-performance, resilient, and scalable backend applications using **MongoDB** and **Mongoose** with TypeScript.

---

## 🎯 When to Use
Use this skill when:
- Designing Mongoose schemas, types, and model relationships (Embedding vs Referencing).
- Optimizing query execution time, indexing strategies (compound, multikey, TTL, text index).
- Writing complex Aggregation Pipelines (e.g., chat history, message feeds, analytics, counts).
- Implementing cursor-based pagination (Infinite scroll) vs offset pagination.
- Managing database connections, connection pools, and error recovery in Express/Node.js.
- Preventing common performance traps (N+1 queries, unindexed queries, large un-lean payloads).

---

## 📐 1. Schema Design: Embedding vs Referencing

### The Rule of Thumb
- **Embed** when data is:
  - 1-to-few (e.g., user settings, reactions on a message, delivery statuses).
  - Queried together 90%+ of the time.
  - Bound in total size (< 16MB document limit).
- **Reference** when data is:
  - 1-to-many / 1-to-unbounded (e.g., messages in a conversation, followers).
  - Updated independently and frequently.

### Realtime Chat Example Schema
```typescript
import { Schema, model, Document, Types } from "mongoose";

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachments: { url: string; fileType: string; size: number }[];
  readBy: { userId: Types.ObjectId; readAt: Date }[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [
      {
        url: { type: String, required: true },
        fileType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Compound index for lightning-fast conversation message history sorted by time
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", MessageSchema);
```

---

## ⚡ 2. Query Optimization & `.lean()`

### Always Use `.lean()` for Read Queries
Mongoose documents come with full change-tracking, getters, setters, and internal state. For GET endpoints and read-only workflows, `.lean()` is **5x to 10x faster** and consumes significantly less RAM:

```typescript
// ❌ SLOW: Returns heavy Mongoose hydrated documents
const messages = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(50);

// ✅ FAST: Returns plain JavaScript objects
const messages = await Message.find({ conversationId })
  .sort({ createdAt: -1 })
  .limit(50)
  .select("senderId content attachments createdAt readBy")
  .lean()
  .exec();
```

---

## 🔄 3. Cursor-Based Pagination (Real-time & Feeds)

Avoid `skip()` for large collections because MongoDB must scan and discard all preceding records ($O(N)$). Use **Cursor-based pagination** with `createdAt` or `_id`:

```typescript
export async function getConversationMessages(
  conversationId: string,
  cursor?: string, // ISO Date string or ObjectId of the oldest message loaded
  limit: number = 30
) {
  const query: any = { conversationId, isDeleted: false };
  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const items = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("senderId", "username avatar displayName")
    .lean()
    .exec();

  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

  return {
    items: results.reverse(), // Return chronological order to client
    nextCursor,
    hasMore,
  };
}
```

---

## 📊 4. Aggregation Pipelines (Chat List with Last Message)

Efficient aggregation pipeline to list user conversations with the latest message and unread count in a single query:

```typescript
export async function getUserConversationsWithLatest(userId: string) {
  const userObjectId = new Types.ObjectId(userId);

  return Conversation.aggregate([
    { $match: { participants: userObjectId } },
    {
      $lookup: {
        from: "messages",
        let: { convId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$conversationId", "$$convId"] }, isDeleted: false } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastMessage",
      },
    },
    { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "participants",
        foreignField: "_id",
        as: "participantDetails",
        pipeline: [{ $project: { password: 0, __v: 0 } }],
      },
    },
    { $sort: { "lastMessage.createdAt": -1, updatedAt: -1 } },
  ]);
}
```

---

## 🛡️ 5. Connection Pooling & Best Practices Checklist
- [ ] **Pool Size**: Configure `maxPoolSize: 50` and `minPoolSize: 10` for high concurrency workloads.
- [ ] **Compound Indexing**: Ensure every `find()` with a sort has a matching compound index (e.g. `{ conversationId: 1, createdAt: -1 }`).
- [ ] **No Unbounded Arrays**: Never push unbounded items (e.g., unlimited messages) directly into an array within a single document.
- [ ] **Indexes on Foreign Keys**: Always index `ref` fields like `userId`, `conversationId`.
- [ ] **Time-To-Live (TTL)**: Use TTL indexes for ephemeral items like OTPs, temporary reset tokens, or cache entries:
  ```typescript
  tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // Auto-deletes after 1h
  ```
