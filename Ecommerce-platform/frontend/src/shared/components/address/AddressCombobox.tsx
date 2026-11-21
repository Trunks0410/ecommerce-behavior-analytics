import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { normalizeVietnamese } from "@/shared/services/vietnamAddressApi";

export interface ComboboxOption {
  value: string;
  label: string;
  code?: number;
}

interface AddressComboboxProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string, option?: ComboboxOption) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  emptyText?: string;
}

export const AddressCombobox: React.FC<AddressComboboxProps> = ({
  label,
  required = false,
  placeholder = "Chọn hoặc nhập để tìm...",
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
  error,
  emptyText = "Không tìm thấy kết quả phù hợp",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lọc danh sách theo ký tự người dùng nhập (hỗ trợ tiếng Việt không dấu)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const normalizedQuery = normalizeVietnamese(searchTerm);
    return options.filter((opt) =>
      normalizeVietnamese(opt.label).includes(normalizedQuery)
    );
  }, [options, searchTerm]);

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value, opt);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
    setSearchTerm("");
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => {
          if (disabled) return;
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`relative flex items-center w-full bg-white dark:bg-slate-900 border-2 rounded-xl px-3 py-2 text-sm transition-colors ${
          disabled
            ? "bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 cursor-not-allowed"
            : isOpen
            ? "border-[#ee4d2d] cursor-text"
            : error
            ? "border-red-400 cursor-pointer"
            : "border-black/20 dark:border-slate-700 hover:border-black/40 cursor-pointer"
        }`}
      >
        <Search size={14} className="text-gray-400 mr-2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : value}
          placeholder={isOpen && value ? value : placeholder}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            // Nếu không có options API (fallback), cho phép gõ trực tiếp giá trị
            if (options.length === 0) {
              onChange(e.target.value, undefined);
            }
          }}
          className="w-full bg-transparent outline-none font-semibold text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 disabled:cursor-not-allowed"
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 mr-1 cursor-pointer"
            title="Xóa lựa chọn"
          >
            <X size={14} />
          </button>
        )}

        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[#ee4d2d]" : ""
          }`}
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1 font-semibold">{error}</p>}

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="px-4 py-3 text-xs text-gray-500 text-center">
              Đang tải danh sách...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-500 space-y-2">
              <p className="text-center">{emptyText}</p>
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelect({ value: searchTerm.trim(), label: searchTerm.trim() })}
                  className="w-full py-1.5 px-3 bg-[#fef0ed] text-[#ee4d2d] font-bold rounded-lg text-xs hover:bg-[#ee4d2d] hover:text-white transition-colors cursor-pointer"
                >
                  Dùng "{searchTerm.trim()}"
                </button>
              )}
            </div>
          ) : (
            <ul className="py-1">
              {filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={`${opt.code ?? opt.value}`}
                    onClick={() => handleSelect(opt)}
                    className={`px-3.5 py-2 text-xs sm:text-[13px] flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#fef0ed] text-[#ee4d2d] font-bold"
                        : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 font-medium"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-[#ee4d2d] shrink-0 ml-2" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

