import { AnimatePresence, motion } from "framer-motion";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id || toast.message}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto fixed bottom-24 left-1/2 z-[200] w-[min(92vw,380px)] -translate-x-1/2"
        >
          <div className="rounded-2xl border border-white/15 bg-[#161622]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {toast.title ? (
                  <p className="text-xs font-outfit font-semibold text-white">
                    {toast.title}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11px] font-inter leading-relaxed text-gray-300">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-[10px] font-inter text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
