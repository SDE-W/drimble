import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomToastProps {
  message: string;
  type: "success" | "error" | "info";
}

const config = {
  success: {
    icon: FaCheckCircle,
    iconClass: "text-emerald-500",
    borderClass: "border-emerald-200 bg-emerald-50",
  },
  error: {
    icon: FaExclamationCircle,
    iconClass: "text-red-500",
    borderClass: "border-red-200 bg-red-50",
  },
  info: {
    icon: FaInfoCircle,
    iconClass: "text-blue-500",
    borderClass: "border-blue-200 bg-blue-50",
  },
};

export function CustomToast({ message, type }: CustomToastProps) {
  const { icon: Icon, iconClass, borderClass } = config[type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md min-w-70 max-w-95",
        borderClass
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      <span className="text-[13px] font-medium text-foreground leading-snug">
        {message}
      </span>
    </div>
  );
}

export const showToast = (
  message: string,
  type: "success" | "error" | "info"
) => {
  toast.custom(() => <CustomToast message={message} type={type} />);
};