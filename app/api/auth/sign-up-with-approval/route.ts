import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { user } from "@/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Custom sign-up endpoint that requires admin approval.
 * 
 * This wraps better-auth's sign-up but sets users to unapproved by default.
 * Users can sign up but cannot log in until an admin approves them.
 */
export async function POST(req: NextRequest) {
  try {
    // Call better-auth's sign-up endpoint
    const betterAuthResponse = await auth.api.signUpEmail({
      body: await req.json(),
      headers: req.headers,
    });

    // If sign-up was successful, set user to unapproved
    if (betterAuthResponse.status === 200) {
      const responseData = await betterAuthResponse.json();
      
      if (responseData.user?.id) {
        // Set user as unapproved
        await db
          .update(user)
          .set({ approved: false })
          .where(eq(user.id, responseData.user.id));

        // Return success but indicate approval is needed
        return NextResponse.json({
          success: true,
          message: "Account created successfully. Please wait for admin approval before logging in.",
          user: {
            id: responseData.user.id,
            email: responseData.user.email,
            name: responseData.user.name,
          },
          requiresApproval: true,
        });
      }
    }

    // If there was an error, pass it through
    return betterAuthResponse;
  } catch (error: any) {
    console.error("Error in sign-up with approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
