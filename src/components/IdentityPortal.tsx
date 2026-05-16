import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Wand2, Camera, Sparkles } from "lucide-react";

interface IdentityPortalProps {
  show: boolean;
  user: any;
  userName: string;
  setUserName: (name: string) => void;
  photoURL: string;
  setPhotoURL: (url: string) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Viking",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Bear",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Rune",
  "https://api.dicebear.com/7.x/big-smile/svg?seed=Magic",
];

export const IdentityPortal: React.FC<IdentityPortalProps> = ({
  show,
  user,
  userName,
  setUserName,
  photoURL,
  setPhotoURL,
  onConfirm,
  loading
}) => {
  const [showPhotoInput, setShowPhotoInput] = useState(false);

  if (!show || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[250] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-orange-500/30 rounded-[2.5rem] p-10 max-w-lg w-full shadow-[0_0_100px_rgba(249,115,22,0.1)] flex flex-col items-center text-center gap-8 relative overflow-hidden"
        >
          {/* Decorative Rune Background */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="font-magic text-8xl text-orange-500">᚛</span>
          </div>

          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center shadow-inner overflow-hidden relative transition-all group-hover:border-orange-500/50">
              {photoURL ? (
                <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-orange-500/40" />
              )}
            </div>
            <button 
              onClick={() => setShowPhotoInput(!showPhotoInput)}
              className="absolute bottom-0 right-0 p-2 bg-orange-500 text-black rounded-full shadow-lg hover:bg-orange-400 active:scale-90 transition-all border-2 border-black"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-magic font-black uppercase text-white tracking-[0.2em]">
              Claim Your Runes
            </h2>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] leading-relaxed max-w-[280px]">
              The Leyline Network requires a unique signature to synchronize your energy.
            </p>
          </div>

          <div className="w-full space-y-6">
            <AnimatePresence>
              {showPhotoInput && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="flex gap-2 justify-center">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoURL(url)}
                        className={`w-10 h-10 rounded-lg border transition-all ${photoURL === url ? 'border-orange-500 scale-110 shadow-lg' : 'border-white/10 opacity-40 hover:opacity-100'}`}
                      >
                        <img src={url} alt="" className="w-full h-full rounded-lg" />
                      </button>
                    ))}
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="Or paste an image URL..."
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-[10px] text-white font-mono placeholder:text-white/10 focus:border-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Wand2 className="w-5 h-5 text-orange-400/20 group-focus-within:text-orange-400 transition-colors" />
              </div>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter Rune Name..."
                className="w-full bg-black/60 border border-white/10 rounded-3xl px-16 py-5 text-lg text-white font-black placeholder:text-white/5 focus:border-orange-500/40 focus:bg-black/80 transition-all outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) onConfirm();
                }}
              />
            </div>
            
            <button
              onClick={onConfirm}
              disabled={loading || !userName.trim()}
              className="w-full py-5 bg-orange-500 text-black font-magic font-black uppercase tracking-[0.3em] rounded-3xl hover:bg-orange-400 hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
            >
              <Sparkles className="w-5 h-5" />
              {loading ? "Activating..." : "Synchronize Identity"}
            </button>
          </div>

          <p className="text-[9px] text-white/10 uppercase font-bold tracking-[0.3em]">
            This Runic Signature will be visible across the Leyline.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
