import { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";

interface PaymentCountdownButtonProps {
  createdAt: string;
  onRetryPayment: () => void;
  className?: string;
}

const PaymentCountdownButton = ({
  createdAt,
  onRetryPayment,
  className = "",
}: PaymentCountdownButtonProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime();
    const expiryTime = createdTime + 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const remaining = expiryTime - now;
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft <= 0) return null;

  // Format time (HH:mm:ss)
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const formatUnit = (unit: number) => unit.toString().padStart(2, "0");

  return (
    <button
      onClick={onRetryPayment}
      className={`relative overflow-hidden group ${className}`}
    >
      <div className="flex items-center justify-center gap-2 relative z-10">
        <CreditCard size={14} className="group-hover:animate-pulse" />
        <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
          <span>Thanh toán lại</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] sm:text-xs tracking-widest font-mono">
            {formatUnit(hours)}:{formatUnit(minutes)}:{formatUnit(seconds)}
          </span>
        </span>
      </div>
    </button>
  );
};

export default PaymentCountdownButton;
