import type { InputHTMLAttributes, ReactNode } from "react";

type GlassInputProps = {
  label: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

function GlassInput({
  label,
  leftIcon,
  rightSlot,
  ...inputProps
}: GlassInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5 block">
        {label}
      </span>
      <div className="relative rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white/40 dark:bg-white/[0.03] backdrop-blur-sm transition-colors focus-within:border-emerald-500 dark:focus-within:border-[#e8643a] focus-within:bg-emerald-500/5 dark:focus-within:bg-[#e8643a]/5">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#888] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          {...inputProps}
          className={`w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888] py-4 focus:outline-none rounded-2xl ${
            leftIcon ? "pl-12" : "pl-4"
          } ${rightSlot ? "pr-12" : "pr-4"}`}
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    </label>
  );
}

export default GlassInput;
