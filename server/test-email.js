#!/usr/bin/env node

/**
 * Test Script for Email Notification System
 * Run with: node server/test-email.js
 *
 * This script tests the email sending functionality without needing the full app
 */

import { sendBoardShareNotification } from "./services/emailService.js";

async function testEmailNotification() {
  console.log("🧪 Testing Email Notification System...\n");

  // Test data
  const testData = {
    recipientEmail: "test@example.com",
    boardTitle: "Web Development Masterclass",
    sharedByName: "John Doe",
    shareToken: "share_1234567890_abcdefgh",
    userId: "user-123",
    boardId: "board-456",
    permissionLevel: "edit",
  };

  console.log("📧 Test Email Details:");
  console.log(`   Recipient: ${testData.recipientEmail}`);
  console.log(`   Board: ${testData.boardTitle}`);
  console.log(`   From: ${testData.sharedByName}`);
  console.log(`   Permission: ${testData.permissionLevel}\n`);

  try {
    console.log("⏳ Sending test email...\n");
    const result = await sendBoardShareNotification(testData);

    if (result) {
      console.log("✅ Email sent successfully!\n");
      console.log(
        "📬 Check your email or view the preview URL in the console logs above."
      );
    } else {
      console.log("❌ Failed to send email - check logs above for details");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testEmailNotification();
