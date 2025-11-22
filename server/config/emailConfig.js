// Email Configuration
// For development/testing, we'll use Ethereal Email (fake SMTP service)
// For production, replace with your actual email service credentials

export const emailConfig = {
  // 🚨 IMPORTANT: For REAL EMAIL DELIVERY to work, use Gmail SMTP!
  //
  // Setup Steps:
  // 1. Enable 2-Factor Authentication: https://myaccount.google.com/
  // 2. Generate App Password: https://myaccount.google.com/apppasswords
  // 3. Create .env file with:
  //    SMTP_HOST=smtp.gmail.com
  //    SMTP_PORT=587
  //    SMTP_USER=your-email@gmail.com
  //    SMTP_PASS=your-app-password-16-chars
  //    EMAIL_FROM=noreply@educompass.io
  //    APP_URL=http://localhost:5173
  // 4. Restart server: npm run dev
  //
  // ⚠️ Note: Ethereal Email (test service) shows previews but doesn't send real emails!

  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true" ? true : false,
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASS || "your-app-password",
  },
  from: process.env.EMAIL_FROM || "noreply@educompass.io",
  appName: "EduCompass",
  appUrl: process.env.APP_URL || "http://localhost:5173",
};

// Email templates
export const emailTemplates = {
  boardShare: (
    recipientEmail,
    boardTitle,
    sharedByName,
    shareLink,
    permissionLevel
  ) => {
    const permissionText = permissionLevel === "edit" ? "edit" : "view";
    return {
      subject: `${sharedByName} shared a study board "${boardTitle}" with you on EduCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #fbbf24; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
              .permission-badge { background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📚 Board Shared with You!</h1>
              </div>
              <div class="content">
                <p>Hi ${recipientEmail},</p>
                <p><strong>${sharedByName}</strong> has shared a study board with you on <strong>EduCompass</strong>.</p>
                
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #fbbf24;">
                  <p style="margin: 0 0 10px 0; color: #111827;"><strong>📖 Board Title:</strong> ${boardTitle}</p>
                  <p style="margin: 0 0 10px 0; color: #111827;"><strong>👤 From:</strong> ${sharedByName}</p>
                  <div class="permission-badge">${
                    permissionLevel === "edit" ? "✏️ Can Edit" : "👁️ View Only"
                  }</div>
                </div>

                <p>You can now access this board and ${permissionText} the study resources. Click the button below to get started:</p>
                
                <center>
                  <a href="${shareLink}" class="button">Access Study Board</a>
                </center>

                <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link in your browser:<br/>
                <code style="background: white; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${shareLink}</code></p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="font-size: 14px; color: #6b7280;">
                  <strong>What is EduCompass?</strong><br/>
                  EduCompass is a personalized study resource and mastery tracker that helps you organize and track your learning journey.
                </p>

                <div class="footer">
                  <p>© 2025 EduCompass. All rights reserved.</p>
                  <p>This is an automated email. Please don't reply directly to this email.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${recipientEmail},

${sharedByName} has shared a study board with you on EduCompass.

Board Title: ${boardTitle}
From: ${sharedByName}
Permission Level: ${permissionLevel === "edit" ? "Can Edit" : "View Only"}

You can now access this board and ${permissionText} the study resources. Visit the link below:

${shareLink}

© 2025 EduCompass. All rights reserved.
      `,
    };
  },
};
