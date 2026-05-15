import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Wand2 } from "lucide-react";

interface IdentityPortalProps {
  show: boolean;
  user: any;
  userName: string;
  setUserName: (name: string) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const IdentityPortal: React.FC<IdentityPortalProps> = ({
  show,
  user,
  userName,
  setUserName,
  onConfirm,
  loading
}) => {
  if (!show || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[250] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-orange-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(249,115,22,0.15)] flex flex-col items-center text-center gap-6"
        >
          <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
            <User className="w-10 h-10 text-orange-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-magic font-black uppercase text-white tracking-widest shadow-white/10 shadow-sm">
              Identify Yourself
            </h2>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-relaxed">
              Before entering the Leyline Network, you must claim your Arcane handle.
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Wand2 className="w-4 h-4 text-orange-400/40 group-focus-within:text-orange-400 transition-colors" />
              </div>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter Rune Name..."
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-12 py-4 text-sm text-white font-bold placeholder:text-white/10 focus:border-orange-500/40 focus:bg-black/80 transition-all outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) onConfirm();
                }}
              />
            </div>
            
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-4 bg-orange-500 text-black font-magic font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
            >
              {loading ? "Activating..." : "Confirm Identity"}
            </button>
          </div>

          <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">
            This handle will be visible to other practitioners.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
