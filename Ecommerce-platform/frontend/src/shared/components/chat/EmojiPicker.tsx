import React, { useState, useEffect, useRef } from "react";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  theme?: "neo" | "modern";
}

const EMOJI_LIST = [
  // Smileys & People
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
  "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
  "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥",
  // Gestures & Body
  "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
  "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️",
  // Hearts & Emotions
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓",
  "💗", "💖", "💘", "💝", "💟", "✨", "🌟", "⭐", "💫", "🔥", "💥", "💯", "💢", "💬", "👁️‍🗨️", "🗣️"
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, theme = "modern" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const containerClasses = theme === "neo"
    ? "absolute bottom-16 left-0 bg-white border-4 border-black p-4 rounded-2xl shadow-brutal z-50 w-72 h-56 select-none flex flex-col"
    : "absolute bottom-14 left-0 bg-white/95 backdrop-blur-xl border border-gray-150 p-4 rounded-2xl shadow-premium z-50 w-72 h-56 select-none flex flex-col";

  const btnClasses = theme === "neo"
    ? "p-2 hover:bg-primary/10 rounded-xl transition-all cursor-pointer text-gray-500 hover:text-black border-2 border-transparent active:border-black shrink-0 flex items-center justify-center"
    : "p-2 hover:bg-gray-100 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-black shrink-0 flex items-center justify-center";

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={btnClasses}
        title="Emoji"
      >
        <Smile size={theme === "neo" ? 20 : 18} />
      </button>

      {isOpen && (
        <div className={containerClasses}>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Chọn Emoji</p>
          <div className="flex-grow overflow-y-auto grid grid-cols-8 gap-2 p-1 scrollbar-thin">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(emoji);
                }}
                className="text-lg hover:scale-125 active:scale-95 transition-transform duration-100 cursor-pointer flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default EmojiPicker;
