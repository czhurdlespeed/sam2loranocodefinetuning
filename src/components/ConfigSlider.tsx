"use client";

import { memo } from "react";
import Slider from "@mui/material/Slider";

interface ConfigSliderProps {
  label: string;
  value: number;
  onChange: (event: any, newValue: number | number[]) => void;
  disabled: boolean;
}

export const ConfigSlider = memo(function ConfigSlider({
  label,
  value,
  onChange,
  disabled,
}: ConfigSliderProps) {
  return (
    <li className="flex flex-col items-center justify-center">
      <div className="grid grid-rows-2 items-center justify-center h-full">
        <span className="font-bold w-[200px] m-0 p-0 text-gray-900 dark:text-white text-2xl text-center">
          {label}
        </span>
        <div className="mt-3.5">
          <Slider
          aria-label={label}
          value={value}
          min={1}
          max={200}
          onChange={onChange}
          step={10}
          marks={true}
          disabled={disabled}
          valueLabelDisplay={"on"}
          sx={{
            "& .MuiSlider-valueLabel": {
              transform: "scale(0.5) !important",
              transformOrigin: "center -30px !important",
              width: "100px !important",
              height: "45px !important",
              color: "#f2f2f2 !important",
              borderRadius: "10px !important",
              backgroundColor: "#ff8200 !important",
            },
            "& .MuiSlider-valueLabelLabel": {
              fontSize: "2rem !important",
              fontWeight: "bold !important",
            },
            "& .MuiSlider-thumb": {
              color: "#ff8200",
            },
            "& .MuiSlider-track": {
              color: "#ff8200",
            },
            "& .MuiSlider-rail": {
              color: "#ff8200",
            },
          }}
        />
        </div>
      </div>
    </li>
  );
});
