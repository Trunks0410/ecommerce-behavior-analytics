import db from "../models/index.js";

async function test() {
  try {
    console.log("Message attributes:", Object.keys(db.Message.rawAttributes));
    console.log("Conversation attributes:", Object.keys(db.Conversation.rawAttributes));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

test();
