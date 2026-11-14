import {
  useState,
  useRef,
  useEffect,
  ReactNode,
  createContext,
  useContext,
} from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a Dropdown component");
  }
  return context;
};

export interface DropdownProps {
  children: ReactNode;
  className?: string;
  triggerType?: "click" | "hover";
  onOpenChange?: (open: boolean) => void;
}

/**
 * Shopee-style Dropdown Container
 * Supports click & hover triggers, click-outside auto-closing.
 */
export function Dropdown({
  children,
  className = "",
  triggerType = "click",
  onOpenChange,
}: DropdownProps) {
  const [isOpen, setIsOpenState] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    onOpenChange?.(open);
  };

  const close = () => setIsOpen(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (triggerType === "hover") {
      clearTimeout(timeoutRef.current);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (triggerType === "hover") {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative inline-block ${className}`}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export function DropdownTrigger({
  children,
  className = "",
}: DropdownTriggerProps) {
  const { isOpen, setIsOpen } = useDropdown();

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={`cursor-pointer select-none ${className}`}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
    >
      {children}
    </div>
  );
}

export interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  width?: string;
  showArrow?: boolean;
  arrowPosition?: "left" | "right" | "center";
}

/**
 * Shopee-style Dropdown Popover Menu with signature caret arrow
 */
export function DropdownMenu({
  children,
  className = "",
  align = "right",
  width = "w-48",
  showArrow = true,
  arrowPosition,
}: DropdownMenuProps) {
  const { isOpen } = useDropdown();

  if (!isOpen) return null;

  const alignClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }[align];

  const actualArrowPos = arrowPosition || align;
  const arrowPosClasses = {
    left: "left-4",
    right: "right-4",
    center: "left-1/2 -translate-x-1/2",
  }[actualArrowPos];

  return (
    <div
      className={`absolute top-full pt-2 ${alignClasses} ${width} z-50 animate-in fade-in zoom-in-95 duration-150`}
    >
      {/* Invisible Hover Bridge (Vùng cầu nối hình chữ nhật chống tắt nhầm khi rê chuột) */}
      <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />

      {/* Shopee Popover Arrow */}
      {showArrow && (
        <div
          className={`absolute top-0.5 ${arrowPosClasses} w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-black/[0.09] dark:border-slate-700 rotate-45 z-10`}
        />
      )}

      {/* Popover Card Content */}
      <div
        className={`relative bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs sm:rounded-sm shadow-[0_2px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] py-1.5 overflow-hidden ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}

export function DropdownItem({
  children,
  onClick,
  className = "",
  active = false,
  icon,
  disabled = false,
}: DropdownItemProps) {
  const { close } = useDropdown();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    close();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`w-full px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "text-[#ee4d2d] dark:text-[#ee4d2d] font-semibold bg-[#fef0ed]/60 dark:bg-slate-700/80"
          : "text-gray-700 dark:text-slate-200 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 hover:text-[#ee4d2d] dark:hover:text-[#ee4d2d]"
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0 truncate">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
      </div>
      {active && <Check size={14} className="text-[#ee4d2d] shrink-0 ml-2" />}
    </button>
  );
}

export function DropdownDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px bg-gray-100 dark:bg-slate-700/80 my-1 ${className}`}
    />
  );
}

/* =====================================================================
 * ShopeeSelect: Ready-to-use Select Dropdown (e.g., Sort By, Filters)
 * ===================================================================== */
export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface ShopeeSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuWidth?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
}

export function ShopeeSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  className = "",
  buttonClassName = "",
  menuWidth = "w-44",
  align = "left",
  size = "md",
}: ShopeeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-white dark:bg-slate-800 border rounded-xs sm:rounded-sm transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs ${
          isOpen
            ? "border-[#ee4d2d] ring-1 ring-[#ee4d2d]/30"
            : selectedOption
            ? "border-gray-300 dark:border-slate-600 text-[#ee4d2d] dark:text-[#ee4d2d] font-medium"
            : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-gray-300"
        } ${sizeClasses} ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#ee4d2d]" : "text-gray-400"
          }`}
        />
      </button>

      {/* Menu Options */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === "right" ? "right-0" : "left-0"
          } ${menuWidth} bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs sm:rounded-sm shadow-[0_2px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] py-1 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs sm:text-sm flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "text-[#ee4d2d] font-semibold bg-[#fef0ed]/60 dark:bg-slate-700/80"
                    : "text-gray-700 dark:text-slate-200 hover:bg-[#fafafa] dark:hover:bg-slate-700/60 hover:text-[#ee4d2d]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-[#ee4d2d] shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
