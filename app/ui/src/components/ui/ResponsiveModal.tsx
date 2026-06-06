import { AnimatePresence, motion } from "framer-motion";
import { slideRight, slideUpModal } from "@/lib/framer";

export interface ResponsiveModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  width?: number;
}

export function ResponsiveModal({
  children,
  isOpen,
  onClose,
  width,
}: ResponsiveModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Mobile - slides up from bottom */}
          <motion.div
            variants={slideUpModal}
            initial="initial"
            animate="enter"
            exit="exit"
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl overflow-hidden flex flex-col"
            style={{ height: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            {children}
          </motion.div>

          {/* Desktop - slides in from right with padding */}
          <motion.div
            variants={slideRight}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              width: width ? `${width}px` : "520px",
              maxWidth: width ? `${width}px` : "520px",
            }}
            className="hidden md:flex fixed top-0 right-0 z-50 h-full flex-col bg-background border-l border-border shadow-2xl md:top-6 md:right-6 md:h-[calc(100vh-48px)] md:rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}