import nodemailer from "nodemailer";
import { emailConfig, emailTemplates } from "../config/emailConfig.js";

let transporter = null;

// Initialize email transporter
async function initializeTransporter() {
  if (transporter) return transporter;

  try {
    // For testing with Ethereal Email - creates a test account if credentials not provided
    if (emailConfig.auth.user === "fawn.leuschke@ethereal.email") {
      console.log("📧 Using Ethereal Email for testing...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      // Production email service
      transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
      });
    }

    // Verify connection
    await transporter.verify();
    console.log("✅ Email service connected successfully");
    return transporter;
  } catch (err) {
    console.error("❌ Error initializing email service:", err.message);
    return null;
  }
}

// Send board share notification
export async function sendBoardShareNotification({
  recipientEmail,
  boardTitle,
  sharedByName,
  shareToken,
  userId,
  boardId,
  permissionLevel,
}) {
  try {
    const transport = await initializeTransporter();
    if (!transport) {
      console.warn(
        "⚠️ Email service not available, skipping email notification"
      );
      return false;
    }

    // Generate share link
    const shareLink = `${emailConfig.appUrl}/share/${userId}/${boardId}/${shareToken}`;

    // Get email template
    const emailContent = emailTemplates.boardShare(
      recipientEmail,
      boardTitle,
      sharedByName,
      shareLink,
      permissionLevel
    );

    // Send email
    const info = await transport.sendMail({
      from: emailConfig.from,
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log(`✅ Share notification email sent to ${recipientEmail}`);

    // For testing with Ethereal Email, log preview URL
    if (
      emailConfig.auth.user === "fawn.leuschke@ethereal.email" ||
      process.env.SHOW_EMAIL_PREVIEW === "true"
    ) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 Email preview: ${previewUrl}`);
      }
    }

    return true;
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
    return false;
  }
}

// Send generic email (for future use)
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = await initializeTransporter();
    if (!transport) {
      console.warn("⚠️ Email service not available");
      return false;
    }

    const info = await transport.sendMail({
      from: emailConfig.from,
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
    return false;
  }
}

// Export initialization function
export { initializeTransporter };
