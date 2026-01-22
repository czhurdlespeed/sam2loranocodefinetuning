"use client";

import { memo } from "react";

interface ConfigOptionProps {
  label: string;
  value: string | number;
  onChange: () => void;
  disabled: boolean;
}

export const ConfigOption = memo(function ConfigOption({
  label,
  value,
  onChange,
  disabled,
}: ConfigOptionProps) {
  return (
    <li className="flex flex-col items-center justify-center">
      <div className="grid grid-rows-2 items-center justify-center h-full">
        <span className="font-bold w-[200px] m-0 p-0 text-gray-900 dark:text-white text-2xl text-center">
          {label}
        </span>
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-orange-500 text-gray-900 dark:text-white font-bold text-xl text-center w-[200px] cursor-pointer transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-80"
          onClick={onChange}
          disabled={disabled}
        >
          {value}
        </button>
      </div>
    </li>
  );
});
