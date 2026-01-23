import { Resend } from "resend";

/**
 * Creates a Resend client instance
 */
function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Please set the RESEND_API_KEY environment variable."
    );
  }

  return new Resend(apiKey);
}

/**
 * Sends an email notification when a new user signs up and requests approval
 */
export async function sendSignupNotification(
  userEmail: string,
  userName: string
): Promise<void> {
  try {
    const resend = createResendClient();
    const adminEmail = "info@calvinwetzel.dev";
    const fromEmail = "nocodefinetuningsam2@calvinwetzel.dev";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: "New User Signup - Approval Required",
      html: `
        <h2>New User Signup Request</h2>
        <p>A new user has signed up and is waiting for approval:</p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(userName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>
        </ul>
        <p>Please review and approve this user in the admin panel.</p>
      `,
      text: `
New User Signup Request

A new user has signed up and is waiting for approval:

Name: ${userName}
Email: ${userEmail}

Please review and approve this user in the admin panel.
      `,
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }
  } catch (error) {
    // Log the error but don't throw - we don't want to fail signup if email fails
    console.error("Failed to send signup notification email:", error);
    // In production, you might want to log this to a monitoring service
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
