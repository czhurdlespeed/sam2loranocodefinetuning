"use client";

import React from "react";

export default function Header() {
  return (
    <header>
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
    </header>
  );
}
