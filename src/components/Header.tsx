"use client";

import React from "react";
import { useSession, signOut } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const isAuthenticated = !!session?.user;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="flex items-center justify-between w-full mb-4">
      <div className="flex items-center gap-4 flex-1">
        {isAuthenticated && session.user.name && (
          <span className="text-lg font-medium">
            Hello, {session.user.name} 👋!
          </span>
        )}
        {!isAuthenticated && (
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-lg font-bold no-underline hover:bg-orange-600 transition-colors duration-300"
          >
            Login to Train
          </Link>
        )}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Sign Out
          </button>
        )}
        <div className="flex-1"></div>
        <fieldset id="mode-switcher" className="radio-switch">
          <legend>Select a color mode:</legend>
          <input
            type="radio"
            id="light"
            name="color-scheme"
            value="light"
            defaultChecked
          />
          <label htmlFor="light">Light</label>
          <input type="radio" id="dark" name="color-scheme" value="dark" />
          <label htmlFor="dark">Dark</label>
        </fieldset>
      </div>
    </header>
  );
}
