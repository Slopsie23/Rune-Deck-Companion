/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  Minus,
  Copy,
  RotateCw,
  PawPrint,
  Wand2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  PlusCircle,
  SkipBack,
  SkipForward,
  Hash,
  Filter,
  Package,
  Zap,
  Calendar,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Terminal,
  Settings,
  Library,
  ArrowLeft,
  Music,
  Database,
  Layers,
  Moon,
  Eye,
  User,
  Shield,
  ShieldCheck,
  Flame,
  Lock,
  Globe,
  Skull,
  Users,
  Gavel,
  Scale,
  Box,
  HelpCircle,
  Wind,
  BookOpen,
  Map as MapIcon,
  Hexagon,
  Sparkles,
  LayoutList,
  Book,
  Compass,
  Grid,
  Settings2,
  Brain,
  PieChart as PieChartIcon,
  Maximize2,
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  Share2,
  ArrowRight,
  Check,
  Home,
  Dices,
  History,
  BarChart2,
  Heart,
  Clock,
  ArrowUpDown,
  Camera,
  Activity,
  Link as LinkIcon,
  Monitor,
  Smartphone,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
// import runesBackground from './assets/images/runes_background_1777929551380.png';
const runesBackground = "/runebg.png";
const VERSION = "V2.7.0";

let cachedScryfallSets: any = null;
async function fetchScryfallSets() {
  if (cachedScryfallSets) return cachedScryfallSets;
  const res = await axios.get("/api/sf/sets");
  cachedScryfallSets = res.data;
  return cachedScryfallSets;
}

// --- FIRESTORE ERROR HANDLING ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  BATCH = 'batch',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth.currentUser?.uid || null,
      email: currentAuth.currentUser?.email || null,
      emailVerified: currentAuth.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.error('[Firestore Error Detail]:', JSON.stringify(errInfo, null, 2));
  // We throw a clean stringified JSON so the infrastructure can parse it if needed
  throw new Error(JSON.stringify(errInfo));
}
// --------------------------------

const logo = "/runebear.png?v=" + new Date().getTime();
const logoUrl = "/runebg.png";

import {
  ORANGE_ACCENT,
  BG_DEEP,
  PANEL_BG,
  PANEL_BORDER,
  FIELD_BG,
  CARD_BG,
  MANA_SYMBOL_URIS,
} from "./constants";
import { db, auth, googleProvider } from "./lib/firebase";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  limit,
  getDocs,
  getDocFromServer,
  serverTimestamp,
  increment,
  writeBatch,
  arrayUnion,
  collectionGroup,
} from "firebase/firestore";
import { Card, DeckCard, SavedDeck, ScryfallSet } from "./types";
import { IdentityPortal } from "./components/IdentityPortal";

async function callGemini(options: { 
  model: string, 
  contents: any, 
  config?: any,
  systemInstruction?: string 
}) {
  try {
    // Transform contents if it's just a string
    let contents = options.contents;
    if (typeof contents === "string") {
      contents = [{ parts: [{ text: contents }] }];
    }

    let systemInstruction = options.systemInstruction;
    let config = options.config;

    // Handle the case where systemInstruction was passed inside config (legacy SDK style)
    if (config?.systemInstruction) {
        systemInstruction = config.systemInstruction;
        // Remove it from config so it doesn't get sent as generationConfig
        const { systemInstruction: _, ...rest } = config;
        config = rest;
    }

    const { data } = await axios.post("/api/gemini", {
      model: options.model,
      contents,
      config,
      systemInstruction
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { text: text, data: data };
  } catch (error: any) {
    console.error("Gemini call failed:", error.response?.data || error.message);
    throw error;
  }
}

const BearIcon = PawPrint;

const FloatingArcaneField = () => {
  const symbols = [
    { s: "w", t: "mana", c: "text-[#f0f2c0]" },
    { s: "u", t: "mana", c: "text-[#00aeef]" },
    { s: "b", t: "mana", c: "text-[#333333]" },
    { s: "r", t: "mana", c: "text-[#ef5350]" },
    { s: "g", t: "mana", c: "text-[#4caf50]" },
    { s: "c", t: "mana", c: "text-slate-400" },
    { s: "ᚦ", t: "rune", c: "text-cyan-500" },
    { s: "ᛟ", t: "rune", c: "text-orange-500" },
    { s: "ᚱ", t: "rune", c: "text-purple-500" },
    { s: "ᛗ", t: "rune", c: "text-white" },
    { s: "ᚠ", t: "rune", c: "text-blue-500" },
    { s: "ᚢ", t: "rune", c: "text-red-500" },
    { s: "Ж", t: "rune", c: "text-cyan-400" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      
      {Array.from({ length: 24 }).map((_, i) => {
        const item = symbols[i % symbols.length];
        const initialX = (i * 137) % 100;
        const initialY = (i * 223) % 100;
        const size = item.t === "mana" ? 180 + (i % 3) * 100 : 250 + (i % 5) * 150;
        const duration = 35 + (i % 7) * 25;
        const delay = i * 0.5;

        return (
          <motion.div
            key={i}
            initial={{ 
              x: `${initialX}vw`, 
              y: `${initialY}vh`, 
              opacity: 0,
              scale: 0.5
            }}
            animate={{
              x: [
                `${initialX}vw`, 
                `${(initialX + 12) % 100}vw`, 
                `${(initialX - 6) % 100}vw`, 
                `${initialX}vw`
              ],
              y: [
                `${initialY}vh`, 
                `${(initialY - 15) % 100}vh`, 
                `${(initialY + 10) % 100}vh`, 
                `${initialY}vh`
              ],
              opacity: [0, 0.35, 0.45, 0.35, 0],
              scale: [0.7, 1.0, 0.8, 1.1, 0.7],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "linear"
            }}
            className={`absolute flex items-center justify-center mix-blend-plus-lighter blur-[0.8px] ${item.c}`}
            style={{ width: size, height: size }}
          >
            {item.t === "mana" ? (
              <i className={`ms ms-${item.s} text-6xl sm:text-8xl drop-shadow-[0_0_15px_currentColor]`} />
            ) : (
              <span className="font-magic text-6xl sm:text-9xl select-none leading-none opacity-40">
                {item.s}
              </span>
            )}
          </motion.div>
        );
      })}

      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={`bg-${i}`}
          animate={{
            x: ["-10%", "10%", "-10%"],
            y: ["-5%", "15%", "-5%"],
            opacity: [0.03, 0.08, 0.03],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 40 + i * 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute text-[45vw] font-magic text-white/5 select-none pointer-events-none mix-blend-overlay"
          style={{
            top: `${(i * 40) % 100}%`,
            left: `${(i * 30) % 100}%`,
          }}
        >
          {symbols[i].s}
        </motion.div>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(6,182,212,0.03)_0%,transparent_50%)]" />
    </div>
  );
};

const renderManaSymbols = (manaCost: any, size = "w-4 h-4") => {
  if (!manaCost) return null;

  let symbols: string[] = [];

  if (Array.isArray(manaCost)) {
    symbols = manaCost.map((s) => `{${String(s).toUpperCase()}}`);
  } else {
    let costString = String(manaCost).toUpperCase();
    // Normalize string: ensure it has {} around everything if it's raw text
    if (!costString.includes("{")) {
      costString = costString
        .replace(/(\d+)/g, "{$1}")
        .replace(/([WUBRGCXTSP])/g, "{$1}");
    }
    symbols = costString.match(/\{[^}]+\}/g) || [];
  }

  // WUBRG Sorting Logic
  const WUBRG_ORDER = ["W", "U", "B", "R", "G", "C"];
  symbols.sort((a, b) => {
    const charA = a.replace(/\{|\}/g, "").charAt(0);
    const charB = b.replace(/\{|\}/g, "").charAt(0);
    const idxA = WUBRG_ORDER.indexOf(charA);
    const idxB = WUBRG_ORDER.indexOf(charB);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <div className="flex items-center gap-0.5 flex-wrap justify-center pointer-events-none">
      {symbols.map((sym, i) => {
        let inner = sym
          .replace(/\{|\}/g, "")
          .replace(/\//g, "")
          .toUpperCase();
        if (!inner) return null;

        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${inner}.svg`}
            alt={sym}
            className={`${size} object-contain shrink-0 select-none block drop-shadow-[0_0_3px_rgba(0,0,0,1)] brightness-125 saturate-150`}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        );
      })}
    </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<
    | "cards"
    | "manage_decks"
    | "sets"
    | "calendar"
    | "sheriff"
    | "judge"
    | "socials"
  >("cards");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Searching the Multiverse...");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const [showRoadmap, setShowRoadmap] = useState(false);
  const [roadmapInitialChangelog, setRoadmapInitialChangelog] = useState(false);
  
  const [cardsPerRowDesktop, setCardsPerRowDesktop] = useState<number>(0); 
  const [cardsPerRowMobile, setCardsPerRowMobile] = useState<number>(1); 
  const [userTitle, setUserTitle] = useState("Deckmaster");
  const [userName, setUserName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isForceNaming, setIsForceNaming] = useState(false);

  const startArcaneLoading = (msg: string) => {
    setLoadingMessage(msg);
    setLoading(true);
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [tagToVerify, setTagToVerify] = useState<{
    deckId: string;
    tag: string;
    suggestions: string[];
    isAmbiguous: boolean;
    originalQuery: string;
    type?: "oracle" | "name" | "mechanic" | "other";
  } | null>(null);
  const [pendingTags, setPendingTags] = useState<Record<string, string[]>>({});
  const [deckDescriptions, setDeckDescriptions] = useState<Record<string, string>>({});
  const [isAiGeneratingTags, setIsAiGeneratingTags] = useState<Record<string, boolean>>({});

  // Performance and reliability for mobile
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Set browser theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#0c0c0c");
    }

    // Optional connection check (silent)
    async function checkConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error: any) {
        // Silently log for developers without alerting user
        console.debug(
          "Firestore: Initial ping failed, might be offline or custom config required.",
          error.message,
        );
      }
    }
    checkConnection();
  }, []);

  const saveUserSettings = async (updates: {
    userTitle?: string;
    cardsPerRowDesktop?: number;
    cardsPerRowMobile?: number;
    userName?: string;
    photoURL?: string;
  }) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...updates,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      if (updates.userTitle !== undefined) setUserTitle(updates.userTitle);
      if (updates.cardsPerRowDesktop !== undefined)
        setCardsPerRowDesktop(updates.cardsPerRowDesktop);
      if (updates.cardsPerRowMobile !== undefined)
        setCardsPerRowMobile(updates.cardsPerRowMobile);
      if (updates.userName !== undefined) setUserName(updates.userName);
      if (updates.photoURL !== undefined) setPhotoURL(updates.photoURL);
      
      // Update Firebase Auth profile for consistency
      if (updates.userName || updates.photoURL) {
        await updateProfile(user, {
          displayName: updates.userName || user.displayName,
          photoURL: updates.photoURL || user.photoURL
        });
      }

      showMessage("IDENTITY_SYNC_COMPLETE", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };


  const [authLoading, setAuthLoading] = useState(true);

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isBearSearch, setIsBearSearch] = useState(false);

  const searchSummary = useMemo(() => {
    if (allCards.length === 0 || !isBearSearch) return null;

    const colors: Record<string, number> = {};
    const types: Record<string, number> = {};

    allCards.forEach((card) => {
      const id = card.color_identity || [];
      if (id.length === 0) {
        colors["C"] = (colors["C"] || 0) + 1;
      } else {
        id.forEach((c: string) => {
          colors[c] = (colors[c] || 0) + 1;
        });
      }

      const type =
        card.type_line?.split("—")[0].trim().split(" ")[0] || "Unknown";
      types[type] = (types[type] || 0) + 1;
    });

    return {
      total: allCards.length,
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]),
      types: Object.entries(types)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [allCards]);
  const [deckbox, setDeckbox] = useState<DeckCard[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);

  const [mtgSets, setMtgSets] = useState<
    {
      code: string;
      name: string;
      icon_svg_uri?: string;
      isFuture: boolean;
      parent_set_code?: string;
      set_type?: string;
      released_at?: string;
    }[]
  >([]);

  const DECK_ROLES = [
    { label: "Card Draw", query: 'o:"draw"' },
    {
      label: "Ramp",
      query: '(otag:ramp OR o:"search your library for a basic land")',
    },
    { label: "Single Removal", query: '(otag:removal OR o:"destroy target")' },
    { label: "Board Wipe", query: '(otag:board-wipe OR o:"destroy all")' },
    { label: "Tutor", query: "otag:tutor" },
    {
      label: "Counterspell",
      query: '(otag:counterspell OR o:"counter target")',
    },
    { label: "Protection", query: '(otag:protection OR o:"hexproof")' },
    {
      label: "Graveyard Hate",
      query: '(otag:graveyard-hate OR o:"exile target card from a graveyard")',
    },
    {
      label: "Recursion",
      query: '(otag:recursion OR o:"return target card from your graveyard")',
    },
  ];

  const KNOWN_FUTURE_SETS = [
    {
      code: "ltr",
      name: "The Hobbit",
      released_at: "2023-06-23",
      set_type: "expansion",
      icon_svg_uri: "https://svgs.scryfall.io/sets/ltr.svg",
    },
    {
      code: "fdn",
      name: "Foundations",
      released_at: "2024-11-15",
      set_type: "expansion",
      icon_svg_uri: "https://svgs.scryfall.io/sets/fdn.svg",
    },
    {
      code: "dft",
      name: "Aetherdrift",
      released_at: "2025-02-14",
      set_type: "expansion",
      icon_svg_uri: "https://svgs.scryfall.io/sets/dft.svg",
    },
    {
      code: "tdb",
      name: "Dragonstorm",
      released_at: "2025-04-11",
      set_type: "expansion",
      icon_svg_uri: "https://svgs.scryfall.io/sets/tdb.svg",
    },
    {
      code: "fin",
      name: "Final Fantasy",
      released_at: "2025-06-01",
      set_type: "expansion",
      icon_svg_uri: "https://svgs.scryfall.io/sets/fin.svg",
    },
  ];

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const data = await fetchScryfallSets();
        let sortedSets = data.data
          .filter(
            (s: any) =>
              [
                "expansion",
                "commander",
                "core",
                "masters",
                "draft_innovation",
                "funny",
                "arsenal",
              ].includes(s.set_type) &&
              !s.digital &&
              !s.name.toLowerCase().includes("omenpaths") &&
              !s.name.toLowerCase().includes("pioneer"),
          )
          .map((s: any) => ({
            code: s.code,
            name: s.name,
            icon_svg_uri: s.icon_svg_uri,
            released_at: s.released_at,
            set_type: s.set_type,
            parent_set_code: s.parent_set_code,
          }));

        // Inject known future sets that might not be in Scryfall yet
        for (const known of KNOWN_FUTURE_SETS) {
          if (
            !sortedSets.find((s: any) =>
              s.name.toLowerCase().includes(known.name.toLowerCase()),
            )
          ) {
            sortedSets.push(known);
          }
        }

        sortedSets = sortedSets
          .map((s: any) => ({
            ...s,
            isFuture: new Date(s.released_at) > new Date(),
          }))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.released_at || "9999-12-31").getTime();
            const dateB = new Date(b.released_at || "9999-12-31").getTime();
            return dateB - dateA; // descending for store
          });

        setMtgSets(sortedSets);
      } catch (err) {
        console.error("Failed to fetch sets", err);
      }
    };
    fetchSets();
  }, []);

  const getSetSymbolUrl = (setCode: string, originalUri?: string) => {
    if (originalUri && originalUri.includes("scryfall.io")) return originalUri;
    // Fallback for missing symbols - can be expanded
    return `https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`;
  };


  // --- Auth & Firestore Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (u) {
        try {
          // Init profile
          const userRef = doc(db, "users", u.uid);
          const userSnap = await getDoc(userRef);
          
          const profileData: any = {
            userId: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            updatedAt: serverTimestamp(),
          };

          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.userTitle) setUserTitle(data.userTitle);
            if (data.userName) {
              setUserName(data.userName);
              setIsForceNaming(false);
            } else if (u.displayName) {
              setUserName(u.displayName);
              setIsForceNaming(false);
            } else {
              setIsForceNaming(true);
            }
            if (data.photoURL) setPhotoURL(data.photoURL);
            if (data.cardsPerRowDesktop !== undefined)
              setCardsPerRowDesktop(data.cardsPerRowDesktop);
            if (data.cardsPerRowMobile !== undefined)
              setCardsPerRowMobile(data.cardsPerRowMobile);

            if (!data.defaultsAppliedV3) {
              profileData.defaultsAppliedV3 = true;
            }
          } else {
            profileData.createdAt = serverTimestamp();
            profileData.defaultsAppliedV3 = true;
            setIsForceNaming(!u.displayName);
            if (u.displayName) setUserName(u.displayName);
          }

          await setDoc(userRef, profileData, { merge: true }).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`),
          );
        } catch (err: any) {
          console.warn("Firestore profile sync issues (non-critical):", err);
          // Don't show scary UI message for background sync failures
        }
      } else {
        setSavedDecks([]);
        setDeckbox([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Sync Decks
    const decksQuery = collection(db, "users", user.uid, "decks");
    const unsubDecks = onSnapshot(
      decksQuery,
      (snapshot) => {
        const decks: SavedDeck[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          decks.push({
            id: doc.id,
            ...(data as any),
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          } as SavedDeck);
        });
        setSavedDecks(decks);
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/decks`),
    );

    // Sync Deckbox
    const deckboxQuery = collection(db, "users", user.uid, "deckbox");
    const unsubDeckbox = onSnapshot(
      deckboxQuery,
      async (snapshot) => {
        const items: DeckCard[] = [];
        snapshot.forEach((doc) => items.push(doc.data() as DeckCard));
        setDeckbox(items);

        // Auto-Reparatie: Voor kaarten zonder Scryfall ID of echte foto's
        const placeholders = items.filter(
          (c) =>
            !c.scryfall_id &&
            (!c.thumb || c.thumb.includes("placeholder-card")),
        );
        if (placeholders.length > 0) {
          for (const card of placeholders) {
            try {
              const res = await axios.get(
                `/api/sf/cards/named?exact=${encodeURIComponent(card.name)}`,
              );
              const sf = res.data;
              const cardId = card.name.replace(/[^a-zA-Z0-9]/g, "_");
              const cardRef = doc(db, "users", user.uid, "deckbox", cardId);
              await updateDoc(cardRef, {
                scryfall_id: sf.id,
                thumb: sf.image_uris?.small || sf.image_uris?.normal || "",
                highRes: sf.image_uris?.normal || sf.image_uris?.large || "",
                prices: sf.prices || {},
                name: sf.name, // 1 op 1 de naam uit scryfall
              }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/deckbox/${cardId}`));
            } catch (e) {
              console.warn(`Could not repair ${card.name}`);
            }
            await new Promise((r) => setTimeout(r, 100)); // Rate limit
          }
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${user.uid}/deckbox`,
        ),
    );

    // Data Migration from LocalStorage
    const migrateData = async () => {
      const localDecks = localStorage.getItem("savedDecks");
      const localDeckbox = localStorage.getItem("deckbox");

      if (localDecks && localDecks !== "undefined") {
        try {
          const decks = JSON.parse(localDecks) as SavedDeck[];
          const batch = writeBatch(db);
          decks.forEach((d) => {
            const deckRef = doc(db, "users", user.uid, "decks", d.id);
            batch.set(
              deckRef,
              {
                ...d,
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          });
          await batch.commit();
          localStorage.removeItem("savedDecks");
          console.log("Migrated local decks to Firestore");
        } catch (e) {
          console.error("Migration failed for decks", e);
        }
      }

      if (localDeckbox && localDeckbox !== "undefined") {
        try {
          const items = JSON.parse(localDeckbox) as DeckCard[];
          const batch = writeBatch(db);
          items.forEach((item) => {
            const cardId = item.name.replace(/[^a-zA-Z0-9]/g, "_");
            const cardRef = doc(db, "users", user.uid, "deckbox", cardId);
            batch.set(cardRef, { ...item, userId: user.uid }, { merge: true });
          });
          await batch.commit();
          localStorage.removeItem("deckbox");
          console.log("Migrated local deckbox to Firestore");
        } catch (e) {
          console.error("Migration failed for deckbox", e);
        }
      }
    };
    migrateData();

    return () => {
      unsubDecks();
      unsubDeckbox();
    };
  }, [user]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const handleEmailAuth = async (mode: 'login' | 'register') => {
    if (!email || !password) {
      showMessage("ENTER_CREDENTIALS", "error");
      return;
    }
    setIsLoggingIn(true);
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("RESONANCE_ESTABLISHED", "success");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("NEW_SOUL_BOUND", "success");
      }
    } catch (e: any) {
      console.error(e);
      showMessage(e.message || "AUTH_EXCEPTION", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    console.log("Login process started...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login success:", result.user.email);
    } catch (error: any) {
      console.error("Detailed Login Error:", error);
      let errorMsg = error.message || error.code || "Unknown error";
      if (error.code === "auth/popup-blocked") {
        errorMsg = "Popup blocked! Please allow popups for this site.";
      }
      showMessage("Login failed: " + errorMsg, "error");
    } finally {
      setIsLoggingIn(false);
      console.log("Login process finished.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeDeckName, setActiveDeckName] = useState("");
  const [isDeckboxOpen, setIsDeckboxOpen] = useState(false);
  const [showFunHub, setShowFunHub] = useState(false);
  const [commanderPreview, setCommanderPreview] = useState<any[] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [mobileCardsPerRow, setMobileCardsPerRow] = useState<1 | 2>(1);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [viewingDeckCards, setViewingDeckCards] = useState<any[] | null>(null);
  const [viewingDeckName, setViewingDeckName] = useState("");
  const [viewingDeckId, setViewingDeckId] = useState("");
  const [isViewingDeck, setIsViewingDeck] = useState(false);

  const loadLocalDeck = async (deck: any) => {
    startArcaneLoading("Accessing Deck Archives...");
    setViewingDeckName(deck.name || deck.deckName || "Saved Deck");
    setViewingDeckId(deck.id || "");

    let cards = deck.cards || [];
    if (cards.length === 0 && deck.id && deck.userId) {
      try {
        const cardsSnap = await getDocs(
          collection(db, "users", deck.userId, "decks", deck.id, "cards"),
        );
        cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Failed to fetch deck cards:", e);
      }
    }

    setViewingDeckCards(cards);
    setIsViewingDeck(true);
    setLoading(false);
  };
  const [isAltCommandersOpen, setIsAltCommandersOpen] = useState(false);
  const [alternativeCommanders, setAlternativeCommanders] = useState<any[]>([]);
  const [zoomedAltCard, setZoomedAltCard] = useState<string | null>(null);
  const [activeMana, setActiveMana] = useState("w");
  const [hoveredPreviewCard, setHoveredPreviewCard] = useState<string | null>(
    null,
  );
  const [hoveredPreviewPrice, setHoveredPreviewPrice] = useState<string | null>(
    null,
  );

  const groupedDeckCards = useMemo(() => {
    if (!viewingDeckCards) return {};

    // Define ordering for groups
    const categoryOrder = [
      "Commanders",
      "Creatures",
      "Vanguards",
      "Instants",
      "Sorceries",
      "Enchantments",
      "Artifacts",
      "Lands",
      "Other",
    ];
    const groups: { [key: string]: any[] } = {};
    categoryOrder.forEach((c) => (groups[c] = []));

    viewingDeckCards.forEach((dc: any) => {
      const c = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const type = (c?.type_line || "").toLowerCase();

      const isCommander = dc.categories?.some((cat: string) =>
        cat.toLowerCase().includes("commander"),
      );

      if (isCommander) {
        groups["Commanders"].push(dc);
      } else if (type.includes("creature")) {
        groups["Creatures"].push(dc);
      } else if (type.includes("planeswalker")) {
        groups["Vanguards"].push(dc);
      } else if (type.includes("instant")) {
        groups["Instants"].push(dc);
      } else if (type.includes("sorcery")) {
        groups["Sorceries"].push(dc);
      } else if (type.includes("enchantment")) {
        groups["Enchantments"].push(dc);
      } else if (type.includes("artifact")) {
        groups["Artifacts"].push(dc);
      } else if (type.includes("land")) {
        groups["Lands"].push(dc);
      } else {
        groups["Other"].push(dc);
      }
    });

    // Sort each group alphabetically
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const nameA = a.card?.oracleCard?.name || a.card?.name || "";
        const nameB = b.card?.oracleCard?.name || b.card?.name || "";
        return nameA.localeCompare(nameB);
      });
    });

    return groups;
  }, [viewingDeckCards]);

  // Check if it's the first time logged in to show onboarding
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("rune_tutorial_seen");
    if (!hasSeenTutorial && user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const closeTutorial = () => {
    setShowOnboarding(false);
    localStorage.setItem("rune_tutorial_seen", "true");
  };
  const [existingInDeck, setExistingInDeck] = useState<Set<string>>(new Set());
  const [activeDeckCards, setActiveDeckCards] = useState<any[]>([]);
  const [commanders, setCommanders] = useState<
    { name: string; art_crop: string; isBackground?: boolean }[]
  >([]);
  const [currentCI, setCurrentCI] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // If we switch views away from search, clear the bear tech box
    if (viewMode !== "search" && (viewMode as string) !== "cards") {
      setIsBearSearch(false);
    }
  }, [viewMode]);

  // Browser History Sync
  useEffect(() => {
    // Check Firestore Connectivity
    const testConnection = async () => {
      // Delay to ensure Firebase had a chance to start networking
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        console.log("[Connectivity] Testing Firestore...");
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("[Connectivity] Firestore verified online.");
      } catch (error: any) {
        if (error?.message?.includes('the client is offline')) {
          console.warn("[Connectivity] Firestore reports offline. This may happen in restricted environments or during initial boot.");
          // We won't show the toast yet to avoid annoying the user if it's just a slow cold start
        } else if (error?.message?.includes('Database \'(default)\' not found')) {
            console.error("[Connectivity] Firestore Error: Database ID mismatch in config.");
            showMessage("Magische database configuratiefout. Contacteer de arcana meester.", "error");
        } else {
          console.error("[Connectivity] Firestore connection check failed:", error);
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.viewMode) {
        setViewMode(event.state.viewMode);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (window.history.state?.viewMode !== viewMode) {
      window.history.pushState({ viewMode }, "", "");
    }
  }, [viewMode]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [contextQuery, setContextQuery] = useState("");
  const [suggestedDecks, setSuggestedDecks] = useState<Set<string>>(new Set());
  const [activeTagTool, setActiveTagTool] = useState<Record<string, 'scan' | 'ai' | 'manual'>>({});
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [rarityFilters, setRarityFilters] = useState<string[]>([]);
  const [setFilter, setSetFilter] = useState("Any");
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [archFilter, setArchFilter] = useState("Any");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedDeckCard, setSelectedDeckCard] = useState<any>(null);
  const [sortBy, setSortBy] = useState("released");
  const [sortDir, setSortDir] = useState("desc");
  const [newDeckIdInput, setNewDeckIdInput] = useState("");

  useEffect(() => {
    let title = "Rune Deck Companion";
    if (viewingDeckName) {
      title = `${viewingDeckName} | Rune Deck`;
    }
    document.title = title;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
  }, [viewingDeckName]);

  const [copied, setCopied] = useState(false);

  // --- Effects ---

  // --- Auth ---
  enum OperationType {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    LIST = "list",
    GET = "get",
    WRITE = "write",
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
      emailVerified?: boolean | null;
    };
  }


  const [message, setMessage] = useState<{
    text: string;
    type: "info" | "error" | "success";
  } | null>(null);
  const [commanderSelection, setCommanderSelection] = useState<{
    id: string;
    deckName: string;
    existingNames: string[];
    totalCost?: number;
    autoSelect: boolean;
    candidates: any[];
  } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowBackToTop(el.scrollTop > 800);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to top when search results change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      // Fallback for tricky render cycles
      const timer = setTimeout(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allCards, viewMode, loading]);

  const showMessage = (
    text: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const getCardImages = (card: Card): any => {
    if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
      return card.card_faces[0].image_uris;
    }
    return card.image_uris || {};
  };

  const initializeDeckState = async (
    id: string,
    deckName: string,
    commanderNames: string[],
    existingNames: Set<string>,
    totalCost?: number,
    autoSelect: boolean = true,
  ) => {
    // If no commanders found, try to infer from existing names (look for legendary creatures)
    let finalCommanderNames = [...commanderNames];

    // Check if we need to ask the user
    if (finalCommanderNames.length === 0 && existingNames.size > 0) {
      const candidates = Array.from(existingNames)
        .filter((name) => !!name && name.trim().length > 0)
        .slice(0, 75); // SCRYFALL LIMIT IS 75
      try {
        const identifiers = candidates.map((name) => ({ name }));
        const { data: sfData } = await axios.post(
          "/api/sf/cards/collection",
          { identifiers },
        );

        // Filter for cards that can be commanders
        const possibleCommanders = sfData.data.filter(
          (c: any) =>
            c &&
            !c.error &&
            c.status !== 404 &&
            c.type_line?.includes("Legendary") &&
            (c.type_line?.includes("Creature") ||
              c.type_line?.includes("Planeswalker") ||
              c.oracle_text?.includes("can be your commander")),
        );

        if (possibleCommanders.length > 0) {
          // If we found candidates, show the selection modal
          setCommanderSelection({
            id,
            deckName,
            existingNames: Array.from(existingNames),
            totalCost,
            autoSelect,
            candidates: possibleCommanders,
          });
          return; // STOP here, wait for user selection
        } else if (sfData.data.length > 0) {
          // No legendaries found, let user pick from the first 50 cards
          setCommanderSelection({
            id,
            deckName,
            existingNames: Array.from(existingNames),
            totalCost,
            autoSelect,
            candidates: sfData.data
              .filter((c: any) => c && !c.error && c.status !== 404)
              .slice(0, 50),
          });
          return;
        } else {
          // Total failure, fallback
          finalCommanderNames = [candidates[0]];
        }
      } catch (e) {
        console.error("Failed to infer commander", e);
        finalCommanderNames = [candidates[0]];
      }
    }

    // Continue with the rest of the logic
    await processDeckWithCommanders(
      id,
      deckName,
      finalCommanderNames,
      existingNames,
      totalCost,
      autoSelect,
    );
  };

  const processDeckWithCommanders = async (
    id: string,
    deckName: string,
    finalCommanderNames: string[],
    existingNames: Set<string>,
    totalCost?: number,
    autoSelect: boolean = true,
  ) => {
    // Fetch commander details for CI and images
    const commanderDetails = await Promise.all(
      finalCommanderNames.map((name) =>
        axios
          .get(
            `/api/sf/cards/named?fuzzy=${encodeURIComponent(name)}`,
          )
          .catch((err) => {
            console.error(`Commander ${name} not found on Scryfall`, err);
            return { data: null };
          }),
      ),
    );

    const ciSet = new Set<string>();
    const commandersData: {
      name: string;
      art_crop: string;
      isBackground: boolean;
      scryfallData?: any;
    }[] = [];

    commanderDetails.forEach((res, index) => {
      const c = res.data;
      if (!c) {
        commandersData.push({
          name: finalCommanderNames[index],
          art_crop: "",
          isBackground: false,
        });
        return;
      }
      c.color_identity?.forEach((color: string) => ciSet.add(color));
      const imgs: any = getCardImages(c);
      const isBackground = c.type_line?.toLowerCase().includes("background");
      const crop = imgs.art_crop || imgs.normal || imgs.large || "";

      if (crop) {
        commandersData.push({
          name: c.name,
          art_crop: crop,
          isBackground: !!isBackground,
          scryfallData: c,
        });
      }
    });

    // Sort commanders so Backgrounds are always last
    commandersData.sort(
      (a, b) => (a.isBackground ? 1 : 0) - (b.isBackground ? 1 : 0),
    );
    const sortedCommanderUrls = commandersData
      .map((c) => c.art_crop)
      .filter((url) => !!url);
    const ciStr = Array.from(ciSet).sort().join("").toLowerCase() || "c";

    // If still no art crop, try to get one from the first card in existingNames
    let finalArtCrops = sortedCommanderUrls;
    if (finalArtCrops.length === 0 && existingNames.size > 0) {
      const firstCard = Array.from(existingNames)[0];
      try {
        const { data: cData } = await axios.get(
          `/api/sf/cards/named?fuzzy=${encodeURIComponent(firstCard)}`,
        );
        const imgs = getCardImages(cData);
        if (imgs.art_crop) finalArtCrops = [imgs.art_crop];
      } catch (e) {
        // Ignore
      }
    }

    // Update saved decks in Firestore
    if (user) {
      const deckRef = doc(db, "users", user.uid, "decks", id);
      const existingSnap = await getDoc(deckRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;

      const deckData = {
        id: String(id),
        userId: user.uid,
        name: deckName,
        tags: existingData?.tags || [],
        commanders: finalCommanderNames,
        commanderNames: finalCommanderNames,
        existingNames: Array.from(existingNames),
        art_crops: finalArtCrops,
        ci: ciStr,
        totalCost: totalCost || existingData?.totalCost || 0,
        updatedAt: serverTimestamp(),
      };
      
      if (!existingSnap.exists()) {
        (deckData as any).createdAt = serverTimestamp();
      }

      const path = `users/${user.uid}/decks/${String(id)}`;
      await setDoc(deckRef, deckData, { merge: true })
        .catch((err) => handleFirestoreError(err, OperationType.WRITE, path));
    }

    if (autoSelect) {
      setActiveDeckId(id);
      setActiveDeckName(deckName);
      setExistingInDeck(existingNames);
      setCommanders(commandersData);
      setCurrentCI(ciStr);
    }

    // Reset filters when loading a new deck
    setTypeFilters([]);
    setRarityFilters([]);
    setSetFilter("Any");
    setArchFilter("Any");
    setColorFilters([]);

    // Perform initial search after loading deck
    performSearch({
      ciOverride: ciStr,
      queryOverride: "",
      skipViewChange: !autoSelect,
    });
  };

  const onSelectCommander = (selectedNames: string[]) => {
    if (!commanderSelection) return;
    const { id, deckName, existingNames, totalCost, autoSelect } =
      commanderSelection;
    setCommanderSelection(null);
    processDeckWithCommanders(
      id,
      deckName,
      selectedNames,
      new Set(existingNames),
      totalCost,
      autoSelect,
    );
  };

  const fetchArchidektDeck = async (id: string, autoSelect: boolean = true) => {
    if (!id.trim()) return;
    startArcaneLoading("Fetching Deck Chronicles...");
    try {
      const { data } = await axios.get(`/api/ad/${id}`);

      const commanderNames: string[] = [];
      const existingNames = new Set<string>();
      const cardLists: string[] = [];

      data.cards.forEach((dc: any) => {
        const c = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
        const name = c?.name || dc.card?.name;
        if (!name) return;

        existingNames.add(name);
        const qty = dc.quantity || 1;
        for (let i = 0; i < qty; i++) cardLists.push(name);

        if (
          dc.categories?.some((cat: string) =>
            cat.toLowerCase().includes("commander"),
          )
        ) {
          commanderNames.push(name);
        }
      });

      const deckName = data.name || `Deck ${id}`;
      let totalCost = 0;
      const fetchedCards: any[] = [];

      // Fetch accurate prices and details from Scryfall
      if (cardLists.length > 0) {
        const BATCH_SIZE = 75;
        const uniqueNames = Array.from(new Set(cardLists));
        const qtyMap = new Map();
        cardLists.forEach((n) => qtyMap.set(n, (qtyMap.get(n) || 0) + 1));
        const commandersSet = new Set(commanderNames);

        for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
          const batchNames = uniqueNames.slice(i, i + BATCH_SIZE);
          const identifiers = batchNames.map((name) => ({ name }));
          try {
            const { data: sfData } = await axios.post(
              "/api/sf/cards/collection",
              { identifiers },
            );
            if (sfData && sfData.data) {
              sfData.data.forEach((card: any) => {
                if (card) {
                  const qty =
                    qtyMap.get(card.name) ||
                    qtyMap.get(card.name.split(" // ")[0]) ||
                    0;
                  const eurStr = card.prices?.eur || card.prices?.eur_foil;
                  if (eurStr) totalCost += parseFloat(eurStr) * qty;

                  fetchedCards.push({
                    card,
                    quantity: qty,
                    categories: Array.from(commandersSet).some(
                      (cn) =>
                        cn.toLowerCase() === card.name.toLowerCase() ||
                        card.name.toLowerCase().startsWith(cn.toLowerCase()),
                    )
                      ? ["Commander"]
                      : [],
                  });
                }
              });
            }
          } catch (e) {
            console.error("Batch fetch failed", e);
          }
        }
      }

      await initializeDeckState(
        id,
        deckName,
        commanderNames,
        existingNames,
        totalCost,
        autoSelect,
      );
      // Removed setIsViewingDeck(true) to stay in context as requested
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.error || "Failed to load deck from Archidekt";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTappedOutDeck = async (id: string, autoSelect: boolean = true) => {
    if (!id.trim()) return;
    startArcaneLoading("Fetching Deck Chronicles...");
    try {
      const { data } = await axios.get(`/api/to/${id}`);
      if (data.error) throw new Error(data.error);

      // We might get JSON or a rawText string fallback
      let rawText = data.rawText;
      const commanderNames: string[] = data.commanders || [];
      const existingNames = new Set<string>();
      let deckName = data.deckName || data.name || `TappedOut Deck ${id}`;
      let totalCost = 0;

      const cardLists: string[] = [];

      const cleanTappedOutName = (name: string) => {
        return name
          .replace(/\*CMDR\*/g, "")
          .replace(/\*F\*/g, "")
          .replace(/\*E\*/g, "")
          .replace(/\*A\*/g, "")
          .replace(/\*L\*/g, "")
          .replace(/\*B\*/g, "")
          .replace(/\*P\*/g, "")
          .replace(/\*S\*/g, "")
          .replace(/ \(F\)$/, "")
          .replace(/ \(V\.\d+\)$/, "")
          .trim();
      };

      if (rawText) {
        const lines = rawText.split("\n");
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#"))
            return;

          let cardName = cleanTappedOutName(trimmed);
          let isCommander = trimmed.includes("*CMDR*");
          let qty = 1;

          const match = cardName.match(/^(\d+)x?\s+(.+)$/);
          if (match) {
            qty = parseInt(match[1]);
            cardName = match[2].trim();
          }

          if (cardName) {
            existingNames.add(cardName);
            for (let i = 0; i < qty; i++) cardLists.push(cardName);
            if (isCommander && !commanderNames.includes(cardName)) {
              commanderNames.push(cardName);
            }
          }
        });
      } else if (data.inventory) {
        data.inventory.forEach((item: any) => {
          let cardName = cleanTappedOutName(
            item.card?.oracleCard?.name || item.card?.name || item.name || "",
          );
          if (!cardName) return;
          const qty = item.quantity || 1;
          existingNames.add(cardName);
          for (let i = 0; i < qty; i++) cardLists.push(cardName);
          const cats = item.categories || [];
          if (
            (item.b === "commander" ||
              cats.some((c: string) =>
                c.toLowerCase().includes("commander"),
              )) &&
            !commanderNames.includes(cardName)
          ) {
            commanderNames.push(cardName);
          }
        });
      }

      // Fetch prices and card data for the viewer
      const fetchedCards: any[] = [];
      if (cardLists.length > 0) {
        try {
          const BATCH_SIZE = 75;
          const uniqueNames = Array.from(
            new Set(cardLists.map((n) => n.split(" // ")[0])),
          );
          const qtyMap = new Map();
          cardLists.forEach((n) => {
            const clean = n.split(" // ")[0];
            qtyMap.set(clean, (qtyMap.get(clean) || 0) + 1);
          });

          const commandersSet = new Set(commanderNames);

          for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
            const batchNames = uniqueNames.slice(i, i + BATCH_SIZE);
            const identifiers = batchNames.map((name) => ({ name }));
            const { data: sfData } = await axios.post(
              "/api/sf/cards/collection",
              { identifiers },
            );
            if (sfData && sfData.data) {
              sfData.data.forEach((card: any) => {
                if (card) {
                  const qty =
                    qtyMap.get(card.name) ||
                    qtyMap.get(card.name.split(" // ")[0]) ||
                    0;
                  if (card.prices?.eur || card.prices?.eur_foil) {
                    totalCost +=
                      parseFloat(card.prices.eur || card.prices.eur_foil) * qty;
                  }

                  fetchedCards.push({
                    card: card,
                    quantity: qty,
                    categories: Array.from(commandersSet).some(
                      (cn) =>
                        cn.toLowerCase() === card.name.toLowerCase() ||
                        card.name.toLowerCase().startsWith(cn.toLowerCase()),
                    )
                      ? ["Commander"]
                      : [],
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to calculate deck cost", e);
        }
      }

      await initializeDeckState(
        id,
        deckName,
        commanderNames,
        existingNames,
        totalCost,
        autoSelect,
      );
      // Removed setIsViewingDeck(true) to stay in context as requested
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.error || "Failed to load deck from TappedOut";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoxfieldDeck = async (id: string, autoSelect: boolean = true) => {
    if (!id.trim()) return;
    startArcaneLoading("Fetching Deck Chronicles...");
    try {
      const { data } = await axios.get(`/api/mf/${id}`);
      if (data.error) throw new Error(data.error);

      const commanderNames: string[] = [];
      const existingNames = new Set<string>();
      const cardLists: string[] = [];
      let deckName = data.name || `Moxfield Deck ${id}`;

      // Handle rawText fallback from proxy
      if (data.rawText) {
        const lines = data.rawText.split("\n");
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const match = trimmed.match(/^(\d+)x?\s+(.+)$/);
          if (match) {
            const qty = parseInt(match[1]);
            let name = match[2].trim();
            const isCommander = name.toLowerCase().includes("*cmdr*");
            name = name.replace(/\*CMDR\*/gi, "").trim();
            existingNames.add(name);
            if (isCommander && !commanderNames.includes(name)) commanderNames.push(name);
            for (let i = 0; i < qty; i++) cardLists.push(name);
          }
        });
      }

      // 1. Normalized data extraction helper
      const processBoard = (board: any) => {
        if (!board) return;
        // Handle both flat { "Card Name": { qty } } and nested { cards: { "Card Name": { qty } } }
        const cards = board.cards || board;
        Object.keys(cards).forEach(name => {
          const cardData = cards[name];
          const qty = cardData.quantity || 1;
          existingNames.add(name);
          for (let i = 0; i < qty; i++) cardLists.push(name);
        });
      };

      // 2. Handle both flat and nested board structures (from /all vs /contents)
      const boards = data.boards || data;

      // Commanders (Special handling to mark them)
      if (boards.commanders) {
        const cmdrCards = boards.commanders.cards || boards.commanders;
        Object.keys(cmdrCards).forEach(name => {
          if (!commanderNames.includes(name)) commanderNames.push(name);
          existingNames.add(name);
          const qty = cmdrCards[name].quantity || 1;
          for (let i = 0; i < qty; i++) cardLists.push(name);
        });
      }

      if (boards.commandersPartner) processBoard(boards.commandersPartner);
      if (boards.mainboard) processBoard(boards.mainboard);
      if (boards.sideboard) processBoard(boards.sideboard);

      let totalCost = 0;

      // Fetch accurate prices and details from Scryfall
      if (cardLists.length > 0) {
        const BATCH_SIZE = 75;
        const uniqueNames = Array.from(new Set(cardLists));
        const qtyMap = new Map();
        cardLists.forEach((n) => qtyMap.set(n, (qtyMap.get(n) || 0) + 1));

        for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
          const batchNames = uniqueNames.slice(i, i + BATCH_SIZE);
          const identifiers = batchNames.map((name) => ({ name }));
          try {
            const { data: sfData } = await axios.post(
              "/api/sf/cards/collection",
              { identifiers },
            );
            if (sfData && sfData.data) {
              sfData.data.forEach((card: any) => {
                if (card) {
                  const qty = qtyMap.get(card.name) || qtyMap.get(card.name.split(" // ")[0]) || 0;
                  const eurStr = card.prices?.eur || card.prices?.eur_foil;
                  if (eurStr) totalCost += parseFloat(eurStr) * qty;
                }
              });
            }
          } catch (e) {
            console.error("Moxfield batch fetch failed", e);
          }
        }
      }

      await initializeDeckState(
        id,
        deckName,
        commanderNames,
        existingNames,
        totalCost,
        autoSelect,
      );
    } catch (error: any) {
      console.error("[Moxfield Import] Error:", error);
      const msg = error.response?.data?.error || error.message || "Failed to load deck from Moxfield";
      
      if (error.response?.status === 403 || msg.includes("403") || msg.includes("Forbidden")) {
        showMessage("Moxfield blokkeert de automatische import. Probeer het over een paar minuten nog eens.", "error");
      } else {
        showMessage(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnyDeck = async (input: string, autoSelect: boolean = true) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Detect if URL or direct ID
    const ids = trimmed
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s);
    if (ids.length === 0) return;

    for (const rawId of ids) {
      let deckId = rawId;
      let source = "archidekt";

      if (rawId.includes("tappedout.net")) {
        source = "tappedout";
        const match = rawId.match(/mtg-decks\/([^/]+)/);
        if (match) deckId = match[1];
      } else if (rawId.includes("archidekt.com")) {
        source = "archidekt";
        const match = rawId.match(/decks\/(\d+)/);
        if (match) deckId = match[1];
      } else if (rawId.includes("moxfield.com")) {
        source = "moxfield";
        const match = rawId.match(/decks\/([^/?#]+)/);
        if (match) deckId = match[1];
      } else {
        // If no url, detect by format: Archidekt IDs are usually numeric
        if (/^\d+$/.test(deckId)) {
          source = "archidekt";
        } else if (deckId.length > 15) {
          // Moxfield IDs are usually longer non-obvious strings
          source = "moxfield";
        } else {
          source = "tappedout";
        }
      }

      if (source === "archidekt") {
        await fetchArchidektDeck(deckId, autoSelect);
      } else if (source === "moxfield") {
        await fetchMoxfieldDeck(deckId, autoSelect);
      } else {
        await fetchTappedOutDeck(deckId, autoSelect);
      }
    }

    if (!autoSelect) {
      setNewDeckIdInput("");
    }
  };

  const clearDeckSelection = () => {
    setActiveDeckId(null);
    setActiveDeckName("");
    setExistingInDeck(new Set());
    setCurrentCI("");
    setCommanders([]);
  };

  const [glowIndex, setGlowIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIndex((prev) => (prev + 1) % 10); // Slower cycle for 5 mana + 5 runes
    }, 5000); // 5 seconds per step
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const MANA_CHARS = ["w", "u", "b", "r", "g"];
    const interval = setInterval(() => {
      setActiveMana((prev) => {
        const idx = MANA_CHARS.indexOf(prev);
        return MANA_CHARS[(idx + 1) % MANA_CHARS.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const findAlternativeCommanders = async () => {
    if (!viewingDeckCards) return;

    // 1. Identify current CI
    const currentCommanders = viewingDeckCards.filter((dc) =>
      dc.categories?.some((cat: string) =>
        cat.toLowerCase().includes("commander"),
      ),
    );

    if (currentCommanders.length === 0) {
      showMessage("COMMANDER UNKNOWN - CI ANALYSIS RESTRICTED", "error");
      return;
    }

    const commanderColors = new Set<string>();
    currentCommanders.forEach((dc) => {
      const colors =
        dc.card?.scryfallData?.color_identity ||
        dc.card?.oracleCard?.color_identity ||
        dc.card?.color_identity ||
        [];
      colors.forEach((col: string) => commanderColors.add(col));
    });

    const WUBRG_ORDER = ["w", "u", "b", "r", "g"];
    const ciString =
      WUBRG_ORDER.filter((c) => commanderColors.has(c.toUpperCase())).join("") ||
      "c";

    // 2. Multiverse Pulse: Search Scryfall for all relevant legends in these exact colors
    try {
      startArcaneLoading("Synchronizing Command Options...");
      // Query refinements: 
      // - Single legends MUST have exact CI (id=ciString)
      // - Partners and Backgrounds CAN have smaller CI (id<=ciString) because they only form the CI when paired
      const query = `f:commander ((t:legendary t:creature id=${ciString}) or ((is:partner or is:background) id<=${ciString}))`;
      const response = await fetch(
        `/api/sf/cards/search?q=${encodeURIComponent(query)}&order=edhrec`,
      );
      const data = await response.json();

      if (data.data) {
        // Filter out existing commanders to show true "alternatives"
        const existingNames = new Set(
          currentCommanders.map((dc) => (dc.card?.name || "").toLowerCase()),
        );
        
        let filtered = data.data.filter(
          (c: any) => !existingNames.has((c.name || "").toLowerCase()),
        );

      // Strict Requirement: 
      // - If a card is NOT a partner/background, it MUST have exact CI match
      // - Partners and Backgrounds are ONLY suggested for 1-color or 2-color decks as alternatives
      const isMultiColorDeck = ciString.length >= 3;
      
      filtered = filtered.filter((c: any) => {
        const isPartner = (c.oracle_text || "").toLowerCase().includes("partner");
        const isBackground = (c.type_line || "").toLowerCase().includes("background") || (c.oracle_text || "").toLowerCase().includes("choose a background");
        
        if (isPartner || isBackground) {
          // Rule: Partners/Backgrounds only for 1 or 2 color decks
          if (isMultiColorDeck) return false;
          return true;
        }

        // For single commanders, we want exact CI match
        const cardCI = (c.color_identity || []).join("").toLowerCase();
        // Sort both for comparison
        const sortedCardCI = WUBRG_ORDER.filter(char => cardCI.includes(char)).join("");
        const sortedTargetCI = WUBRG_ORDER.filter(char => ciString.includes(char)).join("");
        return sortedCardCI === sortedTargetCI;
      });

        setAlternativeCommanders(filtered);
        setIsAltCommandersOpen(true);
        showMessage(
          `${filtered.length} POTENTIAL LEADERS DISCOVERED`,
          "success",
        );
      } else {
        showMessage("NO LEGENDS FOUND IN THESE FREQUENCIES", "info");
      }
    } catch (e) {
      console.error(e);
      showMessage("VOID SIGNAL INTERFERENCE", "error");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    clearDeckSelection();
    setSearchQuery("");
    setContextQuery("");
    setTypeFilters([]);
    setRarityFilters([]);
    setSetFilter("Any");
    setColorFilters([]);
    setArchFilter("Any");
    setViewMode("cards");
    setHasSearched(false);
    setAllCards([]);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleFunModeClick = (
    mode: "sets" | "calendar" | "sheriff" | "judge",
  ) => {
    clearDeckSelection();
    setViewMode(mode);
    setIsMobileMenuOpen(false);
    setShowFunHub(false);
    setSearchQuery("");
    setContextQuery("");
    setTypeFilters([]);
    setRarityFilters([]);
    setSetFilter("Any");
    setColorFilters([]);
    setArchFilter("Any");
  };

  const performSearch = async (options?: {
    queryOverride?: string;
    ciOverride?: string;
    typeOverride?: string;
    typesOverride?: string[];
    rarityOverride?: string;
    raritiesOverride?: string[];
    setOverride?: string;
    colorOverride?: string;
    colorsOverride?: string[];
    archOverride?: string;
    orderOverride?: string;
    dirOverride?: string;
    skipCI?: boolean;
    skipViewChange?: boolean;
    skipFormatFilters?: boolean;
    isBearActivation?: boolean;
  }) => {
    startArcaneLoading("Searching the Multiverse...");
    setHasSearched(true);
    setIsBearSearch(options?.isBearActivation || false);
    try {
      // Resolve Parameters
      let ci =
        options?.ciOverride !== undefined
          ? options.ciOverride
          : activeDeckId
            ? currentCI
            : "Any";
      let order =
        options?.orderOverride !== undefined ? options.orderOverride : sortBy;
      let dir =
        options?.dirOverride !== undefined ? options.dirOverride : sortDir;

      // Hard restriction: If a deck is selected, results MUST fall within its color identity
      // unless we are explicitly doing a global search (skipCI: true)
      // prioritize ciOverride if provided
      if (
        options?.ciOverride === undefined &&
        activeDeckId &&
        currentCI &&
        !options?.skipCI
      ) {
        ci = currentCI;
      } else if (!activeDeckId && options?.ciOverride === undefined) {
        // No deck selected and no specific override: search ALL colors
        ci = "Any";
      }

      // 2. Build Query
      let queryParts: string[] = [];

      // System / Format Filters
      if (!options?.skipFormatFilters) {
        queryParts.push(
          "(-is:digital OR is:paper)",
          "-is:funny",
          "include:extras",
        );
      }

      // Universal Exclusions - ALWAYS exclude tokens and emblems
      queryParts.push("-is:token", "-t:token", "-t:emblem", "-is:art_series");

      // Color Identity Enforcement
      if (ci && ci !== "Any" && !options?.skipCI) {
        queryParts.push(`id<=${ci}`);
      }

      let types =
        options?.typesOverride !== undefined
          ? options.typesOverride
          : options?.typeOverride !== undefined
            ? [options.typeOverride]
            : typeFilters;
      let rarities =
        options?.raritiesOverride !== undefined
          ? options.raritiesOverride
          : options?.rarityOverride !== undefined
            ? [options.rarityOverride]
            : rarityFilters;
      let set =
        options?.setOverride !== undefined ? options.setOverride : setFilter;
      let colors =
        options?.colorsOverride !== undefined
          ? options.colorsOverride
          : options?.colorOverride !== undefined
            ? [options.colorOverride]
            : colorFilters;
      let arch =
        options?.archOverride !== undefined ? options.archOverride : archFilter;

      // If a specific queryOverride is provided, we assume a fresh search and clear context
      let activeContext =
        options?.queryOverride !== undefined
          ? options.queryOverride
          : contextQuery || "";
      if (options?.queryOverride === "") {
        setContextQuery("");
        activeContext = "";

        // Only clear all filters if we are explicitly resetting the search
        types = [];
        rarities = [];
        set = "Any";
        colors = [];
        arch = "Any";

        setTypeFilters([]);
        setRarityFilters([]);
        setSetFilter("Any");
        setColorFilters([]);
        setArchFilter("Any");
      }

      // If a queryOverride is provided, we transition context
      if (options?.queryOverride !== undefined) {
        setContextQuery(options.queryOverride);
        activeContext = options.queryOverride;

        // If we are clearing context OR selecting a NEW context, reset filters
        // Especially clear archFilter (Veggie Search) on manual search or transition
        if (
          options.queryOverride === "" ||
          options.queryOverride !== contextQuery
        ) {
          types =
            options.typesOverride !== undefined
              ? options.typesOverride
              : options.typeOverride !== undefined
                ? [options.typeOverride]
                : [];
          rarities =
            options.raritiesOverride !== undefined
              ? options.raritiesOverride
              : options.rarityOverride !== undefined
                ? [options.rarityOverride]
                : [];
          set = options.setOverride !== undefined ? options.setOverride : "Any";
          colors =
            options.colorsOverride !== undefined
              ? options.colorsOverride
              : options.colorOverride !== undefined
                ? [options.colorOverride]
                : [];
          arch =
            options.archOverride !== undefined ? options.archOverride : "Any";

          setTypeFilters(types);
          setRarityFilters(rarities);
          setSetFilter(set);
          setColorFilters(colors);
          setArchFilter(arch);
        }

        // Clear local searchQuery state if we are transitioning context (manually or via shortcut)
        if (options.queryOverride !== undefined) {
          setSearchQuery("");
        }
      }

      // Dropdown Filters
      if (types.length > 0) {
        queryParts.push(`(${types.map((t) => `t:${t}`).join(" OR ")})`);
      }
      if (rarities.length > 0) {
        queryParts.push(`(${rarities.map((r) => `r:${r}`).join(" OR ")})`);
      }
      if (set !== "Any") queryParts.push(`s:${set}`);
      if (colors.length > 0) {
        const colorQueries = colors.map((colorChar) => {
          if (colorChar === "C") return "identity:c";
          if (colorChar === "M") return "id:multi";
          return `identity:${colorChar.toLowerCase()}`;
        });

        // If we have specific colors selected but NOT colorless (C),
        // we explicitly exclude colorless cards to satisfy user request.
        let finalColorQuery = `(${colorQueries.join(" OR ")})`;
        if (!colors.includes("C")) {
          finalColorQuery += " -identity:c";
        }
        queryParts.push(finalColorQuery);
      }

      // Veggie Search Filter (Arch)
      if (arch !== "Any") {
        const role = DECK_ROLES.find((r) => r.label === arch);
        if (role) queryParts.push(`(${role.query})`);
      }

      // User Input / Context
      let userLogic: string[] = [];
      if (activeContext) {
        userLogic.push(`(${activeContext})`);
      }

      const effectiveSearch =
        options?.queryOverride !== undefined && options.queryOverride !== ""
          ? ""
          : searchQuery;

      if (effectiveSearch.trim()) {
        // Expand search to be more inclusive as requested
        userLogic.push(
          `("${effectiveSearch}" OR name:"${effectiveSearch}" OR o:"${effectiveSearch}" OR t:"${effectiveSearch}")`,
        );
      }

      if (userLogic.length > 0) {
        queryParts.push(`(${userLogic.join(" ")})`);
      }

      const query = queryParts.join(" ");

      // Use unique=cards to get distinct cards, or unique=prints if we want variants
      const url = `/api/sf/cards/search?q=${encodeURIComponent(query)}&order=${order}&dir=${dir}&unique=cards`;
      console.log("Searching Scryfall:", url);
      const { data } = await axios.get(url);
      setAllCards(data.data || []);

      if (!options?.skipViewChange) {
        setViewMode("cards");
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAllCards([]);
        // We don't necessarily want to show an "Error" for 404 if it's just no results
      } else {
        if (err.response?.status === 400) {
          console.warn(
            "Scryfall rejected search query with 400 Bad Request:",
            query,
            err.response?.data,
          );
          setAllCards([]);
        } else {
          console.error("Search failed", err);
          showMessage(
            "Search failed: " + (err.response?.data?.details || err.message),
            "error",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCardSelection = async (card: Card) => {
    if (!user) return showMessage("Please login to manage your deckbox.");

    const isSelected = deckbox.find((c) => c.name === card.name);
    const cardId = card.name.replace(/[^a-zA-Z0-9]/g, "_");
    const cardRef = doc(db, "users", user.uid, "deckbox", cardId);

    if (isSelected) {
      await deleteDoc(cardRef).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${user.uid}/deckbox/${cardId}`,
        ),
      );
    } else {
      const images: any = getCardImages(card);
      const newCard = {
        userId: user.uid,
        name: card.name,
        scryfallId: card.id || cardId,
        addedAt: serverTimestamp(),
        thumb: images.small || "",
        highRes: images.normal || images.large || "",
        from_deck: activeDeckName || "Manual",
        qty: 1,
        prices: card.prices || {},
      };
      await setDoc(cardRef, newCard).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/deckbox/${cardId}`,
        ),
      );
    }
  };

  const updateCardQty = async (name: string, delta: number) => {
    if (!user) return;
    const cardId = name.replace(/[^a-zA-Z0-9]/g, "_");
    const cardRef = doc(db, "users", user.uid, "deckbox", cardId);
    const item = deckbox.find((c) => c.name === name);
    if (!item) return;

    const newQty = Math.max(0, item.qty + delta);
    if (newQty === 0) {
      await deleteDoc(cardRef).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${user.uid}/deckbox/${cardId}`,
        ),
      );
    } else {
      await updateDoc(cardRef, { qty: newQty }).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/deckbox/${cardId}`,
        ),
      );
    }
  };

  const copyDecklist = async () => {
    if (deckbox.length === 0) return;
    const list = deckbox.map((c) => `${c.qty} ${c.name}`).join("\n");
    try {
      await navigator.clipboard.writeText(list);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
      // Fallback for some browsers in iframes
      const textArea = document.createElement("textarea");
      textArea.value = list;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  const deleteSavedDeck = async (id: string) => {
    if (!user) return;
    const deckRef = doc(db, "users", user.uid, "decks", id);
    try {
      await deleteDoc(deckRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/decks/${id}`));
      setSavedDecks((prev) => prev.filter((d) => d.id !== id));
      if (activeDeckId === id) setActiveDeckId(null);
      showMessage("ARCHIVE DISSOLVED", "success");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/decks/${id}`,
      );
    } finally {
      setDeckToDelete(null);
    }
  };

  const viewDeckDetails = async (id: string, source?: string) => {
    startArcaneLoading("Fetching Deck Chronicles...");
    try {
      if (!source) {
        if (/^\d+$/.test(id)) source = "archidekt";
        else if (id.length > 15) source = "moxfield";
        else source = "tappedout";
      }

      let parsedCards: any[] = [];
      let deckName = "Deck List";

      if (source === "tappedout") {
        const { data } = await axios.get(`/api/to/${id}`);
        if (data.error) throw new Error(data.error);

        deckName = data.deckName || data.name || `TappedOut Deck ${id}`;

        if (data.rawText) {
          const lines = data.rawText.split("\n");
          const cards: any[] = [];
          lines.forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#"))
              return;

            let cardName = trimmed;
            let qty = 1;

            if (cardName.includes("Sideboard:")) return;

            // Improve quantity and name matching
            // Match formats like "1x Card Name" or "1 Card Name"
            const match = cardName.match(/^(\d+)x?\s+(.+)$/i);
            if (match) {
              qty = parseInt(match[1]);
              cardName = match[2].trim();
            }

            // Remove TappedOut specific markers
            cardName = cardName.replace(/\*CMDR\*/g, "").trim();
            cardName = cardName.replace(/\*F\*/g, "").trim(); // Foil
            cardName = cardName.replace(/\*A\*/g, "").trim(); // Altered
            cardName = cardName.split(" #")[0].trim(); // Card tags like #Bear

            if (cardName) {
              cards.push({
                card: { oracleCard: { name: cardName } },
                quantity: qty,
              });
            }
          });
          parsedCards = cards;
        } else if (data.inventory) {
          // If inventory already comes in the correct format (e.g. from our proxy's HTML scraping)
          parsedCards = data.inventory
            .filter((item: any) => {
              const categories = (item.categories || []).map((cat: string) =>
                cat.toLowerCase(),
              );
              return (
                !categories.includes("sideboard") &&
                !categories.includes("maybeboard")
              );
            })
            .map((item: any) => ({
              ...item,
              card: item.card || { oracleCard: { name: item.name } },
            }));
        }
      } else if (source === "moxfield") {
        const { data } = await axios.get(`/api/mf/${id}`);
        if (data.error) throw new Error(data.error);
        deckName = data.name || `Moxfield Deck ${id}`;

        const cards: any[] = [];
        if (data.commanders) {
          Object.keys(data.commanders).forEach((name) => {
            cards.push({
              card: { oracleCard: { name } },
              quantity: data.commanders[name].quantity || 1,
              categories: ["commander"],
            });
          });
        }
        if (data.commandersPartner) {
          Object.keys(data.commandersPartner).forEach((name) => {
            cards.push({
              card: { oracleCard: { name } },
              quantity: data.commandersPartner[name].quantity || 1,
              categories: ["commander"],
            });
          });
        }
        if (data.mainboard) {
          Object.keys(data.mainboard).forEach((name) => {
            cards.push({
              card: { oracleCard: { name } },
              quantity: data.mainboard[name].quantity || 1,
            });
          });
        }
        parsedCards = cards;
      } else {
        const { data } = await axios.get(`/api/ad/${id}`);
        const cards = data.cards || (data.data && data.data.cards);

        if (!cards) {
          throw new Error("No cards found in deck response");
        }

        // More robust filtering
        parsedCards = cards.filter((dc: any) => {
          const categories = (dc.categories || []).map((cat: any) =>
            typeof cat === "string" ? cat.toLowerCase() : cat,
          );
          return (
            !categories.includes("sideboard") &&
            !categories.includes("maybeboard")
          );
        });
        deckName = data.name || "Deck List";
      }

      // Batch fetch missing images from Scryfall
      const cardsWithoutImages = parsedCards.filter((c) => {
        const scryfallId =
          c.card?.scryfall_id ||
          c.card?.scryfallId ||
          c.card?.uids?.scryfall ||
          c.card?.scryfallData?.id ||
          c.card?.scryfall_data?.id;
        const sfData = c.card?.scryfallData || c.card?.scryfall_data;
        const img =
          c.card?.edition?.imageUrl ||
          c.card?.edition?.image_url ||
          sfData?.image_uris?.normal ||
          sfData?.image_uris?.large ||
          sfData?.imageUris?.normal;
        return !img && !scryfallId;
      });

      if (cardsWithoutImages.length > 0) {
        try {
          const BATCH_SIZE = 75;
          const namesToFetch = Array.from(
            new Set(
              cardsWithoutImages
                .map(
                  (c) =>
                    (c.card?.oracleCard?.name || c.card?.name || "").split(
                      " // ",
                    )[0],
                )
                .filter(Boolean),
            ),
          ) as string[];
          const sfMap = new Map();

          for (let i = 0; i < namesToFetch.length; i += BATCH_SIZE) {
            const batch = namesToFetch.slice(i, i + BATCH_SIZE);
            const identifiers = batch.map((name) => ({ name }));
            const { data: sfData } = await axios.post(
              "/api/sf/cards/collection",
              { identifiers },
            );
            if (sfData && sfData.data) {
              sfData.data.forEach((sfCard: any) => {
                if (sfCard && sfCard.name) {
                  sfMap.set(sfCard.name.toLowerCase(), sfCard);
                  if (sfCard.name.includes(" // ")) {
                    sfMap.set(
                      sfCard.name.split(" // ")[0].toLowerCase(),
                      sfCard,
                    );
                  }
                }
              });
            }
            if (i + BATCH_SIZE < namesToFetch.length)
              await new Promise((r) => setTimeout(r, 100));
          }

          parsedCards = parsedCards.map((c) => {
            const name = (
              c.card?.oracleCard?.name ||
              c.card?.name ||
              ""
            ).toLowerCase();
            const cleanName = name.split(" // ")[0];
            const sfCard = sfMap.get(name) || sfMap.get(cleanName);
            if (sfCard) {
              return {
                ...c,
                card: {
                  ...c.card,
                  scryfallData: sfCard,
                },
              };
            }
            return c;
          });
        } catch (e) {
          console.error("Scryfall batch fetch failed:", e);
        }
      }

      setViewingDeckCards(parsedCards);
      setViewingDeckName(deckName);
      setIsViewingDeck(true);
    } catch (err: any) {
      console.error("Failed to fetch deck details", err);
      const msg = err.response?.data?.error || "Failed to load deck details";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };



  const addTag = async (deckId: string, tagString: string) => {
    if (!tagString.trim() || !user) return;
    const tag = tagString.trim();
    if (!tag) return;

    const deck = savedDecks.find((d) => d.id === deckId);
    if (!deck) return;

    // Provide instant visual feedback
    setPendingTags((prev) => ({
      ...prev,
      [deckId]: [...(prev[deckId] || []), tag],
    }));

    if (!tag.includes(":::") && !tag.includes(":") && !tag.includes("=")) {
      try {
        let q = tag;
        let analysis: any = null;

        if (true) {
          const prompt = `Analyze MTG concept "${tag}" for color identity ${deck.ci || "c"}. 
          Category: name, mechanic, oracle, or other?
          Convert to valid Scryfall search string.
          If 0 results likely or ambiguous, suggest 3 alternatives.
          Return ONLY JSON: { "type": "name"|"mechanic"|"oracle"|"other", "query": "...", "suggestions": ["...", "..."], "isAmbiguous": boolean }`;

          const res = await callGemini({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" },
          });
          analysis = JSON.parse(res.text || "{}");
          q = analysis.query || tag;
        }

        const testQuery = `(${q}) id:${deck.ci || "c"}`;
        let resultsCount = 0;
        try {
          const scryRes = await axios.get(
            `/api/sf/cards/search?q=${encodeURIComponent(testQuery)}`,
          );
          resultsCount = scryRes.data.total_cards;
        } catch (e) {}

        if (resultsCount === 0 || (analysis && analysis.isAmbiguous)) {
          setTagToVerify({
            deckId,
            tag,
            suggestions: analysis?.suggestions || [],
            isAmbiguous: analysis?.isAmbiguous || false,
            originalQuery: q,
            type: analysis?.type,
          });

          // Remove from pending as it needs user decision
          setPendingTags((prev) => ({
            ...prev,
            [deckId]: (prev[deckId] || []).filter((t) => t !== tag),
          }));
          return;
        }

        const finalEntry = `${tag}:::${q}`;
        const deckRef = doc(db, "users", user.uid, "decks", deckId);
        const exists = (deck.tags || []).some(
          (t) =>
            t.toLowerCase().startsWith(tag.toLowerCase() + ":::") ||
            t === finalEntry,
        );

        if (!exists) {
          await updateDoc(deckRef, {
            tags: arrayUnion(finalEntry),
            updatedAt: serverTimestamp(),
          }).catch((err) =>
            handleFirestoreError(
              err,
              OperationType.WRITE,
              `users/${user.uid}/decks/${deckId}`,
            ),
          );
        }

        // Cleanup pending
        setPendingTags((prev) => ({
          ...prev,
          [deckId]: (prev[deckId] || []).filter((t) => t !== tag),
        }));
      } catch (e) {
        console.error("Tag verification error", e);
        const deckRef = doc(db, "users", user.uid, "decks", deckId);
        await updateDoc(deckRef, {
          tags: arrayUnion(`${tag}:::${tag}`),
          updatedAt: serverTimestamp(),
        }).catch((err) =>
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `users/${user.uid}/decks/${deckId}`,
          ),
        );

        setPendingTags((prev) => ({
          ...prev,
          [deckId]: (prev[deckId] || []).filter((t) => t !== tag),
        }));
      }
    } else {
      const deckRef = doc(db, "users", user.uid, "decks", deckId);
      await updateDoc(deckRef, {
        tags: arrayUnion(tag),
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/decks/${deckId}`,
        ),
      );

      setPendingTags((prev) => ({
        ...prev,
        [deckId]: (prev[deckId] || []).filter((t) => t !== tag),
      }));
    }
  };

  const finalizeTag = async (deckId: string, tag: string, query: string) => {
    if (!user) return;
    const deckRef = doc(db, "users", user.uid, "decks", deckId);
    await updateDoc(deckRef, {
      tags: arrayUnion(`${tag}:::${query}`),
      updatedAt: serverTimestamp(),
    }).catch((err) =>
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/decks/${deckId}`,
      ),
    );
    setTagToVerify(null);
    setPendingTags((prev) => ({
      ...prev,
      [deckId]: (prev[deckId] || []).filter((t) => t !== tag),
    }));
  };

  const removeTag = async (deckId: string, tag: string) => {
    if (!user) return;
    const deckRef = doc(db, "users", user.uid, "decks", deckId);
    const deck = savedDecks.find((d) => d.id === deckId);
    if (deck) {
      await updateDoc(deckRef, {
        tags: deck.tags.filter((t) => t !== tag),
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/decks/${deckId}`,
        ),
      );
    }
  };

  // --- Render Helpers ---
  const autoAddCommanderTags = async (
    deckId: string,
    commanderNames: string[],
  ) => {
    try {
      if (!commanderNames || commanderNames.length === 0) return;

      const validNames = commanderNames.filter((n) => !n.startsWith("http"));
      if (validNames.length === 0) {
        showMessage("Legacy deck detected. Please reload this deck first.");
        return;
      }

      startArcaneLoading("Analyzing Arcane Synergy...");

      // Fetch card details for all commanders
      const cardData = await Promise.all(
        validNames.map((name) =>
          axios
            .get(
              `/api/sf/cards/named?exact=${encodeURIComponent(name)}`,
            )
            .then((r) => r.data)
            .catch(() => null),
        ),
      );

      const deck = savedDecks.find((d) => d.id === deckId);
      const existingTags = deck?.tags || [];

      const commandersInfo = cardData
        .filter((c) => c !== null)
        .map(
          (c) =>
            `Commander: ${c.name}\nType: ${c.type_line}\nOracle: ${c.oracle_text}`,
        )
        .join("\n\n");

      if (!commandersInfo) {
        showMessage("Could not find commander details on Scryfall.", "error");
        return;
      }

      const prompt = `You are a professional Magic: The Gathering deck architect. 
Analyze the following commander(s) and their synergy:

${commandersInfo}

Suggest 5-8 valid Scryfall search queries that represent deep mechanical synergies for this deck.
Output a valid JSON array of objects.
Each object must have:
"label": A short, readable name for the frontend (e.g. "Card Draw", "Elf Tribal")
"query": The EXACT Scryfall search syntax (e.g. o:"draw a card", t:elf, kw:flying)

Rules for tags (Scryfall queries):
1. Must be valid Scryfall syntax (e.g. o:"keyword", t:type, kw:ability).
2. Must find cards that syngergize with the commander.
3. Only return the exact syntax as the query.
4. Do not include existing tags: ${existingTags.map((t) => t.split(":::")[0]).join(", ")}

Return ONLY JSON. No markdown backticks.`;

      if (false) {
        showMessage(
          "No Gemini API Key available. Configuration error.",
          "error",
        );
        return;
      }
      const response = await callGemini({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      let jsonStr = (response.text || "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      if (!jsonStr || jsonStr === "undefined") {
        throw new Error("AI returned invalid JSON: empty or undefined");
      }
      let parsed = [];
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Ongeldige JSON van AI");
      }

      const validTags = [];
      for (const item of parsed) {
        if (!item.label || !item.query) continue;

        // Test query against Scryfall
        const testQuery = `(${item.query}) id:${deck?.ci || "c"}`;
        try {
          // Delay to prevent rate limiting
          await new Promise((r) => setTimeout(r, 100));
          const res = await axios.get(
            `/api/sf/cards/search?q=${encodeURIComponent(testQuery)}`,
          );
          if (res.data.total_cards > 0) {
            validTags.push(`${item.label}:::${item.query}`);
          }
        } catch (e: any) {
          // Ignore 404s (no cards found)
        }
      }

      if (validTags.length === 0) {
        showMessage("Magic failed: No valid tags yielded results.");
        return;
      }

      if (user) {
        const deckRef = doc(db, "users", user.uid, "decks", deckId);
        const combined = Array.from(new Set([...existingTags, ...validTags]));
        await updateDoc(deckRef, {
          tags: combined,
          updatedAt: serverTimestamp(),
        }).catch((err) =>
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `users/${user.uid}/decks/${deckId}`,
          ),
        );
      }

      setSuggestedDecks((prev) => new Set(prev).add(deckId));
      showMessage(
        `Magic complete! Added ${validTags.length} valid suggestions.`,
      );
    } catch (err: any) {
      console.error("Failed to fetch commander for tags", err);
      let msg = err.message || "Unknown error";
      if (msg.includes("API key expired")) {
        msg = "API key expired. Refresh your Gemini API key in the settings.";
      }
      showMessage(`Magic failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAiTagsFromDescription = async (deckId: string, description: string) => {
    if (!description.trim()) return;
    
    startArcaneLoading("Manifesting Strategy Runes...");
    setIsAiGeneratingTags(prev => ({ ...prev, [deckId]: true }));
    console.log(`[AI] Starting extraction for deck ${deckId}...`);
    try {
      const deck = savedDecks.find(d => d.id === deckId);
      const existingTags = deck?.tags || [];
      
      const prompt = `You are a professional Magic: The Gathering deck architect.
The player will describe what they want their deck to do (they might use Dutch or English).
Description: "${description}"

Suggest 5-8 valid Scryfall search queries that represent deep mechanical synergies for this deck goal.
Output a valid JSON array of objects.
Each object must have:
"label": A short, readable name for the tag IN ENGLISH (e.g. "Sacrifice Layout", "Token Generation")
"query": The EXACT Scryfall search syntax (e.g. o:"sacrifice a creature", oracle:"create a 1/1")

Rules:
1. Must be valid Scryfall syntax.
2. Must find cards that synergize with the described goal.
3. Only return the exact syntax as the query.
4. If the input is in Dutch, translate the intent but keep the 'label' in English.
5. Do not include existing tags: ${existingTags.map(t => t.split(":::")[0]).join(", ")}

Return ONLY JSON. No markdown backticks.`;

      if (false) {
        showMessage("AI functionality is not available. Check your GEMINI_API_KEY.", "error");
        return;
      }

      console.log("[AI] Sending prompt to Gemini...");
      const response = await callGemini({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      console.log("[AI] Gemini response received.");
      let jsonStr = (response.text || "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      
      if (!jsonStr || jsonStr === "undefined") {
        throw new Error("AI returned invalid JSON: empty or undefined");
      }

      let parsed = [];
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error("[AI] JSON Parse Fail:", jsonStr);
        throw new Error("Failed to parse AI response as JSON");
      }

      console.log(`[AI] Parsed ${parsed.length} suggestions. Validating with Scryfall...`);
      const validTags: string[] = [];
      
      // Parallelize the Scryfall testing for much better performance
      const validationPromises = parsed.map(async (item: any) => {
        if (!item.label || !item.query) return;
        const testQuery = `(${item.query}) id:${deck?.ci || "c"}`;
        try {
          const res = await axios.get(`/api/sf/cards/search?q=${encodeURIComponent(testQuery)}`);
          if (res.data.total_cards > 0) {
            console.log(`[AI] Valid tag found: ${item.label}`);
            return `${item.label}:::${item.query}`;
          }
        } catch (e) {
          console.warn(`[AI] Scryfall validation failed for: ${item.query}`);
          return null;
        }
      });

      const results = await Promise.all(validationPromises);
      results.forEach(res => {
        if (res) validTags.push(res);
      });

      console.log(`[AI] Validation complete. ${validTags.length} tags survived.`);

      if (validTags.length > 0 && user) {
        const deckRef = doc(db, "users", user.uid, "decks", deckId);
        const combined = Array.from(new Set([...existingTags, ...validTags]));
        await updateDoc(deckRef, { 
          tags: combined, 
          updatedAt: serverTimestamp() 
        }).catch((err) =>
          handleFirestoreError(
            err,
            OperationType.WRITE,
            `users/${user.uid}/decks/${deckId}`,
          ),
        );
        showMessage(`AI Magic complete! Added ${validTags.length} synergy tags.`);
        setSuggestedDecks((prev) => new Set(prev).add(deckId));
        setDeckDescriptions(prev => ({ ...prev, [deckId]: "" })); // Clear after success
      } else {
        showMessage("AI couldn't find valid search queries for that description.", "info");
      }
    } catch (error: any) {
      console.error(error);
      showMessage(`Failed to generate AI tags: ${error.message || "Unknown error"}`, "error");
    } finally {
      setIsAiGeneratingTags(prev => ({ ...prev, [deckId]: false }));
      setLoading(false);
    }
  };

  const renderColorIdentity = (ci: string) => {
    const fixedCI = ci || "c";
    return (
      <div className="flex gap-1">
        {fixedCI.split("").map((s, i) => {
          const inner = s.toUpperCase();
          return (
            <img
              key={`${s}-${i}`}
              src={`https://svgs.scryfall.io/card-symbols/${inner}.svg`}
              className="w-4 h-4"
              alt={s}
              referrerPolicy="no-referrer"
            />
          );
        })}
      </div>
    );
  };

  const ManaSpinner = ({ className = "w-8 h-8" }: { className?: string }) => {
    const symbols = ["w", "u", "b", "r", "g"];
    const radius = 40;
    return (
      <div className={`relative ${className} flex items-center justify-center`}>
        {/* Magic Orbit Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-20%] border border-dashed border-orange-500/20 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-40%] border border-orange-500/5 rounded-full"
        />

        {/* Static Symbols in Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          {symbols.map((s, i) => (
            <div
              key={s}
              className="absolute w-[35%] h-[35%]"
              style={{
                top: `${50 + radius * Math.sin((i * 2 * Math.PI) / 5 - Math.PI / 2)}%`,
                left: `${50 + radius * Math.cos((i * 2 * Math.PI) / 5 - Math.PI / 2)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.img
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                src={MANA_SYMBOL_URIS[`{${s.toUpperCase()}}`]}
                className="w-full h-full drop-shadow-[0_0_8px_rgba(255,152,0,0.3)]"
                alt={s}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <ManaSpinner className="w-16 h-16" />
          <p className="text-white/20 font-magic tracking-widest text-xs animate-pulse italic">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#0A0A0A] border border-white/10 p-10 rounded-[32px] shadow-2xl relative z-10 text-center"
        >
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
            <img
              src={logo}
              alt="Logo"
              className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,152,0,0.4)]"
            />
          </div>

          <h1 className="text-4xl font-magic font-extrabold text-white mb-2 uppercase tracking-tighter">
            Rune <span className="text-orange-500">Deck</span>
          </h1>
          <p className="text-white/40 text-sm mb-10 font-medium font-sans px-4 leading-relaxed">
            The quickest way to find new power for your Commander decks.
            Discover which fresh releases have the perfect synergy for your
            favorite strategies.
          </p>

          <div className="w-full space-y-4">
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="EMAIL_ADDRESS" 
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xs text-white font-mono placeholder:text-white/10 focus:border-orange-500/20 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="SECRET_KEY" 
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xs text-white font-mono placeholder:text-white/10 focus:border-orange-500/20 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleEmailAuth('login')}
                disabled={isLoggingIn}
                className="py-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl text-[10px] font-magic font-black uppercase tracking-widest hover:bg-orange-500 hover:text-black transition-all active:scale-95 disabled:opacity-50"
              >
                Sign In
              </button>
              <button
                onClick={() => handleEmailAuth('register')}
                disabled={isLoggingIn}
                className="py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl text-[10px] font-magic font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                Register
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[8px] font-mono text-white/10 uppercase font-black">or resonate via</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <button
              onClick={login}
              disabled={isLoggingIn}
              className={`w-full flex items-center justify-center gap-3 py-4 rune-panel text-orange-500/80 hover:text-orange-500 hover:border-orange-500/30 transition-all font-magic font-black active:scale-[0.98] tracking-widest text-[10px] z-10 ${isLoggingIn ? "opacity-50 cursor-wait" : ""}`}
            >
              {isLoggingIn ? (
                <span className="animate-pulse">signing in...</span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>

            <p className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">
              Authorized by Slopsie
            </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen rune-bg text-white flex overflow-hidden font-sans relative">

      <div
        className="fixed inset-0 z-0 opacity-[0.04] pointer-events-none mix-blend-screen bg-center bg-cover bg-no-repeat bg-fixed object-cover"
        style={{ backgroundImage: `url(${runesBackground})` }}
      />
      <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[40vh] h-[40vh] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c0c0c]/90 backdrop-blur-3xl border-b border-white/[0.04] z-[120] flex items-center justify-between px-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={goHome}
        >
          <Zap className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          <h1 className="text-[10px] font-magic font-black uppercase tracking-[0.3em] text-white">
            Rune Deck <span className="text-cyan-400">{VERSION}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white/40 hover:text-cyan-400 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-7 h-7 text-cyan-400" />
            ) : (
              <Menu className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Filter Dropdown */}
      <AnimatePresence>
        {isFiltersOpen && viewMode === "cards" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-16 left-0 right-0 z-[110] bg-[#0c0c0c]/95 backdrop-blur-2xl border-b border-white/10 p-5 shadow-2xl overflow-y-auto max-h-[70vh] no-scrollbar"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h3 className="text-xs font-magic font-black uppercase tracking-widest text-cyan-400">Live Filters</h3>
              <button onClick={() => setIsFiltersOpen(false)} className="text-white/20"><X className="w-4 h-4" /></button>
            </div>
            {/* Context Filters */}
            <div className="space-y-4">
               <div>
                  <label className="text-[8px] font-magic font-black text-white/30 uppercase tracking-widest block mb-2">Context Search</label>
                  <input 
                    type="text"
                    value={contextQuery}
                    onChange={(e) => setContextQuery(e.target.value)}
                    placeholder="e.g. card disadvantage, land destruction..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white outline-none focus:border-cyan-500/30 transition-all font-mono"
                  />
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setSortBy(sortBy === "released" ? "usd" : "released")} className="py-2.5 rounded-xl border border-white/10 text-[9px] font-magic font-black uppercase text-white/60 bg-white/5 flex items-center justify-center gap-2">
                   <Clock className="w-3 h-3" /> {sortBy === "released" ? "By Date" : "By Price"}
                 </button>
                 <button onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")} className="py-2.5 rounded-xl border border-white/10 text-[9px] font-magic font-black uppercase text-white/60 bg-white/5 flex items-center justify-center gap-2">
                   <ArrowUpDown className="w-3 h-3" /> {sortDir === "asc" ? "Asc" : "Desc"}
                 </button>
               </div>
               <button 
                  onClick={() => {
                    setIsFiltersOpen(false);
                    performSearch();
                  }}
                  className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 rounded-xl text-[9px] font-magic font-black uppercase tracking-widest shadow-lg shadow-cyan-500/10"
               >
                 Apply Filters
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        id="sidebar-root"
        className={`
        fixed inset-y-0 left-0 z-[100] w-[300px] bg-[#0c0c0c] border-r-2 border-[#1a1a1a] shadow-[4px_0_24px_rgba(0,0,0,0.8)] flex flex-col shrink-0 transition-transform duration-500 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="rune-book-spine" />
        <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

        <div className="flex flex-col items-center p-4 pl-10 pb-2 relative z-10">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-white/20"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="flex flex-col items-center cursor-pointer group relative"
            onClick={goHome}
          >
            <div className="w-24 h-24 mb-3 group-hover:scale-105 transition-transform relative">
              <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={logo}
                alt="Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(255,152,0,0.6)]"
              />
            </div>
            <h1 className="text-2xl font-magic font-extrabold text-white tracking-tighter text-center leading-none uppercase">
              Rune Deck <br />{" "}
              <span className="text-lg opacity-80 uppercase tracking-widest text-orange-500/80">
                Companion
              </span>
            </h1>
          </div>
          <p className="text-[9px] text-orange-500/60 uppercase tracking-[0.4em] font-bold mt-2">
            Quick add tech
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pl-10 space-y-6">
          {/* Section 1: Search Fields */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Database className="w-3 h-3 text-orange-500" />
                <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">
                  Decks
                </h2>
              </div>
              <button
                id="manage-decks-btn"
                onClick={() => {
                  clearDeckSelection();
                  setSearchQuery("");
                  setContextQuery("");
                  setTypeFilters([]);
                  setRarityFilters([]);
                  setSetFilter("Any");
                  setColorFilters([]);
                  setArchFilter("Any");
                  setViewMode("manage_decks");
                }}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl transition-all group shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                title="Manage Decks"
              >
                <Settings2 className="w-4.5 h-4.5 text-cyan-400/60 group-hover:text-cyan-400 group-hover:rotate-90 transition-all" />
                <span className="text-[10px] font-magic font-black text-cyan-400/40 group-hover:text-cyan-400 uppercase tracking-widest">
                  Library
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="relative group">
                {savedDecks.length === 0 ? (
                  <button
                    onClick={() => {
                      const message = "You must add or import a deck first!";
                      const errEl = document.createElement("div");
                      errEl.className =
                        "fixed top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-white/20 backdrop-blur-md z-[1000]";
                      errEl.innerText = message;
                      document.body.appendChild(errEl);
                      setTimeout(() => errEl.remove(), 4000);

                      const manageBtn =
                        document.getElementById("manage-decks-btn");
                      if (manageBtn) {
                        manageBtn.classList.add(
                          "ring-4",
                          "ring-cyan-500",
                          "animate-pulse",
                          "bg-cyan-500/20",
                        );
                        setTimeout(
                          () =>
                            manageBtn.classList.remove(
                              "ring-4",
                              "ring-cyan-500",
                              "animate-pulse",
                              "bg-cyan-500/20",
                            ),
                          3000,
                        );
                      }
                    }}
                    className="w-full text-left appearance-none rune-panel rounded-sm px-4 py-3 text-[10px] font-magic font-bold uppercase tracking-[0.2em] text-white/50 outline-none hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                  >
                    Select a Deck...
                  </button>
                ) : (
                  <select
                    className="w-full appearance-none rune-panel rounded-sm px-4 py-3 text-[10px] font-magic font-bold uppercase tracking-[0.2em] text-white/50 outline-none focus:border-cyan-500/50 hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                      onChange={(e) => {
                        const deckId = e.target.value;
                        setIsMobileMenuOpen(false);
                        if (!deckId) {
                          clearDeckSelection();
                          performSearch({ queryOverride: "" });
                          return;
                        }
                        const deck = savedDecks.find((d) => d.id === deckId);
                        if (deck) {
                          setActiveDeckId(deck.id);
                          setActiveDeckName(deck.name);
                          setExistingInDeck(new Set(deck.existingNames));
                          setCurrentCI(deck.ci || "");
                          setViewMode("cards");
                          performSearch({
                            ciOverride: deck.ci || "",
                            queryOverride: "",
                          });
                          const cmdNames =
                            deck.commanderNames || deck.commanders || [];
                          initializeDeckState(
                            deck.id,
                            deck.name,
                            cmdNames,
                            new Set(deck.existingNames),
                            deck.totalCost || 0,
                            true,
                          );
                        }
                      }}
                      value={activeDeckId || ""}
                    >
                      <option key="placeholder" value="" className="bg-[#0A0A0A]">
                        Select a Deck...
                      </option>
                      {savedDecks.map((deck) => (
                        <option
                          key={deck.id}
                          value={deck.id}
                          className="bg-[#0A0A0A]"
                        >
                          {deck.name}
                        </option>
                      ))}
                    </select>
                )}
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 pointer-events-none group-hover:text-cyan-400 transition-colors z-20" />
              </div>

              {activeDeckId && commanders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setCommanderPreview(commanders);
                    setIsMobileMenuOpen(false);
                  }}
                  className="relative h-28 rounded-xl overflow-hidden border border-white/5 bg-black/40 cursor-pointer group hover:border-orange-500/30 transition-all mt-2"
                >
                  <div className="flex w-full h-full">
                    {commanders.map((cmd, i) => (
                      <div
                        key={i}
                        className="flex-1 relative overflow-hidden group"
                      >
                        <img
                          src={
                            cmd.art_crop ||
                            "https://cards.scryfall.io/art_crop/front/3/b/3b19e4a3-764c-474d-9ac3-818617d12f3e.jpg"
                          }
                          alt={cmd.name}
                          className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                          <span className="text-[7px] font-magic font-extrabold text-white/40 uppercase tracking-tighter truncate">
                            {cmd.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-black/60 px-2 py-1 rounded-full border border-white/10 backdrop-blur-md">
                      {renderManaSymbols(currentCI, "w-3 h-3")}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-md">
                      <Zap className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* Section 4: Search & Filters (Unified) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-orange-500" />
                  <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">
                    Search Engine
                  </h2>
                </div>
              </div>

              {activeDeckId && (
                <button
                  onClick={() => {
                    const deck = savedDecks.find((d) => d.id === activeDeckId);
                    setIsMobileMenuOpen(false);
                    if (!deck || !deck.tags || deck.tags.length === 0) {
                      showMessage(
                        "No synergy tags found. Initiate 'Generate Tags' at your deck profile first.",
                        "info",
                      );
                      return;
                    }
                    const tagQuery =
                      "(" +
                      deck.tags
                        .map((t) =>
                          t.includes(":::")
                            ? t.split(":::").slice(1).join(":::")
                            : `o:"${t}" OR t:"${t}"`,
                        )
                        .join(") OR (") +
                      ")";
                    setViewMode("cards");
                    performSearch({
                      queryOverride: tagQuery,
                      ciOverride: deck.ci || currentCI || "c",
                      skipCI: false,
                      skipFormatFilters: false,
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rune-panel text-cyan-500/80 hover:text-cyan-400 hover:border-cyan-500/30 font-black text-[10px] transition-all font-magic uppercase tracking-[0.3em] active:scale-[0.98] z-10"
                >
                  <Zap className="w-4 h-4" />
                  Rune Based Search
                  <span className="text-[7px] text-white/20 ml-1">(Tags)</span>
                </button>
              )}

              <div className="relative group">
                <select
                  value={archFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setArchFilter(val);
                    setSearchQuery("");
                    setViewMode("cards");
                    performSearch({
                      queryOverride: "",
                      archOverride: val,
                      ciOverride: currentCI || "",
                      skipFormatFilters: false,
                    });
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full appearance-none rune-panel rounded-sm px-4 py-2.5 text-[8px] font-magic font-black uppercase tracking-[0.2em] text-white/50 outline-none focus:border-cyan-500/50 hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                >
                  <option value="Any" className="bg-[#0A0A0A]">
                    Veggie Search
                  </option>
                  {DECK_ROLES.map((r) => (
                    <option
                      key={r.label}
                      value={r.label}
                      className="bg-[#0A0A0A]"
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/10 pointer-events-none group-hover:text-cyan-400 transition-colors z-20" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Manual search..."
                  className="bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] border border-white/[0.04] rounded-[1.5rem] px-4 py-2.5 text-[10px] font-bold flex-1 focus:border-orange-500/50 outline-none text-white/80 placeholder:text-white/20 transition-all font-sans uppercase tracking-widest"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "NumpadEnter") {
                      performSearch({ queryOverride: "" });
                      setIsMobileMenuOpen(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    performSearch({ queryOverride: "" });
                    setIsMobileMenuOpen(false);
                  }}
                  className="rune-panel px-4 py-2.5 flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all z-10"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Integrated Filters Section - Visible always if results or viewing cards */}
              {(allCards.length > 0 || viewMode === "cards") && (
                <div className="pt-4 border-t border-white/5 mt-4">
                  <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="w-full flex items-center justify-between mb-2 group"
                  >
                    <div className="flex items-center gap-2">
                      <Filter
                        className={`w-3 h-3 ${isFiltersExpanded ? "text-cyan-400" : "text-cyan-400/40"}`}
                      />
                      <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">
                        Live Filters
                      </h2>
                    </div>
                    <div
                      className={`transition-transform duration-300 ${isFiltersExpanded ? "rotate-180" : ""}`}
                    >
                      <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-cyan-400" />
                    </div>
                  </button>

                  {isFiltersExpanded && (
                    <div className="space-y-4 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">
                          Category
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "Creature",
                            "Sorcery",
                            "Instant",
                            "Artifact",
                            "Enchantment",
                            "Land",
                            "Planeswalker",
                          ].map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                const next = typeFilters.includes(t)
                                  ? typeFilters.filter((f) => f !== t)
                                  : [...typeFilters, t];
                                setTypeFilters(next);
                                performSearch({ typesOverride: next });
                              }}
                              className={`px-2 py-1 rounded-sm text-[8px] font-magic font-bold uppercase transition-all border ${
                                typeFilters.includes(t)
                                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                                  : "bg-white/5 border-white/5 text-white/30 hover:text-white/60"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">
                          Rarity
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {["common", "uncommon", "rare", "mythic"].map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                const next = rarityFilters.includes(r)
                                  ? rarityFilters.filter((f) => f !== r)
                                  : [...rarityFilters, r];
                                setRarityFilters(next);
                                performSearch({ raritiesOverride: next });
                              }}
                              className={`px-2 py-1 rounded-sm text-[8px] font-magic font-bold uppercase transition-all border ${
                                rarityFilters.includes(r)
                                  ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                  : "bg-white/5 border-white/5 text-white/30 hover:text-white/60"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">
                          Identity
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {["W", "U", "B", "R", "G", "C", "M"].map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                const next = colorFilters.includes(c)
                                  ? colorFilters.filter((f) => f !== c)
                                  : [...colorFilters, c];
                                setColorFilters(next);
                                performSearch({ colorsOverride: next });
                              }}
                              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
                                colorFilters.includes(c)
                                  ? "bg-white/20 border-white text-white"
                                  : "bg-white/5 border-white/5 text-white/20 hover:text-white/60"
                              }`}
                            >
                              {["W", "U", "B", "R", "G"].includes(c) ? (
                                <img
                                  src={MANA_SYMBOL_URIS[`{${c}}`]}
                                  className="w-4 h-4"
                                  alt={c}
                                />
                              ) : (
                                <span className="text-[10px] font-magic font-bold">
                                  {c === "C" ? "♢" : "★"}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-2">
                        <div className="space-y-1">
                          <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">
                            Sort Order
                          </span>
                          <select
                            value={sortBy}
                            onChange={(e) => {
                              setSortBy(e.target.value);
                              performSearch({ orderOverride: e.target.value });
                            }}
                            className="w-full bg-black/60 border border-white/5 rounded-sm px-2 py-2 text-[10px] outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-white/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                          >
                            <option value="released">Release Date</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="eur">Value (EUR)</option>
                            <option value="cmc">Mana Value</option>
                            <option value="rarity">Rarity</option>
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            setTypeFilters([]);
                            setRarityFilters([]);
                            setColorFilters([]);
                            setIsFiltersExpanded(false);
                            performSearch({ queryOverride: "" });
                          }}
                          className="w-full py-2 bg-white/5 border border-white/10 text-white/40 font-magic font-bold text-[9px] hover:bg-white/10 transition-all uppercase tracking-widest rounded-sm"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile-Only Selection Button relocated under Live Filters */}
              <div className="md:hidden mb-4 mt-2">
                <button
                  onClick={() => {
                    setIsDeckboxOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl group active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-orange-500" />
                    <span className="text-[11px] font-magic font-black text-white uppercase tracking-widest">
                      Selections
                    </span>
                  </div>
                  {deckbox.length > 0 && (
                    <span className="text-xs font-mono font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      {deckbox.length}
                    </span>
                  )}
                </button>
              </div>
            </section>
             {/* Section 5: Expansion & Modules */}
          <section className="space-y-2">
            <div className="flex items-center justify-between border-t border-white/5 pt-3 mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-cyan-500 animate-pulse" />
                <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">
                  Arcane Modules
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleFunModeClick("sets")}
                className="flex flex-col items-center justify-center py-2.5 rune-panel text-white/40 hover:text-cyan-400 font-magic hover:border-cyan-500/30 transition-all group z-10 gap-1 rounded-md border border-white/5 bg-white/[0.02]"
              >
                <Library className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[7.5px] font-magic font-bold uppercase tracking-widest leading-none">
                  Expansions
                </span>
              </button>
              <button
                onClick={() => handleFunModeClick("calendar")}
                className="flex flex-col items-center justify-center py-2.5 rune-panel text-white/40 hover:text-orange-500 font-magic hover:border-orange-500/30 transition-all group z-10 gap-1 rounded-md border border-white/5 bg-white/[0.02]"
              >
                <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform text-orange-500/80 group-hover:text-orange-500" />
                <span className="text-[7.5px] font-magic font-bold uppercase tracking-widest leading-none text-orange-500/80 group-hover:text-orange-500">
                  Timeline
                </span>
              </button>
              <button
                onClick={() => handleFunModeClick("sheriff")}
                className="flex flex-col items-center justify-center py-2.5 rune-panel text-amber-500/60 hover:text-amber-400 font-magic hover:border-amber-500/50 transition-all group z-10 gap-1 rounded-md border border-white/5 bg-white/[0.02]"
              >
                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-500/80 group-hover:text-amber-500" />
                <span className="text-[7.5px] font-magic font-bold uppercase tracking-widest leading-none text-amber-500/80 group-hover:text-amber-400">
                  Sheriff
                </span>
              </button>
              <button
                id="ruxa-beacon"
                onClick={() => handleFunModeClick("judge")}
                className="flex flex-col items-center justify-center py-2.5 rune-panel text-green-500/60 hover:text-green-400 font-magic hover:border-green-500/50 transition-all group z-10 gap-1 rounded-md border border-white/5 bg-white/[0.02]"
              >
                <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform text-green-500/80 group-hover:text-green-500" />
                <span className="text-[7.5px] font-magic font-bold uppercase tracking-widest leading-none text-green-500/80 group-hover:text-green-400">
                  Bear Judge
                </span>
              </button>
              <button
                onClick={() => {
                  setSearchQuery("Bear");
                  performSearch({
                    queryOverride: "art:bear f:paper",
                    skipCI: true,
                    orderOverride: "released",
                    dirOverride: "desc",
                    isBearActivation: true,
                  });
                  setIsMobileMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center py-2.5 rune-panel text-orange-400/60 hover:text-orange-400 font-magic hover:border-orange-500/50 transition-all group z-10 gap-1 rounded-md border border-white/5 bg-white/[0.02]"
              >
                <PawPrint className="w-4 h-4 group-hover:scale-125 transition-transform text-orange-500/60 group-hover:text-orange-400" />
                <span className="text-[7.5px] font-magic font-bold uppercase tracking-widest leading-none">
                  Bears
                </span>
              </button>

            </div>
          </section>
        </div>

        {/* Section 6: User & Settings */}
        <div className="p-4 bg-transparent border-t border-white/5 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative shrink-0 group"
            >
              <div className="w-11 h-11 rounded-full bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                {photoURL || user?.photoURL ? (
                  <img
                    src={photoURL || user?.photoURL || ""}
                    alt="Profile"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <User className="w-5 h-5 text-white/20" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center text-white/40 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                <Settings className="w-3 h-3 group-hover:rotate-90 transition-transform" />
              </div>
            </button>

            <div className="flex-1 flex flex-col items-start min-w-0">
              <span className="text-[10px] font-magic font-black text-white/60 uppercase tracking-[0.1em] truncate w-full">
                {userName || user?.displayName || "User"}
              </span>
              <span className="text-[9px] font-sans font-black text-orange-500/80 uppercase tracking-widest truncate w-full">
                {userTitle || "Novice"}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                <p className="text-[5px] font-sans font-bold text-white/20 uppercase leading-tight tracking-wider">
                  © {new Date().getFullYear()} Slopsie.
                </p>
                <p
                  className="text-[4.5px] font-sans font-medium text-white/10 uppercase leading-tight hover:text-white/40 transition-colors cursor-help max-w-[140px]"
                  title="Rune Deck is unofficial Fan Content allowed under the Fan Content Policy. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC."
                >
                  Rune Deck is unofficial Fan Content. Wizards compliant.
                </p>
              </div>
            </div>

            <button
              onClick={() => { setRoadmapInitialChangelog(false); setShowRoadmap(true); }}
              className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 hover:text-green-300 hover:border-green-500/40 hover:bg-green-500/20 transition-all group relative overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
              title="Arcane Manual"
            >
              <HelpCircle className="w-5 h-5 relative z-10 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -inset-1 bg-green-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          </div>
        </div>
      </aside>

          {/* Mobile Bottom Bar (Refined UX) */}
          <div className="md:hidden fixed bottom-1 left-4 right-4 h-16 bg-[#0a0c0c]/90 backdrop-blur-3xl border border-white/10 z-[120] flex items-center justify-around px-2 rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {[
              { id: 'manage_decks', icon: Library, label: 'Library', action: () => { setViewMode('manage_decks'); setIsMobileMenuOpen(false); setIsDeckboxOpen(false); setShowFunHub(false); } },
              { id: 'nodes', icon: Search, label: 'Search', action: () => { setIsMobileMenuOpen(true); setIsDeckboxOpen(false); setShowFunHub(false); } },
              { id: 'deckbox', icon: Layers, label: 'Deckbox', action: () => { setIsDeckboxOpen(true); setIsMobileMenuOpen(false); setShowFunHub(false); } },
              { id: 'funarea', icon: Sparkles, label: 'Fun Area', action: () => { setShowFunHub(!showFunHub); setIsMobileMenuOpen(false); setIsDeckboxOpen(false); } },
              { id: 'settings', icon: User, label: 'Profile', action: () => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); setIsDeckboxOpen(false); setShowFunHub(false); } },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={nav.action}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all relative ${
                  ((viewMode === nav.id && !isDeckboxOpen && !showFunHub) || 
                   (nav.id === 'nodes' && isMobileMenuOpen) ||
                   (nav.id === 'deckbox' && isDeckboxOpen) || 
                   (nav.id === 'funarea' && showFunHub) ||
                   (nav.id === 'settings' && isSettingsOpen)) ? 'text-orange-500' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {nav.id === 'settings' ? (
                  <div className={`w-6 h-6 rounded-full border overflow-hidden flex items-center justify-center transition-all ${isSettingsOpen ? 'border-orange-500' : 'border-white/10 opacity-60'}`}>
                    {photoURL || user?.photoURL ? (
                      <img src={photoURL || user?.photoURL || ""} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                ) : (
                  <nav.icon className={`w-5 h-5 ${((viewMode === nav.id && !isDeckboxOpen && !showFunHub) || (nav.id === 'nodes' && isMobileMenuOpen) || (nav.id === 'deckbox' && isDeckboxOpen) || (nav.id === 'funarea' && showFunHub) || (nav.id === 'settings' && isSettingsOpen)) ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : ''}`} />
                )}
                <span className={`text-[7px] font-magic font-extrabold uppercase tracking-widest ${((viewMode === nav.id && !isDeckboxOpen && !showFunHub) || (nav.id === 'nodes' && isMobileMenuOpen) || (nav.id === 'deckbox' && isDeckboxOpen) || (nav.id === 'funarea' && showFunHub) || (nav.id === 'settings' && isSettingsOpen)) ? 'opacity-100' : 'opacity-40'}`}>{nav.label}</span>
                {((viewMode === nav.id && !isDeckboxOpen && !showFunHub) || (nav.id === 'nodes' && isMobileMenuOpen) || (nav.id === 'deckbox' && isDeckboxOpen) || (nav.id === 'funarea' && showFunHub) || (nav.id === 'settings' && isSettingsOpen)) && (
                  <motion.div layoutId="nav-glow" className="absolute -inset-1 bg-orange-500/5 blur-lg rounded-xl -z-10" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showFunHub && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="md:hidden fixed inset-x-4 bottom-20 z-[150] bg-[#0a0c0c]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <div>
                      <h3 className="text-xl font-magic font-black text-white uppercase tracking-widest leading-none">Fun_Area</h3>
                      <p className="text-[8px] font-magic font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Select Active Module</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowFunHub(false)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Expansions', icon: Library, action: () => handleFunModeClick("sets"), color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
                    { label: 'Calendar', icon: Calendar, action: () => handleFunModeClick("calendar"), color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
                    { label: 'Sheriff', icon: Shield, action: () => handleFunModeClick("sheriff"), color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
                    { label: 'Judge_AI', icon: Gavel, action: () => handleFunModeClick("judge"), color: 'text-green-400 border-green-500/20 bg-green-500/5' },
                    { 
                      label: 'Bears', 
                      icon: PawPrint, 
                      action: () => {
                        setSearchQuery("Bear");
                        performSearch({
                          queryOverride: "art:bear f:paper",
                          skipCI: true,
                          orderOverride: "released",
                          dirOverride: "desc",
                          isBearActivation: true,
                        });
                        setIsMobileMenuOpen(false);
                        setShowFunHub(false);
                        setViewMode("cards");
                      }, 
                      color: 'text-orange-500 border-orange-500/20 bg-orange-500/5' 
                    }
                  ].map((mod) => (
                    <button
                      key={mod.label}
                      onClick={mod.action}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 ${mod.color}`}
                    >
                      <mod.icon className="w-6 h-6" />
                      <span className="text-[8px] font-magic font-black uppercase tracking-widest">{mod.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                />
                
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="w-full max-w-lg bg-zinc-950 border border-white/10 shadow-2xl rounded-[2rem] overflow-hidden relative flex flex-col max-h-[90vh] z-10"
                >
                  <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-magic font-black text-sm uppercase tracking-widest text-white">Profile Settings</h3>
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Manage your identity and interface</p>
                      </div>
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-white/20 transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* Identity Section */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                      <h4 className="text-[9px] font-magic font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                        <User className="w-3 h-3" /> Identity Matrix
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-left">
                          <label className="text-[8px] font-mono font-black text-white/20 uppercase tracking-widest ml-1">Username</label>
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onBlur={() => saveUserSettings({ userName })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[10px] font-magic font-black text-white focus:border-cyan-500/50 outline-none transition-all uppercase"
                          />
                        </div>
                        <div className="space-y-1 text-left">
                          <label className="text-[8px] font-mono font-black text-white/20 uppercase tracking-widest ml-1">Title</label>
                          <input
                            type="text"
                            value={userTitle}
                            onChange={(e) => setUserTitle(e.target.value)}
                            onBlur={() => saveUserSettings({ userTitle })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[10px] font-magic font-black text-white focus:border-orange-500/50 outline-none transition-all uppercase"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-mono font-black text-white/20 uppercase tracking-widest ml-1">Profile Photo URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                            onBlur={() => saveUserSettings({ photoURL })}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[9px] font-mono text-cyan-400 focus:border-cyan-500/50 outline-none transition-all"
                            placeholder="https://scryfall.com/..."
                          />
                          {photoURL && (
                            <button onClick={() => { setPhotoURL(""); saveUserSettings({ photoURL: "" }); }} className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-magic font-black uppercase rounded-lg">Reset</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-magic font-black text-white uppercase tracking-wider">Interface Density</span>
                            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest leading-none">Desktop Grid Scaling</span>
                          </div>
                          <span className="text-[10px] font-mono text-orange-500 font-bold bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/20 tracking-tighter">
                            {cardsPerRowDesktop === 0 ? "AUTO_CALC" : `${cardsPerRowDesktop}_UNITS`}
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="8" 
                          step="1"
                          value={cardsPerRowDesktop}
                          onChange={(e) => saveUserSettings({ cardsPerRowDesktop: parseInt(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[7px] font-mono text-white/20 uppercase font-black">Auto</span>
                          <span className="text-[7px] font-mono text-white/20 uppercase font-black">2</span>
                          <span className="text-[7px] font-mono text-white/20 uppercase font-black">4</span>
                          <span className="text-[7px] font-mono text-white/20 uppercase font-black">6</span>
                          <span className="text-[7px] font-mono text-white/20 uppercase font-black">8</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-magic font-black text-white uppercase tracking-wider">Mobile Columns</span>
                            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest leading-none">Layout Adaptation</span>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/20 tracking-tighter">{cardsPerRowMobile} COL</span>
                        </div>
                        <div className="px-2">
                          <input 
                            type="range" 
                            min="1" 
                            max="4" 
                            step="1"
                            value={cardsPerRowMobile}
                            onChange={(e) => saveUserSettings({ cardsPerRowMobile: parseInt(e.target.value) })}
                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                          />
                          <div className="flex justify-between mt-2 px-1">
                            <span className="text-[7px] font-mono text-white/20 uppercase font-black">1</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase font-black">2</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase font-black">3</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase font-black">4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <footer className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[7px] font-mono font-black text-white/20 uppercase tracking-widest">Leyline Active</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={logout} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[8px] font-magic font-black uppercase tracking-widest hover:bg-red-50 hover:text-black transition-all active:scale-95">
                        <LogOut className="w-3 h-3" /> Logout
                      </button>
                    </div>
                  </footer>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-14 md:pt-0 relative bg-transparent">
        <div className="flex-1 flex flex-col p-2 sm:p-4 lg:p-6 gap-6 overflow-hidden">
          {/* Backdrop for mobile menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
              />
            )}
          </AnimatePresence>

          {/* Top Floating Filters & Mobile Header Spacing */}
          {/* Filters moved to sidebar */}

          <div
            className="flex-1 overflow-y-auto no-scrollbar relative"
            ref={contentRef}
          >
            {/* Manual Back To Top */}
            <AnimatePresence>
              {showBackToTop && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={scrollToTop}
                  className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-[100] w-14 h-14 bg-orange-500 text-black flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.4)] border border-orange-400/50 hover:scale-110 active:scale-95 transition-all"
                >
                  <ChevronRight className="w-8 h-8 -rotate-90" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Search Summary Box (Rune-Bear-Tech Style) */}
            {hasSearched && searchSummary && isBearSearch && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mx-2 mb-8 max-w-[400px]"
              >
                <div className="rune-panel p-6 bg-black/80 border border-orange-500/20 backdrop-blur-3xl relative overflow-hidden group shadow-[0_0_50px_rgba(249,115,22,0.15)] rounded-2xl">
                  {/* Bear Watermark */}
                  <div className="absolute -right-8 -bottom-8 opacity-[0.05] pointer-events-none group-hover:opacity-[0.1] transition-opacity">
                    <BearIcon className="w-48 h-48 text-orange-500" />
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between border-b border-orange-500/10 pb-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-magic font-black text-orange-400 uppercase tracking-[0.4em]">
                          Ursine Resonance
                        </span>
                        <h3 className="text-2xl font-magic font-black text-white">
                          Rune-Bear-Tech
                        </h3>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
                          Nodes
                        </span>
                        <span className="text-3xl font-magic font-black text-white leading-none">
                          {searchSummary.total}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Color Identity */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-orange-500 rotate-45" />
                          <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest">
                            Aura Spectrum
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {searchSummary.colors.map(([color, count]) => (
                            <div
                              key={color}
                              className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/5 rounded-md"
                            >
                              {MANA_SYMBOL_URIS[`{${color.toUpperCase()}}`] ? (
                                <img
                                  src={
                                    MANA_SYMBOL_URIS[`{${color.toUpperCase()}}`]
                                  }
                                  alt={color}
                                  className="w-3.5 h-3.5"
                                />
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-white/60">
                                  {color}
                                </span>
                              )}
                              <span className="text-[10px] font-mono font-black text-white">
                                {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Morphology */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-cyan-500 rotate-45" />
                          <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest">
                            Cellular Matrix
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {searchSummary.types
                            .slice(0, 3)
                            .map(([type, count]) => (
                              <div
                                key={type}
                                className="flex items-center justify-between px-2.5 py-1 bg-white/5 border border-white/5 rounded-md group/type"
                              >
                                <span className="text-[8px] font-magic font-black text-cyan-400/80 uppercase tracking-tight">
                                  {type}
                                </span>
                                <span className="text-[9px] font-mono font-black text-white/60">
                                  {count}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-orange-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
                        <span className="text-[8px] font-magic font-black text-orange-400 uppercase tracking-widest">
                          Tactical Briefing
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-white/30 uppercase leading-relaxed italic">
                        The Ursine weave is dense. High concentration of{" "}
                        {searchSummary.types[0]?.[0]} energy identified. Proceed
                        with reverence.
                      </p>
                    </div>
                  </div>

                  {/* Decorative corner runes */}
                  <div className="absolute top-2 left-2 text-[10px] font-magic text-orange-500/10">
                    ᚱ
                  </div>
                  <div className="absolute top-2 right-2 text-[10px] font-magic text-orange-500/10">
                    ᚦ
                  </div>
                </div>
              </motion.div>
            )}
            <div className={`hidden md:flex fixed bottom-12 right-12 z-[100] pointer-events-auto transition-opacity duration-300 ${allCards.length === 0 && !loading && !hasSearched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <button
                onClick={() => setIsDeckboxOpen(true)}
                className="flex items-center gap-4 px-6 py-4 bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.8),0_0_20px_rgba(249,115,22,0.1)] backdrop-blur-xl text-white/40 hover:text-orange-400 rounded-3xl border border-white/10 hover:border-orange-500/40 transition-all group scale-110"
              >
                <div className="relative">
                  <Layers className="w-5 h-5 group-hover:rotate-12 transition-transform text-orange-500/60" />
                  {deckbox.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-magic font-black uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all">
                  Selected Cardboard
                </span>
                {deckbox.length > 0 && (
                  <span className="text-[10px] font-mono opacity-60 text-orange-200">
                    ({deckbox.length})
                  </span>
                )}
              </button>
            </div>
            {viewMode === "cards" && (
              <div
                className="grid transition-all duration-500 gap-3 sm:gap-6 p-2 pb-4"
                style={{
                  gridTemplateColumns: isMobile 
                    ? `repeat(${cardsPerRowMobile}, 1fr)`
                    : cardsPerRowDesktop === 0 
                      ? 'repeat(auto-fill, minmax(200px, 1fr))' 
                      : `repeat(${cardsPerRowDesktop}, 1fr)`
                }}
              >
                {allCards.length === 0 && !loading && (
                  <div className="col-span-full min-h-[85vh] relative flex flex-col items-center justify-center text-center">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none font-magic text-[20rem] text-white flex items-center justify-center">
                       ᛝ
                    </div>
                    {hasSearched ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 space-y-8"
                      >
                        <div className="relative mx-auto w-32 h-32">
                          <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full animate-pulse" />
                          <div className="relative z-10 w-full h-full flex items-center justify-center bg-[#070707] border border-white/5 rounded-[40px] shadow-2xl rotate-3">
                            <Search className="w-16 h-16 text-red-500/40" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h2 className="text-4xl font-magic font-black text-white uppercase tracking-tighter">
                            No Results
                          </h2>
                          <p className="text-sm text-white/30 max-w-sm mx-auto leading-relaxed uppercase tracking-widest font-mono">
                            Nothing matched your search criteria.
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setHasSearched(false);
                            performSearch({ queryOverride: "" });
                          }}
                          className="px-8 py-3 bg-red-500 text-black rounded-2xl text-[10px] font-magic font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:scale-105 transition-all active:scale-95"
                        >
                          Reset Loom
                        </button>
                      </motion.div>
                    ) : (
                      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center p-8 sm:p-16 md:p-32 bg-transparent">
                        <FloatingArcaneField />
                        
                        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-6xl px-6 py-12">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full flex items-center justify-center"
                          >
                            <div className="bg-black/40 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] px-6 py-10 md:px-16 md:py-16 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-white/20 relative group/home">
                              {/* Interactive Sparkle */}
                              <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-[100px] rounded-full group-hover/home:bg-cyan-500/20 transition-all duration-1000" />
                              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/15 blur-[100px] rounded-full group-hover/home:bg-orange-500/30 transition-all duration-1000" />

                              <div className="relative z-10 mb-4 md:mb-8">
                                <span className="text-orange-500 font-magic font-black text-[8px] md:text-[10px] tracking-[1em] uppercase block mb-3 opacity-70 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
                                  Multiverse Pulse
                                </span>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-magic font-black text-white uppercase tracking-tighter leading-tight italic skew-x-[-4deg] drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] px-4">
                                  THE RUNES <br /> AWAIT
                                </h1>
                              </div>

                              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent mx-auto mb-6 md:mb-10" />

                              <p className="text-[10px] md:text-[12px] lg:text-[14px] text-white/30 font-magic font-black uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto mb-10 md:mb-16 px-4">
                                Synthesize synergies across the blind eternities. <br />{" "}
                                Forge your strategy among the legends.
                              </p>

                              <div className="flex items-center justify-center gap-8 md:gap-16">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse" />
                                  <span className="text-[7px] md:text-[9px] font-mono text-white/10 tracking-widest uppercase font-bold">
                                    System Online
                                  </span>
                                </div>
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse delay-75" />
                                  <span className="text-[7px] md:text-[9px] font-mono text-white/10 tracking-widest uppercase font-bold">
                                    Mana Synced
                                  </span>
                                </div>
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse delay-150" />
                                  <span className="text-[7px] md:text-[9px] font-mono text-white/10 tracking-widest uppercase font-bold">
                                    Forge Ready
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {allCards.map((card, idx) => {
                  const images = getCardImages(card);
                  const isSelected = deckbox.some((c) => c.name === card.name);
                  const isExisting = existingInDeck.has(card.name);

                  if (isExisting) return null;

                  return (
                    <motion.div
                      layout
                      key={card.id || `${card.name}-${idx}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5 }}
                      className="relative group aspect-[0.71]"
                    >
                      <div
                        onClick={() => toggleCardSelection(card)}
                        onMouseEnter={() => {
                          const imgs = getCardImages(card);
                          setHoveredPreviewCard(
                            imgs.normal || imgs.border_crop || null,
                          );
                          setHoveredPreviewPrice(card.prices?.eur || null);
                        }}
                        onMouseLeave={() => {
                          setHoveredPreviewCard(null);
                          setHoveredPreviewPrice(null);
                        }}
                        className={`
                        h-full w-full rounded-[14px] overflow-hidden border-2 transition-all duration-300 cursor-pointer
                        ${isSelected ? "border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.5)]" : "border-white/10 group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"}
                      `}
                      >
                        <img
                          src={images.normal || images.border_crop}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-orange-500 text-black p-1 rounded-full shadow-lg">
                          <PlusCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
            {viewMode === "calendar" && (
              <div className="h-full w-full absolute inset-0 z-30 bg-[#050505]">
                <ReleaseCalendar
                  setViewMode={setViewMode}
                  performSearch={performSearch}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            )}

            {viewMode === "judge" && <JudgeView />}

            {viewMode === "manage_decks" && (
              <div className="space-y-6 p-4 lg:p-8 relative">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rune-panel rounded-xl relative z-0">
                  <div className="flex flex-col z-10">
                    <h2 className="text-xl font-magic font-extrabold text-orange-500 uppercase tracking-tight">
                      Saved Decks
                    </h2>
                    <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest">
                      MY COLLECTION
                    </p>
                  </div>
                  <div className="flex-1 max-w-sm z-10 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Archidekt, TappedOut or Moxfield ID/URL..."
                        className="bg-black/60 border border-[#2a2a2a] shadow-[inset_0_1px_5px_rgba(0,0,0,0.8)] rounded-sm px-4 py-2 text-[11px] flex-1 focus:border-cyan-500/50 outline-none placeholder:text-white/20 text-cyan-400 font-magic transition-colors"
                        value={newDeckIdInput}
                        onChange={(e) => setNewDeckIdInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          fetchAnyDeck(newDeckIdInput, false)
                        }
                      />
                      <button
                        onClick={() => fetchAnyDeck(newDeckIdInput, false)}
                        className="rune-panel px-4 py-2 text-cyan-500/80 font-black text-[10px] items-center gap-2 flex transition-all active:scale-95 font-magic uppercase hover:text-cyan-400 hover:border-cyan-500/30 z-10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Deck
                      </button>
                    </div>
                    <p className="text-[7px] font-mono text-white/20 italic text-right px-1">
                      Tip: ensure your deck is "Public" to import successfully.
                    </p>


                  </div>
                  <div className="ml-auto bg-orange-500 text-black px-4 py-1 rounded-sm text-xs font-black z-10 relative">
                    {savedDecks.length} Decks
                  </div>
                </div>
                <DeckManager />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                  {savedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="bg-[#080808] border border-white/5 rounded-3xl overflow-hidden flex flex-col group hover:border-cyan-500/20 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)] transition-all duration-500"
                    >
                      <div className="h-48 relative overflow-hidden">
                        <img
                          src={
                            deck.art_crops?.[0] ||
                            "https://cards.scryfall.io/art_crop/front/3/b/3b19e4a3-764c-474d-9ac3-818617d12f3e.jpg"
                          }
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000 ease-out"
                          alt={deck.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-black/40 to-black/10 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />

                        <div className="absolute inset-x-6 top-6 flex justify-between items-start">
                          <div className="flex flex-col gap-3">
                            <div className="relative group/manas w-fit">
                              <div className="flex items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl group-hover:border-white/20 transition-all min-h-[30px] w-fit">
                                {renderManaSymbols(deck.ci, "w-3.5 h-3.5")}
                              </div>
                            </div>
                            
                          </div>

                          {deck.totalCost ? (
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#00aeef]/20 shadow-xl group-hover:border-[#00aeef]/40 transition-all min-h-[30px]">
                                  <span className="text-[8px] text-[#00aeef]/70 font-magic font-extrabold uppercase mr-2 tracking-widest leading-none">
                                    Price
                                  </span>
                                  <span className="text-[12px] text-white/90 font-mono font-black">
                                    €{deck.totalCost.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                          ) : null}
                        </div>

                        <div className="absolute inset-x-6 bottom-4">
                          <h3 className="font-magic font-bold text-2xl text-white group-hover:text-cyan-400 transition-colors uppercase leading-none drop-shadow-lg">
                            {deck.name}
                          </h3>
                          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] font-mono mt-2">
                            Commander Deck
                          </p>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col gap-6">
                        {/* Tags Display */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[9px] font-magic font-black text-white/30 uppercase tracking-[0.2em]">
                              Active Runes
                            </span>
                            <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                            {(deck.tags || []).length === 0 && (pendingTags[deck.id] || []).length === 0 && (
                              <div className="w-full py-4 text-center border border-dashed border-white/5 rounded-xl">
                                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest italic">
                                  No runes assigned
                                </span>
                              </div>
                            )}

                            {(deck.tags || []).map((tag) => {
                              let label = tag;
                              let query = tag;
                              if (tag.includes(":::")) {
                                const parts = tag.split(":::");
                                label = parts[0];
                                query = parts.slice(1).join(":::");
                              }
                              return (
                                <span
                                  key={tag}
                                  className="flex items-stretch group/tag shadow-sm h-7"
                                >
                                  <button
                                    onClick={() => {
                                      setSearchQuery(query);
                                      const tagCI = deck.ci || "";
                                      setCurrentCI(tagCI);
                                      setViewMode("cards");
                                      performSearch({
                                        queryOverride: query,
                                        ciOverride: tagCI,
                                        skipCI: false,
                                        skipFormatFilters: false,
                                      });
                                    }}
                                    className="px-2.5 py-0 bg-cyan-500/5 border border-white/10 rounded-l-lg text-[9px] hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-500/30 transition-all font-bold text-cyan-400/70 flex items-center"
                                  >
                                    {label}
                                  </button>
                                  <button
                                    className="px-2 py-0 bg-white/5 border-y border-r border-white/10 rounded-r-lg text-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center"
                                    onClick={() => removeTag(deck.id, tag)}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                            {(pendingTags[deck.id] || []).map(
                              (tag: string, i: number) => (
                                <span
                                  key={`pending-${i}`}
                                  className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] text-white/40 animate-pulse border-dashed h-7"
                                >
                                  <RotateCw className="w-2 h-2 animate-spin text-cyan-500/50" />
                                  {tag}
                                </span>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Tag Tools Tabs */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                            {[
                              { id: 'scan', label: 'Scan Deck', icon: Wand2 },
                              { id: 'ai', label: 'Strategy', icon: Sparkles },
                              { id: 'manual', label: 'Manual', icon: Plus }
                            ].map(tool => (
                              <button
                                key={tool.id}
                                onClick={() => setActiveTagTool(prev => ({ ...prev, [deck.id]: tool.id as any }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[8px] font-magic font-bold uppercase tracking-wider transition-all ${
                                  (activeTagTool[deck.id] || 'scan') === tool.id 
                                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' 
                                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                }`}
                              >
                                <tool.icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{tool.label}</span>
                              </button>
                            ))}
                          </div>

                          <div className="min-h-[100px] flex flex-col justify-center">
                            {(activeTagTool[deck.id] || 'scan') === 'scan' && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-3 text-center"
                              >
                                <p className="text-[9px] text-white/30 font-mono leading-relaxed uppercase tracking-widest px-2">
                                  Uses AI to analyze the synergy of all cards in your deck to suggest optimal search runes.
                                </p>
                                <button
                                  onClick={() => autoAddCommanderTags(deck.id, deck.commanders)}
                                  disabled={loading}
                                  className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 font-magic font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-inner group"
                                >
                                  <Zap className="w-3.5 h-3.5 animate-pulse group-hover:scale-125 transition-transform" />
                                  {suggestedDecks.has(deck.id) ? "Relaunch Deep Scan" : "Analyze Deck Synergy"}
                                </button>
                              </motion.div>
                            )}

                            {(activeTagTool[deck.id] || 'scan') === 'ai' && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                              >
                                <textarea
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-cyan-500/40 transition-all placeholder:text-white/10 text-white/70 min-h-[80px] resize-none font-sans"
                                  placeholder="Describe your strategy: 'I want to sacrifice small creatures to drain opponents and generate zombies'..."
                                  value={deckDescriptions[deck.id] || ""}
                                  onChange={(e) =>
                                    setDeckDescriptions((prev) => ({
                                      ...prev,
                                      [deck.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  onClick={() => generateAiTagsFromDescription(deck.id, deckDescriptions[deck.id] || "")}
                                  disabled={isAiGeneratingTags[deck.id] || !deckDescriptions[deck.id]?.trim()}
                                  className="w-full py-2.5 bg-cyan-500 text-black rounded-xl text-[10px] font-magic font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-20 hover:scale-[1.02] active:scale-95 shadow-xl shadow-cyan-500/10"
                                >
                                  {isAiGeneratingTags[deck.id] ? (
                                    <>
                                      <RotateCw className="w-3 h-3 animate-spin" />
                                      Manifesting Runes...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3" />
                                      Sync AI Synergy Tool
                                    </>
                                  )}
                                </button>
                              </motion.div>
                            )}

                            {(activeTagTool[deck.id] || 'scan') === 'manual' && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 py-2"
                              >
                                <div className="relative group">
                                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Plus className="w-3 h-3 text-white/20 group-focus-within:text-orange-500" />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Add direct rune (e.g. 'Bear' or 'Infect')"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[10px] outline-none focus:border-orange-500/40 transition-all placeholder:text-white/10 text-white shadow-inner"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        addTag(deck.id, (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = "";
                                      }
                                    }}
                                  />
                                </div>
                                <p className="text-[8px] text-white/20 font-mono text-center uppercase tracking-widest">
                                  Press Enter to assign rune
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </div>


                        <div className="flex items-center pt-5 mt-auto border-t border-white/5 gap-3">
                          <button
                            onClick={() => viewDeckDetails(deck.id)}
                            className="flex-[1.5] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/80 font-magic font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                          >
                            <Eye className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
                            <span>Details</span>
                          </button>
                          <div className="flex flex-1 gap-2">
                            <button
                               onClick={() => setDeckToDelete(deck.id)}
                               className="p-3 bg-red-500/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-xl transition-all group flex-1 flex items-center justify-center"
                               title="Delete Deck"
                             >
                               <Trash2 className="w-4 h-4 text-white/10 group-hover:text-red-500/60 transition-colors" />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "sets" && (
              <div className="p-4 lg:p-8">
                <SetExplorer
                  setViewMode={setViewMode}
                  performSearch={performSearch}
                  setSearchQuery={setSearchQuery}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
              </div>
            )}

            {viewMode === "sheriff" && (
              <div className="p-4 lg:p-8">
                <OutlawSheriff />
              </div>
            )}


          </div>
        </div>
      </main>

      {/* Onboarding Tutorial Modal */}
      {/* DECK_VIEW_MODAL_COMPLETE_START */}

      <AnimatePresence>
        {isViewingDeck && viewingDeckCards && (
          <motion.div
            id="analysis-pane-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-6xl h-[90vh] bg-[#050808]/90 border border-cyan-500/20 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.15)] flex flex-col relative"
            >
              {/* Arch-Rune Background Signature Floor removed to avoid double background */}

              {/* Header Decoration */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20" />

              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#081011] relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <Database className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-magic font-black text-cyan-400 uppercase tracking-[0.1em] truncate max-w-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                      {viewingDeckName || "Deckinfo"}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                      <p className="text-[10px] text-white/40 uppercase font-mono tracking-[0.2em]">
                        {viewingDeckCards.length} Cards Analyzed
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsViewingDeck(false);
                    setViewingDeckCards(null);
                  }}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all group shadow-xl"
                >
                  <X className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="flex flex-1 bg-[#030603] relative overflow-hidden h-full">
                {/* Ambient Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

                {/* LEFT COLUMN: TACTICAL LIST */}
                <div className="w-full lg:w-[320px] xl:w-[380px] overflow-y-auto no-scrollbar p-4 relative z-10 border-r border-white/5 bg-black/40">
                  <div className="space-y-6">
                    {Object.entries(groupedDeckCards)
                      .filter(([_, cards]) => (cards as any[]).length > 0)
                      .map(([category, cards]) => (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center gap-2 group mb-2 mt-4 first:mt-0">
                            <div className="w-1 h-1 bg-cyan-500 rotate-45" />
                            <h3 className="text-[8px] font-magic font-black text-white/30 uppercase tracking-[0.3em]">
                              {category}
                            </h3>
                            <span className="text-[8px] font-mono text-cyan-400/40 ml-auto">
                              {(cards as any[]).length}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            {(cards as any[]).map((dc, i) => {
                              const c =
                                dc.card?.oracleCard ||
                                dc.card?.oracle_card ||
                                dc.card;
                              const scryfall =
                                dc.card?.scryfallData || dc.card?.scryfall_data;
                              const oracle =
                                dc.card?.oracleCard ||
                                dc.card?.oracle_card ||
                                dc.card;
                              const edition = dc.card?.edition;
                              const cardName =
                                c?.name || dc.card?.name || "Unknown Card";
                              const manaCost =
                                oracle?.mana_cost ||
                                scryfall?.mana_cost ||
                                edition?.mana_cost ||
                                "";

                              let img =
                                scryfall?.image_uris?.large ||
                                scryfall?.image_uris?.png ||
                                edition?.image_uris?.large ||
                                edition?.image_uris?.png ||
                                edition?.imageUrl ||
                                edition?.image_url ||
                                scryfall?.image_uris?.normal ||
                                oracle?.image_uris?.large ||
                                oracle?.image_uris?.normal;
                              const scryfallId =
                                dc.card?.scryfall_id ||
                                dc.card?.scryfallId ||
                                dc.card?.uids?.scryfall ||
                                scryfall?.id ||
                                dc.uids?.scryfall;
                              if (!img && scryfallId) {
                                img = `https://cards.scryfall.io/large/front/${scryfallId.slice(0, 1)}/${scryfallId.slice(1, 2)}/${scryfallId}.jpg`;
                              }

                              const isSelected =
                                selectedDeckCard === img ||
                                hoveredPreviewCard === img;

                              return (
                                <button
                                  key={`${category}-${i}`}
                                  onClick={() => {
                                    setSelectedDeckCard(img);
                                    setHoveredPreviewCard(img);
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredPreviewCard(img)
                                  }
                                  className={`group flex items-center justify-between py-1.5 px-3 rounded-lg transition-all border ${
                                    isSelected
                                      ? "bg-cyan-500/10 border-cyan-500/20"
                                      : "border-transparent hover:bg-white/[0.04]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] font-mono text-white/20 w-3">
                                      {dc.quantity || 1}
                                    </span>
                                    <span
                                      className={`text-[11px] font-magic font-bold uppercase tracking-wide truncate transition-colors ${
                                        isSelected
                                          ? "text-cyan-400"
                                          : "text-white/50 group-hover:text-white"
                                      }`}
                                    >
                                      {cardName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {renderManaSymbols(manaCost, "w-3 h-3")}
                                  </div>
                                </button>
                              );
                            })}
                            <div className="mt-8 pt-4 border-t border-cyan-500/10"></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* IMAGE DISPLAY COLUMN */}
                <div className="hidden lg:flex flex-1 bg-[#020404] items-center justify-center p-8 relative z-20 overflow-hidden border-r border-white/5">
                  {/* Specific background removed to avoid double background */}

                  {/* Scrying Rings (Removed as requested) */}

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
                  <AnimatePresence mode="wait">
                    {hoveredPreviewCard ? (
                      <motion.div
                        key={hoveredPreviewCard}
                        initial={{ opacity: 0, scale: 0.8, rotateY: 45 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotateY: -45 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 100,
                        }}
                        className="relative z-20 flex items-center justify-center pointer-events-none perspective-1000"
                      >
                        <div className="absolute inset-0 bg-cyan-400/20 blur-[80px] rounded-full animate-pulse" />
                        {/* Rune-Tech Tech Accents (Removed as requested) */}

                        <div className="relative group">
                          <img
                            src={hoveredPreviewCard}
                            alt="Optic Focus"
                            className="w-[32vh] xl:w-[38vh] max-w-full h-auto object-contain rounded-[1.8rem] shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(6,182,212,0.5)] border-2 border-cyan-500/50 relative z-10 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />

                          {/* Corner Tech Brackets */}
                          <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-400 rounded-tl-2xl z-20 opacity-60" />
                          <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl z-20 opacity-60" />
                          <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-2 border-l-2 border-cyan-400 rounded-bl-2xl z-20 opacity-60" />
                          <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-400 rounded-br-2xl z-20 opacity-60" />
                        </div>

                        {/* Rune Accents */}
                        <div className="absolute -top-16 -left-16 text-cyan-400/60 font-magic text-6xl animate-pulse">
                          ᛉ
                        </div>
                        <div className="absolute -bottom-16 -right-16 text-cyan-400/60 font-magic text-6xl animate-pulse">
                          ᚦ
                        </div>
                        <div className="absolute top-1/2 -left-24 -translate-y-1/2 text-cyan-500/20 font-magic text-4xl rotate-90">
                          ᚱᚢᚾᛖ
                        </div>
                        <div className="absolute top-1/2 -right-24 -translate-y-1/2 text-cyan-500/20 font-magic text-4xl -rotate-90">
                          ᛏᛖᚳᚺ
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-10 text-cyan-400/20"
                      >
                        <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-500/40 rounded-full animate-spin" />
                        <p className="text-xs uppercase tracking-[1em] font-magic animate-pulse">
                          Awaiting Signal
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT COLUMN: DECKINFO MODULE */}
                <div className="hidden lg:flex flex-col lg:w-[320px] xl:w-[380px] bg-[#050505] border-l border-white/5 relative z-30 shadow-[-40px_0_100px_rgba(0,0,0,0.9)] overflow-y-auto no-scrollbar">
                  {/* Arcane Background Signature */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                    <Zap className="w-[80%] h-auto text-cyan-500 rotate-12" />
                  </div>

                  <div className="flex flex-col min-h-max relative z-10 font-sans h-full">
                    {/* MODULE HEADER */}
                    <div className="px-6 py-6 border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-20">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-magic font-black text-cyan-400 uppercase tracking-[0.4em]">
                            Deckinfo
                          </h3>
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-cyan-500/40 rounded-full animate-pulse" />
                            <div className="w-1 h-1 bg-cyan-500/20 rounded-full" />
                          </div>
                        </div>
                        <p className="text-[11px] font-mono text-white/20 uppercase tracking-widest truncate">
                          {viewingDeckName || "No Deck Selected"}
                        </p>


                      </div>
                    </div>
                    {/* LOWER DATA: TELEMETRY & SYNERGY */}
                    <div className="flex-1 bg-black/60 border-t border-white/5 backdrop-blur-xl p-8 overflow-y-auto no-scrollbar font-sans">
                      <div className="space-y-10">
                        {/* MANA CURVE SECTION */}
                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-1.5 bg-orange-500 rotate-45 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
                            <h4 className="text-[10px] font-magic font-black text-white/50 uppercase tracking-[0.3em]">
                              Manabase Curve
                            </h4>
                          </div>
                          <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={(() => {
                                  const counts: Record<string, number> = {};
                                  for (let i = 0; i <= 7; i++)
                                    counts[i === 7 ? "7+" : i.toString()] = 0;
                                  viewingDeckCards.forEach((dc) => {
                                    const card =
                                      dc.card?.oracleCard ||
                                      dc.card?.oracle_card ||
                                      dc.card;
                                    const scryfall =
                                      dc.card?.scryfallData ||
                                      dc.card?.scryfall_data;
                                    const tl = (
                                      card?.type_line ||
                                      scryfall?.type_line ||
                                      ""
                                    ).toLowerCase();
                                    if (tl.includes("land")) return;
                                    let cmc = Math.floor(
                                      card?.cmc || scryfall?.cmc || 0,
                                    );
                                    const qty = dc.quantity || 1;
                                    if (cmc >= 7) counts["7+"] += qty;
                                    else counts[cmc.toString()] += qty;
                                  });
                                  return Object.entries(counts).map(
                                    ([name, value]) => ({ name, value }),
                                  );
                                })()}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(255,255,255,0.03)"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="name"
                                  stroke="rgba(255,255,255,0.2)"
                                  fontSize={9}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#050505",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    fontSize: "9px",
                                  }}
                                  itemStyle={{ color: "#06b6d4" }}
                                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                                />
                                <Bar
                                  dataKey="value"
                                  fill="#06b6d4"
                                  radius={[2, 2, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>

                        {/* COLOR IDENTITY SECTION */}
                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rotate-45 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                            <h4 className="text-[10px] font-magic font-black text-white/50 uppercase tracking-[0.3em]">
                              Mana Alignment
                            </h4>
                          </div>
                          <div className="flex items-center gap-10">
                            <div className="w-28 h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={(() => {
                                      const counts: Record<string, number> = {
                                        W: 0,
                                        U: 0,
                                        B: 0,
                                        R: 0,
                                        G: 0,
                                      };
                                      viewingDeckCards.forEach((dc) => {
                                        const oracle =
                                          dc.card?.oracleCard ||
                                          dc.card?.oracle_card ||
                                          dc.card;
                                        const scryfall =
                                          dc.card?.scryfallData ||
                                          dc.card?.scryfall_data;
                                        const manaCost =
                                          oracle?.mana_cost ||
                                          scryfall?.mana_cost ||
                                          "";

                                        // Extract colored symbols from mana cost
                                        const matches =
                                          manaCost.match(/\{[WUBRG]\}/g);
                                        if (matches) {
                                          matches.forEach((m) => {
                                            const color = m.substring(1, 2);
                                            if (counts[color] !== undefined)
                                              counts[color]++;
                                          });
                                        }
                                      });
                                      return Object.entries(counts)
                                        .filter(([_, v]) => v > 0)
                                        .map(([name, value]) => ({
                                          name,
                                          value,
                                        }));
                                    })()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={24}
                                    outerRadius={36}
                                    paddingAngle={4}
                                    dataKey="value"
                                  >
                                    {(() => {
                                      const COLORS = {
                                        W: "#f0e6d2",
                                        U: "#00aeef",
                                        B: "#333333",
                                        R: "#ef5350",
                                        G: "#4caf50",
                                      };
                                      const counts: Record<string, number> = {
                                        W: 0,
                                        U: 0,
                                        B: 0,
                                        R: 0,
                                        G: 0,
                                      };
                                      viewingDeckCards.forEach((dc) => {
                                        const oracle =
                                          dc.card?.oracleCard ||
                                          dc.card?.oracle_card ||
                                          dc.card;
                                        const scryfall =
                                          dc.card?.scryfallData ||
                                          dc.card?.scryfall_data;
                                        const manaCost =
                                          oracle?.mana_cost ||
                                          scryfall?.mana_cost ||
                                          "";
                                        const matches =
                                          manaCost.match(/\{[WUBRG]\}/g);
                                        if (matches) {
                                          matches.forEach((m) => {
                                            const color = m.substring(1, 2);
                                            if (counts[color] !== undefined)
                                              counts[color]++;
                                          });
                                        }
                                      });
                                      const data = Object.entries(counts)
                                        .filter(([_, v]) => v > 0)
                                        .map(([name, value]) => ({
                                          name,
                                          value,
                                        }));
                                      return data.map((entry) => (
                                        <Cell
                                          key={entry.name}
                                          fill={
                                            COLORS[
                                              entry.name as keyof typeof COLORS
                                            ]
                                          }
                                        />
                                      ));
                                    })()}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4">
                              {(() => {
                                let totalCmc = 0;
                                let nonLandCount = 0;
                                let landCount = 0;
                                let artifactCount = 0;
                                let creatureCount = 0;
                                let spellCount = 0;
                                let enchantmentCount = 0;

                                viewingDeckCards.forEach((c) => {
                                  const oracle =
                                    c.card?.oracleCard ||
                                    c.card?.oracle_card ||
                                    c.card;
                                  const scryfall =
                                    c.card?.scryfallData ||
                                    c.card?.scryfall_data;
                                  const edition = c.card?.edition;
                                  const typeLine = (
                                    oracle?.type_line ||
                                    scryfall?.type_line ||
                                    edition?.type_line ||
                                    c.card?.type_line ||
                                    ""
                                  ).toLowerCase();
                                  const qty = c.quantity || 1;

                                  if (typeLine.includes("land")) {
                                    landCount += qty;
                                  } else {
                                    const cmc =
                                      oracle?.cmc ||
                                      scryfall?.cmc ||
                                      edition?.cmc ||
                                      c.card?.cmc ||
                                      0;
                                    totalCmc += cmc * qty;
                                    nonLandCount += qty;
                                  }

                                  if (typeLine.includes("artifact"))
                                    artifactCount += qty;
                                  if (typeLine.includes("creature"))
                                    creatureCount += qty;
                                  if (typeLine.includes("enchantment"))
                                    enchantmentCount += qty;
                                  if (
                                    typeLine.includes("instant") ||
                                    typeLine.includes("sorcery")
                                  )
                                    spellCount += qty;
                                });

                                const avgCmc =
                                  nonLandCount > 0
                                    ? (totalCmc / nonLandCount).toFixed(2)
                                    : "0.00";

                                return [
                                  { label: "Avg CMC", val: avgCmc, icon: Zap },
                                  {
                                    label: "Spells",
                                    val: spellCount,
                                    icon: BookOpen,
                                  },
                                  {
                                    label: "Enchant",
                                    val: enchantmentCount,
                                    icon: Sparkles,
                                  },
                                  {
                                    label: "Creatures",
                                    val: creatureCount,
                                    icon: User,
                                  },
                                  {
                                    label: "Artifacts",
                                    val: artifactCount,
                                    icon: Hexagon,
                                  },
                                  {
                                    label: "Lands",
                                    val: landCount,
                                    icon: MapIcon,
                                  },
                                ].map((stat) => (
                                  <div
                                    key={stat.label}
                                    className="bg-white/[0.02] border border-white/5 p-2 rounded-sm group hover:border-cyan-500/20 transition-colors"
                                  >
                                    <p className="text-[7px] font-magic font-bold text-white/20 uppercase tracking-widest">
                                      {stat.label}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-mono font-bold text-cyan-400/80 group-hover:text-cyan-400">
                                        {stat.val}
                                      </span>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </section>

                        {/* QUICK ACTIONS FOOTER */}
                        <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                          <button
                            onClick={findAlternativeCommanders}
                            className="w-full py-5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 hover:border-cyan-400 rounded-[2rem] text-[10px] font-magic font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_40px_rgba(6,182,212,0.1)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] flex items-center justify-center gap-4 group/alt-btn relative overflow-hidden"
                          >
                            <Users className="w-4 h-4 group-hover/alt-btn:scale-110 transition-transform" />
                            Search Alternative Commanders
                          </button>
                          <div className="flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity px-2">
                            <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-white/30">
                              Sync Status: Optimised
                            </span>
                            <div className="flex gap-1">
                              <div className="w-1 h-1 bg-cyan-500 animate-pulse" />
                              <div className="w-1 h-1 bg-cyan-500/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredPreviewCard && isViewingDeck && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="lg:hidden fixed bottom-[8vh] left-1/2 -translate-x-1/2 z-[1200] w-[85vw] max-w-[320px] rounded-xl overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.6)] border-2 border-cyan-500/50 pointer-events-none"
          >
            <div className="relative w-full">
              <img
                src={hoveredPreviewCard}
                className="w-full h-auto rounded-xl"
                alt="Preview"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alternative Commanders Overlay */}
      <AnimatePresence>
        {isAltCommandersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAltCommandersOpen(false)}
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-5xl bg-[#081011]/95 border border-cyan-500/20 rounded-[3rem] p-4 md:p-10 shadow-2xl flex flex-col gap-8 relative overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Specific background removed to avoid double background */}

              <div className="flex items-center justify-between relative z-10 px-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-magic font-black text-cyan-400 uppercase tracking-widest leading-none">
                      Command Candidates
                    </h2>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mt-2">
                      Analyzed based on color alignment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAltCommandersOpen(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/20 hover:text-white transition-all active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[75vh] relative z-10 no-scrollbar p-2 md:p-4">
                {alternativeCommanders.length === 0 ? (
                  <div className="py-40 text-center">
                    <div className="text-[12px] font-magic font-black text-white/10 uppercase tracking-[0.6em] mb-4">
                      NO LEGENDARY ENTITIES DETECTED
                    </div>
                    <div className="w-24 h-[1px] bg-white/5 mx-auto" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8 relative z-10">
                    {alternativeCommanders.map((c, i) => {
                      const name = c?.name || "Unknown Entity";
                      const imgs =
                        c?.image_uris || c?.card_faces?.[0]?.image_uris || {};
                      const img =
                        imgs.normal || imgs.large || c?.image_uris?.png;

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: i * 0.03,
                            duration: 0.5,
                            ease: "easeOut",
                          }}
                          key={i}
                          className="relative group cursor-pointer"
                          onClick={() => {
                            const imgs =
                              c?.image_uris ||
                              c?.card_faces?.[0]?.image_uris ||
                              {};
                            const imgUrl =
                              imgs.normal || imgs.large || c?.image_uris?.png;
                            setZoomedAltCard(imgUrl);
                            showMessage(
                              `PREVIEWING: ${name.toUpperCase()}`,
                              "info",
                            );
                          }}
                        >
                          <div className="aspect-[0.71] rounded-xl md:rounded-2xl overflow-hidden border border-white/10 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all duration-700 transform group-hover:-translate-y-4 relative bg-black/40">
                            <img
                              src={img}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              alt={name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-6">
                              <span className="text-[10px] font-magic font-black text-cyan-400 uppercase tracking-[0.4em] text-center drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                                {name}
                              </span>
                              <div className="w-8 h-1 bg-cyan-500 rounded-full mt-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ZOOM OVERLAY FOR ALTERNATIVES */}
              <AnimatePresence>
                {zoomedAltCard && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedAltCard(null);
                    }}
                    className="fixed inset-0 z-[1300] bg-black/95 flex items-center justify-center p-8 backdrop-blur-3xl cursor-zoom-out"
                  >
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 100,
                      }}
                      className="relative max-w-full max-h-full"
                    >
                      <img
                        src={zoomedAltCard}
                        className="rounded-[4%] shadow-[0_0_120px_rgba(6,182,212,0.6)] max-w-full max-h-[85vh] object-contain border-4 border-white/5"
                        alt="Zoomed Card"
                      />
                      <div className="absolute -bottom-16 left-0 right-0 text-center">
                        <span className="text-[12px] font-magic font-black text-white/40 uppercase tracking-[0.6em] animate-pulse">
                          Touch to return to candidates
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest leading-none">
                  Scanning for potential leadership candidates
                </p>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                  <div className="w-1 h-1 bg-cyan-500/40 rounded-full animate-delay-100 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deckToDelete && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeckToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#0d0d0d]/95 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Specific background removed to avoid double background */}

              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-magic font-extrabold text-white uppercase tracking-tight mb-2">
                  Purge Deck?
                </h3>
                <p className="text-sm text-white/40 leading-relaxed mb-8">
                  {userName || user?.displayName || "User"}, are you sure you
                  want to remove this deck from your library? This action is
                  irreversible.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setDeckToDelete(null)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteSavedDeck(deckToDelete)}
                    className="flex-1 py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-all"
                  >
                    Confirm Purge
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Tutorial Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-[#0A0A0A] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] relative"
            >
              <div className="h-32 bg-gradient-to-br from-cyan-500/20 to-transparent p-8 flex items-end">
                <div>
                  <h3 className="text-2xl font-magic font-black text-white hover:text-cyan-400 transition-colors uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    Welcome to Rune Deck Companion
                  </h3>
                  <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em] font-bold mt-1">
                    USER INTERFACE
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400 font-magic">
                      01
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-widest mb-1">
                        Connect Archives
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Import your decks from Archidekt, TappedOut, or Moxfield.
                        Access your entire multiverse collection instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400 font-magic">
                      02
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-widest mb-1">
                        Synthesize Strategies
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Use AI-powered analysis to find perfect synergies. 
                        Your deck tags guide the rune-engine to relevant upgrades.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400 font-magic">
                      03
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-widest mb-1">
                        Social Discovery
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Visit other users, clone their experimental decks, and 
                        suggest tactical adjustments to their configuration.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeTutorial}
                  className="w-full py-4 bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(6,182,212,0.25)] text-black font-black font-magic uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
                >
                  Understood, let's build!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Cardboard Side Panel */}
      <AnimatePresence>
        {isDeckboxOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeckboxOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#0c0c0c] border-l-2 border-[#1a1a1a] shadow-[-50px_0_100px_rgba(0,0,0,0.8)] z-[110] p-6 flex flex-col gap-6"
            >
              <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border border-cyan-500/20 bg-white/5 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-400 opacity-30 italic font-magic text-[8px]">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-magic font-black text-orange-500 uppercase tracking-tight leading-none mb-1">
                      Selection
                    </h2>
                    <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest leading-none">
                      {deckbox.reduce((acc, curr) => acc + curr.qty, 0)} CARDS
                    </p>
                  </div>
                </div>
                {deckbox.length > 0 && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                    €{" "}
                    {deckbox
                      .reduce(
                        (acc, curr) =>
                          acc +
                          parseFloat(curr.prices?.eur || "0") * curr.qty,
                        0,
                      )
                      .toFixed(2)}
                  </span>
                )}
                <button
                  onClick={() => setIsDeckboxOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-cyan-500/30 hover:text-cyan-400 group"
                >
                  <X className="w-5 h-5 text-white/50 group-hover:text-cyan-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2 relative z-10">
                {deckbox.map((item) => (
                  <div
                    key={item.name}
                    className="flex gap-3 rune-panel bg-black/40 p-3 rounded-sm hover:border-cyan-500/30 transition-all z-10 group relative"
                    onMouseEnter={() =>
                      setHoveredPreviewCard(item.highRes || item.thumb)
                    }
                    onMouseLeave={() => setHoveredPreviewCard(null)}
                  >
                    <div className="w-14 h-18 rounded overflow-hidden border border-white/10 shrink-0 group-hover:border-cyan-500/50 transition-colors">
                      <img
                        src={item.thumb}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-black uppercase text-white/80 group-hover:text-cyan-400 transition-colors truncate">
                          {item.name}
                        </h4>
                        <p className="text-[8px] font-mono text-orange-500/60 uppercase tracking-widest leading-none">
                          {item.from_deck}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCardQty(item.name, -1);
                            }}
                            className="w-6 h-6 rounded bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-mono font-black text-white w-4 text-center">
                            {item.qty}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCardQty(item.name, 1);
                            }}
                            className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-black hover:bg-orange-600 transition-all font-black"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCardQty(item.name, -999);
                          }}
                          className="text-red-500 opacity-20 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Floating Preview for Deckbox Hover */}
                <AnimatePresence>
                  {hoveredPreviewCard && isDeckboxOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: 20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      className="fixed right-[420px] top-1/2 -translate-y-1/2 w-[280px] z-[200] pointer-events-none hidden lg:block"
                    >
                      <div className="rune-panel p-2 bg-black/95 shadow-[0_0_80px_rgba(0,0,0,1)] border-cyan-500/40 transform -rotate-1">
                        <img
                          src={hoveredPreviewCard}
                          className="w-full h-auto rounded-lg shadow-2xl"
                          alt="Preview"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none" />
                        <div className="mt-2 text-center">
                          <span className="text-[8px] font-magic font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">
                            Tactical Preview Active
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {deckbox.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/10 gap-3">
                  <Package className="w-12 h-12" />
                  <p className="text-xs font-bold">Your selection is empty</p>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-white/10">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={copyDecklist}
                    disabled={deckbox.length === 0}
                    className={`py-4 rounded-xl text-black font-black text-[10px] shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none font-magic uppercase tracking-widest ${copied ? "bg-green-500" : "bg-gradient-to-br from-orange-400 to-orange-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(249,115,22,0.25)] hover:brightness-110"}`}
                  >
                    {copied ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "COPIED!" : "COPY"}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (!user) return;
                    const batch = writeBatch(db);
                    deckbox.forEach((item) => {
                      const cardId = item.name.replace(/[^a-zA-Z0-9]/g, "_");
                      const cardRef = doc(
                        db,
                        "users",
                        user.uid,
                        "deckbox",
                        cardId,
                      );
                      batch.delete(cardRef);
                    });
                    await batch
                      .commit()
                      .catch((err) =>
                        handleFirestoreError(
                          err,
                          OperationType.DELETE,
                          `users/${user.uid}/deckbox`,
                        ),
                      );
                  }}
                  disabled={deckbox.length === 0}
                  className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-magic font-black text-red-500/60 hover:text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-20 tracking-wider uppercase"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Selection
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-xl border ${
              message.type === "error"
                ? "bg-red-500/20 border-red-500/30 text-red-100"
                : message.type === "success"
                  ? "bg-green-500/20 border-green-500/30 text-green-100"
                  : "bg-orange-500/20 border-orange-500/30 text-orange-100"
            }`}
          >
            {message.type === "error" ? (
              <Zap className="w-5 h-5 text-red-500" />
            ) : message.type === "success" ? (
              <RotateCw className="w-5 h-5 text-green-500" />
            ) : (
              <Wand2 className="w-5 h-5 text-orange-500" />
            )}
            <p className="font-magic font-bold text-[10px] uppercase tracking-widest">
              {message.text}
            </p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-8">
            <ManaSpinner className="w-24 h-24" />
            <div className="flex flex-col items-center">
              <p className="text-orange-500 font-magic font-extrabold uppercase tracking-[0.3em] text-sm animate-pulse">
                Synchronizing...
              </p>
              <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">
                {loadingMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Display Name Overlay */}
      <IdentityPortal 
        show={isForceNaming}
        user={user}
        userName={userName}
        setUserName={setUserName}
        photoURL={photoURL}
        setPhotoURL={setPhotoURL}
        loading={loading}
        onConfirm={async () => {
          if (userName.trim().length < 3) {
            showMessage("Name must be at least 3 characters", "error");
            return;
          }
          try {
            startArcaneLoading("Activating Rune Name...");
            await saveUserSettings({ 
              userName: userName.trim(),
              photoURL: photoURL || user?.photoURL || "" 
            });
            setIsForceNaming(false);
            showMessage(`Welcome, ${userName.trim().toUpperCase()}!`, "success");
          } catch (e) {
            showMessage("RUNE ACTIVATION FAILED", "error");
          } finally {
            setLoading(false);
          }
        }}
      />
      
      {/* Roadmap Modal */}
      <AnimatePresence>
        {showRoadmap && (
          <RoadmapModal
            isOpen={showRoadmap}
            onClose={() => setShowRoadmap(false)}
            initialShowChangelog={roadmapInitialChangelog}
            onNavigate={(action) => {
              setShowRoadmap(false);
              if (action === "changelog") {
                setRoadmapInitialChangelog(true);
                setShowRoadmap(true);
              } else if (action === "manage_decks") {
                setViewMode("manage_decks");
              } else if (action === "cards") {
                setViewMode("cards");
              } else if (action === "stats") {
                setViewMode("stats");
              } else if (action === "sets") {
                setViewMode("sets");

                setViewMode("judge");
              } else if (action === "calendar") {
                setViewMode("calendar");
              } else if (action === "sets") {
                setViewMode("sets");
              } else if (action === "sheriff") {
                setViewMode("sheriff");
              } else if (action === "stats") {
                setViewMode("stats");
              } else if (action === "manage_decks") {
                setViewMode("manage_decks");
              } else if (action === "cards") {
                setViewMode("cards");
              }
            }}
          />
        )}
      </AnimatePresence>



      <AnimatePresence>
        {tagToVerify && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-emerald-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Brain className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-magic font-bold text-emerald-400 uppercase tracking-wider">
                    Tag Verification
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-[0.2em]">
                    Semantic Analysis Active
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-gray-400 text-[13px] leading-relaxed">
                  Your tag{" "}
                  <span className="text-emerald-400 font-bold">
                    "{tagToVerify.tag}"
                  </span>
                  {tagToVerify.isAmbiguous
                    ? " seems ambiguous. It might be a name, a mechanic, or oracle text. Please clarify."
                    : " yielded no precise matches in this Commander's color identity. Did you mean one of these?"}
                </p>

                <div className="space-y-2">
                  {tagToVerify.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        finalizeTag(
                          tagToVerify.deckId,
                          tagToVerify.tag,
                          suggestion,
                        )
                      }
                      className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group flex items-center justify-between"
                    >
                      <span className="text-white group-hover:text-emerald-400 transition-colors font-mono text-xs">
                        {suggestion}
                      </span>
                      <span className="text-[10px] font-magic font-bold text-white/20 group-hover:text-emerald-500/40 uppercase tracking-widest">
                        Apply
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() =>
                      finalizeTag(
                        tagToVerify.deckId,
                        tagToVerify.tag,
                        tagToVerify.originalQuery,
                      )
                    }
                    className="flex-1 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-magic font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest"
                  >
                    Keep Original ({tagToVerify.originalQuery})
                  </button>
                  <button
                    onClick={() => setTagToVerify(null)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-magic font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commander Full Preview Modal */}
      <AnimatePresence>
        {commanderPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
          >
            <div
              className="absolute inset-0"
              onClick={() => setCommanderPreview(null)}
            />
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              className="flex flex-col sm:flex-row gap-8 items-center justify-center relative z-10"
            >
              {commanderPreview.map((cmd, i) => {
                const sc = cmd.scryfallData || cmd;
                const imgSrc =
                  sc.image_uris?.large ||
                  sc.card_faces?.[0]?.image_uris?.large ||
                  sc.image_uris?.normal ||
                  sc.card_faces?.[0]?.image_uris?.normal ||
                  sc.image_uris?.png ||
                  cmd.art_crop;

                return (
                  <div key={i} className="relative group">
                    <div className="absolute -inset-4 bg-orange-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img
                      src={imgSrc}
                      alt={cmd.name}
                      className="w-[300px] sm:w-[400px] h-auto rounded-[1.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(249,115,22,0.3)] border-2 border-white/10 group-hover:border-orange-500/50 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-6 text-center">
                      <h3 className="text-xl font-magic font-black text-white uppercase tracking-widest">
                        {cmd.name}
                      </h3>
                      <p className="text-xs text-orange-500 font-magic font-bold uppercase tracking-[0.2em] mt-1">
                        Prime Commander
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
            <button
              onClick={() => setCommanderPreview(null)}
              className="fixed top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-20"
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commander Selection Modal */}
      <AnimatePresence>
        {commanderSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setCommanderSelection(null)}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="rune-panel p-8 rounded-2xl w-full max-w-4xl relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-magic font-black text-orange-500 uppercase tracking-widest">
                  Select Commander
                </h2>
                <p className="text-xs text-white/40 font-mono uppercase tracking-[0.2em]">
                  We couldn't clearly identify your commander. Please select one
                  below.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {commanderSelection.candidates.map((card, i) => {
                  const images = getCardImages(card);
                  return (
                    <button
                      key={card.id || i}
                      onClick={() => onSelectCommander([card.name])}
                      className="group relative aspect-[63/88] rounded-lg overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all shadow-xl hover:shadow-orange-500/20"
                    >
                      <img
                        src={images.normal}
                        alt={card.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-[10px] font-magic font-bold text-white uppercase tracking-wider">
                          {card.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setCommanderSelection(null)}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-magic font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Cancel Import
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ROADMAP COMPONENT ---
function RoadmapModal({
  isOpen,
  onClose,
  initialShowChangelog = false,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialShowChangelog?: boolean;
  onNavigate: (action: string) => void;
}) {
  const [showChangelog, setShowChangelog] = useState(initialShowChangelog);

  // Sync state when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setShowChangelog(initialShowChangelog);
    }
  }, [isOpen, initialShowChangelog]);

  const releaseHistory = [
    {
      version: "V2.7.0",
      date: "May 19, 2026",
      changes: [
        "Moxfield Import Fix: Implementation of Mobile-Alamofire spoofing for 100% reliability",
        "Manual Overhaul: Added Deck Building and Data Analysis modules",
        "Privacy Focus: Removed all social components and public registry links",
        "Performance: Optimized deck list loading and metadata caching"
      ]
    },
    {
      version: "V2.6.19",
      date: "May 2026",
      changes: [
        "MANDATORY IDENTITY: Interface refined for local-first library management",
        "ADAPTIVE ENERGY: Mana symbol indicators now dynamically scale to their contents",
        "DOMAIN CONTROL: Granular library-level storage protocols fully operational",
        "MANUAL SYNC: Automated Leyline Manual protocols synchronized"
      ]
    },
    {
      version: "V2.6.16",
      date: "May 2026",
      changes: [
        "Alchemy & Digital cards filtered out of all timeline sets",
        "Unified Rune-Tech aesthetic across all modules",
        "Functional mobile filter system",
        "Mobile-optimized card gallery scaling (1-2 columns)",
        "Added Release History to Arcane Manual",
        "Dark startup optimization for zero-latency black theme",
        "Consistent English localization"
      ]
    }
  ];

  const manualSections = [
    {
      group: "COLLECTION & SEARCH",
      nodes: [
        {
          term: "DECKS (Library)",
          flow: "Management",
          desc: "Manage your decks and collections. Create new lists, set privacy, or use the Import feature to bring in decks from TappedOut, Archidekt, or Moxfield.",
          action: "manage_decks",
        },
        {
          term: "SEARCH",
          flow: "Scryfall",
          desc: "Browse the entire Scryfall database. Search by name, type, or color. Use the 'Add' button to send cards directly to your Deckbox for building.",
          action: "cards",
        },
        {
          term: "DECKBOX",
          flow: "Workspace",
          desc: "Your primary scratchpad for building. Collect cards here to add to your decks or review them before final inclusion.",
          action: "cards",
        },
      ],
    },
    {
      group: "DECK BUILDING",
      nodes: [
        {
          term: "BUILD",
          flow: "Rune Tech",
          desc: "Construct your masterpiece. Move cards from your Deckbox to your active deck. Adjust quantities and balance your strategy directly in the builder.",
          action: "manage_decks",
        },
        {
          term: "ANALYSIS",
          flow: "Data Vibe",
          desc: "Visualize your deck's statistics. Use the Analysis module to check your mana curve, color distribution, and type balance for optimal performance.",
          action: "manage_decks",
        },
        {
          term: "SYNERGY",
          flow: "Deep Scan",
          desc: "Analyze your decks with AI. Generate intelligent tags for strategy and themes, find hidden combos, and receive personalized card recommendations.",
          action: "manage_decks",
        },
      ],
    },
    {
      group: "ADVANCED TOOLS & AI",
      nodes: [
        {
          term: "JUDGE RUXA",
          flow: "AI Judge",
          desc: "Ask the AI assistant any questions regarding Magic rules, complex card interactions, or specific commander rulings.",
          action: "judge",
        },
        {
          term: "SETS",
          flow: "Archive",
          desc: "A full timeline of every physical Magic set ever released. Filter by era to explore the history and evolution of the game.",
          action: "sets",
        },
        {
          term: "ROADMAP",
          flow: "Update log",
          desc: "Stay informed about latest updates, bug fixes, and upcoming features planned for 2026.",
          action: "calendar",
        },
      ],
    },
    {
      group: "GAMES & IDENTITY",
      nodes: [
        {
          term: "SHERIFF",
          flow: "Game Mode",
          desc: "Manage your multiplayer sessions using the Sheriff module. Randomize roles (Sheriff, Deputy, Outlaw, Renegade) and follow the variant rules.",
          action: "sheriff",
        },
        {
          term: "SETTINGS",
          flow: "Identity",
          desc: "Customize your username, title, and profile picture. Adjust layout density to balance information and visual comfort.",
          action: "settings",
        },
        {
          term: "CLOUD SYNC",
          flow: "Account",
          desc: "All your decks and preferences are synchronized in real-time. Link your Google account to secure your data across all devices.",
          action: "settings",
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-10 bg-black/98 backdrop-blur-3xl"
        >
          {/* Wireframe Grid */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,197,94,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Large Background Runes */}
          <div className="absolute inset-0 flex items-center justify-between px-10 opacity-[0.08] pointer-events-none select-none font-magic text-[40rem] text-green-500/40 overflow-hidden mix-blend-screen">
            <span className="blur-sm">ᚠ</span>
            <span className="blur-sm">ᛉ</span>
          </div>

          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="w-full max-w-7xl bg-[#030704] border border-green-500/30 rounded-lg overflow-hidden shadow-[0_0_120px_rgba(34,197,94,0.15)] relative flex flex-col max-h-[92vh]"
          >
            {/* Header: Tech Bar */}
            <div className="p-8 border-b border-green-500/20 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-12">
                <div className="w-16 h-16 border border-green-500/30 bg-green-500/5 flex items-center justify-center relative">
                  <div className="absolute inset-[-1px] border border-green-500 animate-pulse opacity-20" />
                  <Compass className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-magic font-black text-green-400 uppercase tracking-[0.5em] leading-none mb-3">
                    Deck Companion Manual // {VERSION}
                  </h2>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-amber-500 shadow-[0_0_10px_orange]" />
                      <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.8em]">
                        Library_Active // Companion_Active
                      </p>
                    </div>
                    <div className="hidden xl:flex items-center gap-4 border-l border-white/5 pl-8">
                      {manualSections.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => document.getElementById(`manual-${i}`)?.scrollIntoView({ behavior: 'smooth' })}
                          className="text-[8px] font-magic font-black text-white/20 hover:text-green-400 uppercase tracking-widest transition-colors"
                        >
                          {s.group.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
                <button
                  onClick={onClose}
                  className="flex-1 lg:flex-none px-8 py-3 bg-white/5 border border-white/10 rounded-xl hover:border-red-500/40 hover:text-red-400 transition-all font-magic font-black text-[10px] text-white/40 uppercase tracking-widest"
                >
                  Close Manual
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-12 lg:p-16">
              <AnimatePresence mode="wait">
                {showChangelog ? (
                  <motion.div
                    key="changelog"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      <History className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-xl font-magic font-black uppercase tracking-[0.4em] text-cyan-400">
                        Release Archive
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {releaseHistory.map((release) => (
                        <div key={release.version} className="rune-panel p-8 bg-white/[0.01] hover:bg-white/[0.03] transition-all group border-l-4 border-l-cyan-500/40 shadow-xl shadow-cyan-950/10">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-2xl font-magic font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-widest">{release.version}</span>
                            <span className="text-[10px] font-mono text-cyan-500/60 font-bold uppercase tracking-[0.4em]">{release.date}</span>
                          </div>
                          <ul className="space-y-4">
                            {release.changes.map((change, i) => (
                              <li key={i} className="flex gap-4 group/item">
                                <span className="text-cyan-500/20 font-mono mt-1 group-hover/item:text-cyan-500 transition-colors">0{i+1}</span>
                                <span className="text-white/40 font-sans text-sm leading-relaxed group-hover/item:text-white/70 transition-colors">{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12"
                  >
                    {manualSections.map((section, idx) => (
                      <div key={idx} id={`manual-${idx}`} className="flex flex-col gap-8">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-4 cursor-pointer group" onClick={() => document.getElementById(`manual-${idx}`)?.scrollIntoView({ behavior: 'smooth' })}>
                          <h3
                            className={`text-[10px] font-magic font-black uppercase tracking-[0.4em] group-hover:translate-x-2 transition-all ${idx % 2 === 0 ? "text-green-400" : "text-cyan-400"}`}
                          >
                            {section.group}
                          </h3>
                        </div>

                        <div className="flex flex-col gap-6 font-sans">
                          {section.nodes.map((node, nIdx) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 + nIdx * 0.02 }}
                              key={nIdx}
                              className="rune-panel p-5 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group flex flex-col h-full"
                            >
                              <div className="flex items-center justify-between mb-3 min-h-[30px]">
                                <span className="text-[11px] font-magic font-black text-white group-hover:text-green-400 transition-colors uppercase tracking-[0.1em]">
                                  {node.term}
                                </span>
                                <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest font-black">
                                  {node.flow}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/30 leading-relaxed group-hover:text-white/50 transition-colors">
                                {node.desc}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              {/* System Logic Banner */}
              <div className="mt-24 p-12 border border-green-500/10 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/[0.02] to-transparent pointer-events-none" />
                <div className="flex items-center gap-10 relative z-10">
                  <Zap className="w-12 h-12 text-green-500 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.2)]" />
                  <div>
                    <h4 className="text-xs font-magic font-black text-green-400 uppercase tracking-[0.4em] mb-3">
                      Deck Integrity Check
                    </h4>
                    <div className="flex items-center gap-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">
                      <span>Discovery</span>
                      <div className="w-8 h-px bg-white/5" />
                      <span>Library</span>
                      <div className="w-8 h-px bg-white/5" />
                      <span>Execution</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 relative z-10">
                  {["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ"].map((r) => (
                    <div
                      key={r}
                      className="w-12 h-12 border border-white/5 flex items-center justify-center font-magic text-green-500/10 text-2xl hover:text-green-500/40 hover:border-green-500/20 transition-all cursor-default"
                    >
                      {r}
                    </div>
                  ))}
                </div>
              </div>

            {/* Footer Bottom Bar */}
            <div className="px-10 py-6 border-t border-white/5 bg-black/80 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span className="text-[10px] font-mono text-white/10 uppercase tracking-[0.8em]">
                  My Decks Command Centre
                </span>
                <button
                  onClick={() => setShowChangelog(!showChangelog)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all text-[9px] font-magic font-bold uppercase tracking-widest ${showChangelog ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-white/5 border-white/10 text-white/20 hover:text-white"}`}
                >
                  <History className="w-3 h-3" />
                  {showChangelog ? "Show Manual" : "View History"}
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-magic text-green-500/40 uppercase tracking-widest">
                    Library Secured
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- DECK ANALYSIS COMPONENT ---
function DeckAnalysis({ cards }: { cards: any[] }) {
  const manaCurve = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i <= 7; i++) counts[i === 7 ? "7+" : i.toString()] = 0;

    cards.forEach((dc) => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const typeLine = (card?.type_line || "").toLowerCase();
      if (typeLine.includes("land")) return;
      let cmc = Math.floor(card?.cmc || 0);
      if (cmc >= 7) counts["7+"]++;
      else counts[cmc.toString()]++;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cards]);

  const colorData = useMemo(() => {
    // Defensive counting to ensure accurate visualization
    const counts: Record<string, number> = {
      W: 0,
      U: 0,
      B: 0,
      R: 0,
      G: 0,
      C: 0,
    };
    cards.forEach((dc) => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      if (!card) return;

      const typeLine = (card.type_line || "").toLowerCase();
      if (typeLine.includes("land")) return;

      // Extract colors from card cost or identity
      // Normalize colors to single letters WUBRG
      const colors = (card.colors || card.color_identity || [])
        .map((c: string) => c.replace(/\{|\}/g, "").toUpperCase())
        .filter((c: string) => "WUBRGC".includes(c));

      const qty = dc.quantity || 1;
      if (colors.length > 0) {
        colors.forEach((c: string) => {
          if (counts[c] !== undefined) counts[c] += qty;
        });
      } else {
        counts.C += qty;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [cards]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {
      Creatures: 0,
      Instants: 0,
      Sorceries: 0,
      Artifacts: 0,
      Enchantments: 0,
      Lands: 0,
      Planeswalkers: 0,
      Other: 0,
    };

    cards.forEach((dc) => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const tl = (card?.type_line || "").toLowerCase();
      if (tl.includes("creature")) counts.Creatures++;
      else if (tl.includes("instant")) counts.Instants++;
      else if (tl.includes("sorcery")) counts.Sorceries++;
      else if (tl.includes("artifact")) counts.Artifacts++;
      else if (tl.includes("enchantment")) counts.Enchantments++;
      else if (tl.includes("land")) counts.Lands++;
      else if (tl.includes("planeswalker")) counts.Planeswalkers++;
      else counts.Other++;
    });

    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [cards]);

  const stats = useMemo(() => {
    let lands = 0;
    let creatures = 0;
    let totalCmc = 0;
    let nonLands = 0;
    let total = 0;

    cards.forEach((dc) => {
      const qty = dc.quantity || 1;
      total += qty;
      const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
      const tl = (
        oracle?.type_line ||
        scryfall?.type_line ||
        dc.card?.type_line ||
        ""
      ).toLowerCase();

      if (tl.includes("land")) {
        lands += qty;
      } else {
        const cmc = oracle?.cmc || scryfall?.cmc || dc.card?.cmc || 0;
        totalCmc += cmc * qty;
        nonLands += qty;
      }
      if (tl.includes("creature")) creatures += qty;
    });

    const avgCmc = nonLands > 0 ? totalCmc / nonLands : 0;

    // Synergies summary
    const categories: string[] = [];
    cards.forEach((dc) => {
      const qty = dc.quantity || 1;
      const cats = dc.categories || [];
      for (let i = 0; i < qty; i++) categories.push(...cats);
    });
    const topCategories = [...new Set(categories)]
      .map((cat) => ({
        name: cat,
        count: categories.filter((c) => c === cat).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { total, lands, creatures, avgCmc, topCategories };
  }, [cards]);

  const COLORS_RECHART = {
    W: "#f8f6d3",
    U: "#0e68ab",
    B: "#1a1a1a",
    R: "#d3202a",
    G: "#00733e",
    C: "#90adbb",
  };

  const TYPE_COLORS = [
    "#22d3ee",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#6366f1",
    "#ec4899",
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative z-10 w-full mb-32">
      {/* Background removed to avoid double background */}
      {/* Tactical Briefing */}
      <div className="rune-panel bg-green-500/5 border border-green-500/10 rounded-3xl p-8 relative z-20 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <h4 className="text-[12px] font-magic font-black text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Tactical Briefing
        </h4>
        <div className="space-y-3">
          <p className="text-[11px] text-white/70 leading-relaxed">
            Deck consists of{" "}
            <span className="text-white font-bold">{stats.total} entries</span>.
            The energy core maintains an average of{" "}
            <span className="text-green-400 font-bold">
              {stats.avgCmc.toFixed(2)} CMC
            </span>
            .
          </p>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Primary strategic anchors detected:{" "}
            {stats.topCategories.map((c) => (
              <span
                key={c.name}
                className="text-white/80 font-mono px-1.5 py-0.5 bg-white/5 rounded border border-white/5 mx-0.5"
              >
                {c.name}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
        <h3 className="text-xs font-magic font-bold text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Mana Curve
        </h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={manaCurve}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.3)"
                fontSize={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0c0c0c",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ fontSize: "10px", color: "#22d3ee" }}
                cursor={{ fill: "rgba(34,211,238,0.05)" }}
              />
              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <h3 className="text-[8px] font-magic font-bold text-cyan-400 uppercase tracking-widest mb-4">
            Color Weight
          </h3>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={colorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {colorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS_RECHART[
                          entry.name as keyof typeof COLORS_RECHART
                        ] || "#8884d8"
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <h3 className="text-[8px] font-magic font-bold text-cyan-400 uppercase tracking-widest mb-4">
            Type Logistics
          </h3>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* DEPRECATED ADMIN CODE 
*/

// MTG Judge Component
function JudgeView() {
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Hallo! Mijn naam is Ruxa, Bear Judge. Ik help je graag met de complexe regels van ons mooie spel. Waar kan ik m'n tanden in zetten?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForSelection, setWaitingForSelection] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [selectedCards, setSelectedCards] = useState<Record<string, string>>(
    {},
  );
  const [pendingQuery, setPendingQuery] = useState("");
  const [lastExtracted, setLastExtracted] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const fetchCardSuggestions = async (query: string): Promise<string[]> => {
    try {
      const res = await axios.get(
        `/api/sf/cards/autocomplete?q=${encodeURIComponent(query)}`,
      );
      return res.data.data.slice(0, 5);
    } catch (e) {
      return [];
    }
  };

  const fetchCardContext = async (name: string): Promise<string> => {
    try {
      const res = await axios.get(
        `/api/sf/cards/named?exact=${encodeURIComponent(name)}`,
      );
      const data = res.data;
      const typeLine = data.type_line || "Type: Unknown";
      const cmc = data.cmc !== undefined ? `Mana Value: ${data.cmc}` : "";
      const pt =
        data.power && data.toughness
          ? `P/T: ${data.power}/${data.toughness}`
          : "";
      const oracle = data.oracle_text || "No rule text found.";
      const colors = data.color_identity?.join(", ") || "Kleurloos";
      return `**Kaart: ${data.name}**\n**Metadata:** ${typeLine} | ${cmc} | ${pt}\n**Color Identity:** ${colors}\n**Regeltekst:** ${oracle}\n`;
    } catch (e) {
      return `**Kaart: ${name}**\n*Kon kaartdata niet vinden.*\n`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const queryStr = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: queryStr }]);
    setInput("");
    setIsProcessing(true);
    setPendingQuery(queryStr);

    try {
      // 1. Extract card names
      const systemPrompt = `You are a specialized Magic: The Gathering card name extractor. Extract ALL MTG card names from the user's text. 
      Return ONLY the names as a comma-separated list. 
      Note: Even partial names or nicknames should be recognized as MTG cards if they clearly refer to them.
      If no cards are present, return an empty string.`;

      if (false) {
        throw new Error("AI not initialized. Check GEMINI_API_KEY.");
      }

      // Using gemini-flash-latest as a stable alias
      const response = await callGemini({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: queryStr }] }],
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text || "";
      const extracted = text
        .split(",")
        .map((n: string) => n.trim())
        .filter((n: string) => n.length > 2);

      // 2. Validate cards and check for ambiguity
      const newSuggestions: Record<string, string[]> = {};
      const validNames: string[] = [];

      for (const name of extracted) {
        try {
          const scryRes = await axios.get(
            `/api/sf/cards/named?exact=${encodeURIComponent(name)}`,
          );
          validNames.push(scryRes.data.name);
        } catch (err) {
          const sug = await fetchCardSuggestions(name);
          if (sug.length > 0) {
            newSuggestions[name] = sug;
          }
        }
      }

      if (Object.keys(newSuggestions).length > 0) {
        setSuggestions(newSuggestions);
        setWaitingForSelection(true);
        setLastExtracted(new Set(validNames));
        setIsProcessing(false);
      } else {
        await generateRuling(queryStr, validNames);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg =
        "Oei, mijn mentale archief is even onbereikbaar. Probeer het over een momentje opnieuw.";
      if (err.message) {
        if (err.message.includes("AI not initialized")) {
          errorMsg =
            "My apologies, the archives are not yet unlocked. Please configure the GEMINI_API_KEY to consult my wisdom.";
        } else if (err.message.includes("API key expired")) {
          errorMsg =
            "My apologies, my API key seems to have expired. Please refresh it in the settings.";
        } else {
          errorMsg = `Er is iets misgegaan: ${err.message.slice(0, 50)}...`;
        }
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
      setIsProcessing(false);
    }
  };

  const renderRuxaContent = (content: string) => {
    // Regex for {T}, {W}, {U}, {B}, {R}, {G}, {C}, {1}, {2}, etc.
    const symbolRegex = /\{([^}]+)\}/g;
    const parts = content.split(symbolRegex);

    return parts.map((part, i) => {
      // If it's a symbol part (every odd index because of capture group in split)
      if (i % 2 === 1) {
        const symbol = `{${part.toUpperCase()}}`;
        if (MANA_SYMBOL_URIS[symbol]) {
          return (
            <img
              key={i}
              src={MANA_SYMBOL_URIS[symbol]}
              alt={symbol}
              className="inline-block w-4 h-4 mx-0.5 align-middle brightness-125 saturate-150 shadow-[0_0_5px_rgba(255,255,255,0.2)]"
            />
          );
        }
        return (
          <span
            key={i}
            className="font-mono font-bold text-green-400"
          >{`{${part}}`}</span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const generateRuling = async (query: string, confirmedNames: string[]) => {
    setIsProcessing(true);
    try {
      let context = "";
      const cardsData = [];
      for (const name of confirmedNames) {
        try {
          const res = await axios.get(
            `/api/sf/cards/named?exact=${encodeURIComponent(name)}`,
          );
          cardsData.push(res.data);
          context += `**Kaart: ${res.data.name}**\n**Metadata:** ${res.data.type_line} | Mana Value: ${res.data.cmc} | P/T: ${res.data.power}/${res.data.toughness}\n**Color Identity:** ${res.data.color_identity?.join(", ")}\n**Regeltekst:** ${res.data.oracle_text}\n`;
        } catch (e) {
          context += `**Kaart: ${name}**\n*Kon kaartdata niet vinden.*\n`;
        }
      }

      const systemPrompt = `Je bent Ruxa, een deskundige maar bondige Magic: The Gathering Judge. 
      
      MISSIE:
      Beantwoord vragen over spelregels direct en nauwkeurig. Gebruik de verstrekte context als bron.
      
      RICHTLIJNEN VOOR STIJL EN TAAL:
      - Antwoord ALTIJD in het NEDERLANDS.
      - Gebruik de officiële Magic jargon in het ENGELS (bijv. "state-based actions", "priority", "stack", "trigger", "resolve", "on the battlefield").
      - Gebruik GEEN opmaak zoals sterretjes (* of **) voor jargon; laat de tekst vloeiend in de zin lopen.
      - NEVER mention specific rule numbers (e.g. CR 123.4) unless explicitly asked by the user.
      - GEBRUIK ALTIJD de officiële mana- en tap-symbolen TUSSEN ACCURATES ({BRACKETS}) voor ELKE verwijzing naar mana of tap: {T} voor tap, {Q} voor untap, {W}, {U}, {B}, {R}, {G} voor mana, {C} voor colorless, en {0}, {1}, {2}, etc. voor generieke mana. (Bijv: "{T}: Voeg {G} toe").
      - Voor meerdere mana symbolen, schrijf ze apart: bijv. {C}{C} of {G}{G}.
      - Wees bondig. Geef het antwoord in maximaal een paar zinnen.
      - Leg achterliggende regels alleen uit als er specifiek naar 'waarom' gevraagd wordt.
      - Een subtiele humoristische opmerking of een kleine dad-joke mag, maar overdrijf het niet. 
      - Behoud een wijze, professionele uitstraling.`;

      const userMessage = `--- CONTEXT VAN KAARTEN ---\n${context}\n\n--- REGELSVRAAG ---\n${query}\n\nWat is je uitspraak? (Gebruik {T} en mana symbolen, jargon in het Engels, antwoord in het Nederlands):`;

      const modelId = "gemini-3-flash-preview";

      let ruling = "";
      try {
        const response = await callGemini({
          model: modelId,
          contents: [{ parts: [{ text: userMessage }] }],
          config: {
            systemInstruction: systemPrompt,
          },
        });
        ruling = response.text || "";
      } catch (e: any) {
        console.error("Ruxa API error:", e);
        if (e.message && e.message.includes("503")) {
          throw new Error(
            "De AI is momenteel overbelast. Probeer het over een minuutje weer!",
          );
        }
        if (e.message && e.message.includes("API key expired")) {
          throw new Error(
            "API key expired. Refresh your Gemini API key in the settings.",
          );
        }
        throw e;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: ruling,
          relatedCards: cardsData,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      const detail = err.message ? ` (${err.message.slice(0, 50)}...)` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `My apologies, the archives are temporarily sealed.${detail}`,
        },
      ]);
    }
    setIsProcessing(false);
    setWaitingForSelection(false);
    setSuggestions({});
    setSelectedCards({});
    setLastExtracted(new Set());
  };

  const handleSelectionConfirm = () => {
    const finalCards = [...lastExtracted];
    Object.values(selectedCards).forEach((name) => {
      if (!(name as string).includes("Negeer")) finalCards.push(name as string);
    });
    generateRuling(pendingQuery, finalCards);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-transparent rounded-3xl">
      {/* Background Runes removed to avoid double background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl">
        <div className="absolute top-1/4 left-1/4 text-[80vw] font-magic leading-none opacity-[0.015] text-green-500 -translate-x-1/2 -translate-y-1/2">
          Γ
        </div>
        <div className="absolute bottom-1/4 right-1/4 text-[60vw] font-magic leading-none opacity-[0.015] text-emerald-500 translate-x-1/4 translate-y-1/4">
          Λ
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-2 sm:p-4 overflow-visible relative group/ruxa z-10">
        {/* Decorative Ruxa Background */}
        <div className="absolute left-0 bottom-0 w-[450px] h-[90%] pointer-events-none z-0 hidden lg:block opacity-0 group-hover/ruxa:opacity-100 focus-within:opacity-100 transition-all duration-700 transform translate-x-10 group-hover/ruxa:-translate-x-56 focus-within:-translate-x-56">
          <img
            src="/ruxa.png"
            alt="Peeking Ruxa"
            className="w-full h-full object-contain object-bottom drop-shadow-[0_0_40px_rgba(16,185,129,0.3)] -scale-x-100"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <div className="rune-panel flex-1 flex flex-col rounded-[2.5rem] overflow-hidden border-green-500/10 shadow-[0_0_50px_rgba(16,185,129,0.1)] bg-transparent relative z-10 transition-all duration-300">
          {/* Header */}
          <div className="p-6 border-b border-green-500/10 flex items-center justify-between bg-green-950/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Gavel className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="font-magic font-black text-sm uppercase tracking-[0.2em] text-green-400">
                  Ruxa's Court
                </h2>
                <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">
                  Bear Judge Oversight
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/5 rounded-full border border-green-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-mono uppercase text-green-500/60 font-black tracking-widest">
                Connected
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-lg overflow-hidden
                  ${msg.role === "user" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-green-500/10 border-green-500/20 text-green-400"}`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <img
                        src="/ruxa.png"
                        alt="R"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    )}
                  </div>
                  <div
                    className={`p-4 rounded-3xl text-sm font-sans leading-relaxed shadow-sm
                  ${
                    msg.role === "user"
                      ? "bg-orange-500/5 border border-orange-500/10 text-orange-100 rounded-tr-none"
                      : "bg-green-500/5 border border-green-500/10 text-green-50 rounded-tl-none"
                  }`}
                  >
                    {renderRuxaContent(msg.content)}
                    {msg.relatedCards && msg.relatedCards.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {msg.relatedCards.map((card: any, idx: number) => (
                          <div
                            key={idx}
                            className="group/card relative w-20 sm:w-24 aspect-[2.5/3.5] rounded-lg overflow-hidden border border-white/10 hover:border-green-400/50 transition-all flex-shrink-0 shadow-lg"
                          >
                            <img
                              src={
                                (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris)
                                  ? card.card_faces[0].image_uris.small
                                  : (card.image_uris?.small || card.image_uris?.normal || "")
                              }
                              alt={card.name}
                              className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <p className="text-[6px] font-mono text-white truncate text-center">
                                {card.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-[10px] font-magic font-black uppercase text-green-500/40 tracking-widest">
                    Consulting Rules...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ambient Selection UI */}
          {waitingForSelection && (
            <div className="px-6 py-4 bg-green-500/5 border-t border-green-500/10 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[9px] font-magic font-black text-green-400 uppercase tracking-widest">
                  Identificatie Verifiëren
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(suggestions).map(([term, choices]) => (
                  <div key={term} className="space-y-1">
                    <p className="text-[8px] font-bold text-green-500/40 uppercase pl-1">
                      Voor "{term}":
                    </p>
                    <select
                      onChange={(e) =>
                        setSelectedCards((prev) => ({
                          ...prev,
                          [term]: e.target.value,
                        }))
                      }
                      className="w-full bg-black/60 border border-green-500/20 rounded-xl px-4 py-2.5 text-[10px] text-green-100 outline-none focus:border-green-400 transition-all cursor-pointer"
                    >
                      <option value="">Selecteer kaart...</option>
                      {(choices as string[]).map((c, cidx) => (
                        <option key={`${c}-${cidx}`} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value={`Negeer ${term}`}>Negeer "{term}"</option>
                    </select>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSelectionConfirm}
                className="mt-4 w-full py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
              >
                Bevestig Selectie
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-green-500/10 bg-black/40">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel een regelsvraag aan Ruxa..."
                disabled={isProcessing || waitingForSelection}
                className="flex-1 bg-green-500/[0.03] border border-green-500/10 rounded-2xl px-6 py-4 text-base sm:text-xs font-sans text-green-100 placeholder:text-green-500/20 outline-none focus:border-green-500/40 focus:bg-green-500/[0.05] transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isProcessing || waitingForSelection || !input.trim()}
                className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-20 active:scale-95 group"
              >
                <div className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </button>
            </form>
            <p className="text-[8px] text-green-500/20 font-black uppercase tracking-[0.2em] mt-4 text-center">
              Beer Judge Ruxa is een AI-assistent. Verifieer uitspraken altijd
              met de officiële regels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckManager() {
  return null;
}

function SetExplorer({
  setViewMode,
  performSearch,
  setSearchQuery,
  setIsMobileMenuOpen,
}: {
  setViewMode: (v: string) => void;
  performSearch: (o: any) => void;
  setSearchQuery: (s: string) => void;
  setIsMobileMenuOpen?: (v: boolean) => void;
}) {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["core", "expansion"]),
  );

  const ALL_FILTERS = [
    { id: "main", labels: ["core", "expansion"], name: "Main Sets" },
    { id: "commander", labels: ["commander"], name: "Commander" },
    {
      id: "masters",
      labels: ["masters", "draft_innovation"],
      name: "Masters/Draft",
    },
    { id: "modern", labels: ["eternal", "alchemy"], name: "Modern/Eternal" },
    {
      id: "masterpiece",
      labels: ["masterpiece", "arsenal", "spellbook", "from_the_vault"],
      name: "Masterpieces",
    },
    {
      id: "decks",
      labels: ["starter", "box", "duel_deck", "premium_deck"],
      name: "Box/Decks",
    },
    {
      id: "multiplayer",
      labels: ["planechase", "archenemy", "vanguard", "minigame"],
      name: "Multiplayer",
    },
    {
      id: "promo",
      labels: ["promo", "treasure_chest", "funny"],
      name: "Promo/Funny",
    },
    { id: "extras", labels: ["token", "memorabilia"], name: "Tokens/Extras" },
  ];

  const toggleFilter = (labels: string[]) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      const isAllActive = labels.every((l) => next.has(l));
      if (isAllActive) {
        labels.forEach((l) => next.delete(l));
      } else {
        labels.forEach((l) => next.add(l));
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchSets() {
      try {
        const data = await fetchScryfallSets();
        const today = new Date();

        const excludedCodes = [
          "otp",
          "big",
          "pip",
          "rex",
          "mom",
          "mat",
          "plst",
          "ha7",
          "ea3",
        ];

        const filtered = data.data
          .filter((s: ScryfallSet) => {
            return (
              s.card_count > 0 &&
              (!s.digital || s.set_type === "alchemy") &&
              !excludedCodes.includes(s.code.toLowerCase()) &&
              !s.name.toLowerCase().includes("omenpaths")
            );
          })
          .map((s: any) => {
            const childCodes = data.data
              .filter((sub: any) => sub.parent_set_code === s.code)
              .map((sub: any) => sub.code);
            return {
              ...s,
              queryCodes: [s.code, ...childCodes],
              isFuture: s.released_at ? new Date(s.released_at) > today : false,
            };
          });

        const roadmapSets = [
          { name: "Lorwyn Eclipsed", date: "2026-01-01", code: "LOR" },
          {
            name: "Teenage Mutant Ninja Turtles",
            date: "2026-03-01",
            code: "TMN",
          },
          { name: "Secrets of Strixhaven", date: "2026-04-01", code: "STX2" },
          { name: "Marvel Super Heroes", date: "2026-06-01", code: "MVL" },
          { name: "The Hobbit", date: "2026-08-01", code: "HBT" },
          { name: "Reality Fracture", date: "2026-10-01", code: "RF" },
          {
            name: "Universes Beyond: Star Trek",
            date: "2026-11-01",
            code: "STK",
          },
        ];

        roadmapSets.forEach((rs) => {
          const rsDate = new Date(rs.date);
          const isFarFuture = rsDate > today;

          const existingIdx = filtered.findIndex(
            (m: any) =>
              m.name
                .toLowerCase()
                .includes(rs.name.toLowerCase().split(" ")[0]) ||
              (m.released_at &&
                m.released_at.startsWith(rs.date.substring(0, 7))),
          );

          if (existingIdx !== -1) {
            // Already added from Scryfall. Assure the correct query codes and just rely on Scryfall's date and isFuture.
          } else {
            filtered.push({
              id: `roadmap-${rs.code}`,
              name: rs.name,
              released_at: rs.date,
              set_type: "expansion",
              code: rs.code,
              queryCodes: [rs.code],
              icon_svg_uri: "https://svgs.scryfall.io/sets/modern.svg",
              isFuture: isFarFuture,
            } as any);
          }
        });

        filtered.sort((a: any, b: any) => {
          const dA = new Date(a.released_at || "1970-01-01").getTime();
          const dB = new Date(b.released_at || "1970-01-01").getTime();
          return dB - dA;
        });
        setSets(filtered);
      } catch (err) {
        console.error("Failed to fetch sets", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSets();
  }, []);

  const filteredSets = sets.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeFilters.has(s.set_type);
    return matchesSearch && matchesType;
  });

  const onSetClick = (codes: string[]) => {
    setIsMobileMenuOpen?.(false);
    setSearchQuery("");
    setViewMode("cards");
    performSearch({
      queryOverride: `(${codes.map((c) => `s:${c}`).join(" OR ")}) -is:token -is:art_series`,
      autoSelect: true,
      skipCI: true,
      skipFormatFilters: true,
    });
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col w-full bg-transparent">
      {/* Background Runes - Minimal & Non-Scrolling Fixed with Viewport removed to avoid double background */}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20 relative z-10 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="pt-4" />

          {/* Title Area */}
          <div className="text-center space-y-4 mb-20 relative">
            <div className="flex items-center justify-center gap-4 text-orange-500/30 font-magic">
              <span className="text-4xl">ᛉ</span>
              <div className="h-[1px] w-12 bg-orange-500/20" />
              <span className="text-4xl">ᛊ</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-magic font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Expansions
            </h1>
            <p className="text-[10px] md:text-xs text-white/40 font-mono tracking-[0.5em] uppercase max-w-lg mx-auto">
              Vault System: Archive of the Multiverse Versions
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 max-w-lg mx-auto mb-10 relative z-20">
            <div className="relative group w-3/4 opacity-60 focus-within:opacity-100 transition-opacity">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sync set code..."
                className="w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[11px] focus:border-cyan-500/30 outline-none transition-all font-sans tracking-wide text-white/70"
              />
            </div>

            <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-2 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0 w-full px-4 md:px-0">
              {ALL_FILTERS.map((f) => {
                const isActive = f.labels.every((l) => activeFilters.has(l));
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.labels)}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-magic font-bold uppercase tracking-widest border transition-all backdrop-blur-xl shrink-0 ${isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-white/[0.02] text-white/20 border-white/5 hover:border-cyan-500/20"}`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-[10px] font-magic font-bold text-white/20 uppercase tracking-widest">
                Expansions loading...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-2 gap-y-4 sm:gap-x-4 sm:gap-y-6 px-2 relative z-10 w-full">
              {filteredSets.map((set) => (
                <div
                  key={set.id || set.code}
                  onClick={() => onSetClick(set.queryCodes || [set.code])}
                  className="group relative aspect-square flex items-center justify-center p-2 hover:scale-[1.15] active:scale-[0.95] transition-all duration-500"
                >
                  <div
                    className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 pointer-events-none
                    ${set.isFuture ? "bg-orange-500" : "bg-cyan-500"}
                  `}
                  />

                  <img
                    src={set.icon_svg_uri}
                    className={`w-full h-full object-contain invert transition-all duration-500 relative z-10
                      ${set.isFuture ? "opacity-30 group-hover:opacity-100 grayscale brightness-125 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "opacity-40 group-hover:opacity-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"}
                    `}
                    alt={set.code}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://svgs.scryfall.io/sets/modern.svg";
                    }}
                  />

                  {set.isFuture && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] z-20" />
                  )}

                  <div className="absolute inset-x-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0 z-[100]">
                    <div className="mx-auto w-fit bg-black/90 px-3 py-1 rounded border border-white/10 shadow-2xl backdrop-blur-md whitespace-nowrap flex items-center gap-2">
                      <span
                        className={`text-[9px] font-magic font-bold uppercase tracking-widest drop-shadow-md flex-1 text-center
                        ${set.isFuture ? "text-orange-400" : "text-cyan-400"}
                      `}
                      >
                        {set.name}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-sans tracking-widest font-bold">
                        {set.code.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReleaseCalendar({
  setViewMode,
  performSearch,
  setSearchQuery,
}: {
  setViewMode: (v: string) => void;
  performSearch: (o: any) => void;
  setSearchQuery: (s: string) => void;
}) {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const data = await fetchScryfallSets();
        const today = new Date();
        const futureRaw = data.data.filter((s: any) => {
          if (!s.released_at) return false;
          // Ensure we show the full 2026 roadmap and any future sets
          return (
            s.released_at.startsWith("2026") || new Date(s.released_at) >= today
          );
        });

        const validTypes = ["expansion", "core"];
        const mainSets = futureRaw.filter(
          (s: any) =>
            validTypes.includes(s.set_type) &&
            !s.digital &&
            !s.name.toLowerCase().includes("omenpaths") &&
            !s.name.toLowerCase().includes("art series") &&
            !s.name.toLowerCase().includes("promo"),
        );

        let mapped = mainSets.map((main: any) => {
          const childCodes = data.data
            .filter((sub: any) => sub.parent_set_code === main.code)
            .map((sub: any) => sub.code);
          return {
            ...main,
            fullName: main.name,
            queryCodes: [main.code, ...childCodes],
          };
        });

        // Filter to show late 2025 and all of 2026
        const filtered = mapped.filter((m) => {
          const d = new Date(m.released_at);
          const year = d.getFullYear();
          return (
            year === 2026 || (year === 2025 && d.getMonth() >= 9) || year > 2026
          );
        });

        filtered.push({
          code: "stk",
          name: "Universes Beyond: Star Trek",
          released_at: "2026-11-01",
          set_type: "expansion",
          icon_svg_uri: "",
          queryCodes: ["stk"],
          fullName: "Universes Beyond: Star Trek",
        });

        filtered.sort(
          (a: any, b: any) =>
            new Date(a.released_at).getTime() -
            new Date(b.released_at).getTime(),
        );
        setTimeline(filtered);
      } catch (err) {
        console.error("Failed to fetch calendar", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
  }, []);

  const onReleaseClick = (codes: string[]) => {
    setSearchQuery("");
    setViewMode("cards");
    performSearch({
      queryOverride: `(${codes.map((c) => `s:${c}`).join(" OR ")}) -is:token -is:art_series -is:alchemy -is:digital`,
      autoSelect: true,
      skipCI: true,
      skipFormatFilters: true,
    });
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col w-full bg-transparent">
      {/* Background Runes */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-screen bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${runesBackground})` }}
      />
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden text-center opacity-100">
        <div className="absolute top-0 right-0 text-[60vw] font-magic leading-none opacity-[0.015] text-cyan-500 translate-x-1/4 -translate-y-1/4">
          Ж
        </div>
        <div className="absolute bottom-0 left-0 text-[50vw] font-magic leading-none opacity-[0.015] text-orange-500 -translate-x-1/4 translate-y-1/4">
          Ѧ
        </div>
      </div>

      <div className="text-center pt-12 z-10 space-y-2">
        <h3 className="text-3xl md:text-5xl font-magic font-black text-white uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          RELEASE CALENDAR 2026
        </h3>
        <p className="text-[8px] md:text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em] md:tracking-[0.5em] font-black underline decoration-cyan-500/20 underline-offset-8">
          GLIMPSE INTO THE FUTURE OF THE MULTIVERSE
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RotateCw className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 relative mt-10 overflow-x-auto overflow-y-hidden w-full pb-32 touch-pan-x">
          {/* Main Horizontal Timeline Line */}
          <div className="absolute left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-orange-500 top-1/2 -translate-y-1/2 opacity-30 shadow-[0_0_30px_rgba(6,182,212,0.5)] z-0 min-w-[1200px] md:min-w-[1600px]" />

          <div className="flex items-center justify-between h-full relative z-20 overflow-visible flex-nowrap px-12 min-w-[1200px] md:min-w-[1600px]">
            {timeline.map((set, idx) => {
              const isTop = idx % 2 === 0;
              const releaseDate = new Date(set.released_at);
              const isFarFuture =
                releaseDate.getFullYear() > 2026 ||
                (releaseDate.getFullYear() === 2026 &&
                  releaseDate.getMonth() >= 5);
              const accentColor = isFarFuture
                ? "text-orange-500"
                : "text-cyan-500";
              const glowColor = isFarFuture
                ? "rgba(249,115,22,1)"
                : "rgba(6,182,212,1)";
              const maskSrc =
                set.icon_svg_uri || "https://svgs.scryfall.io/sets/modern.svg";

              return (
                <div
                  key={set.id || set.code || idx}
                  className="relative flex-1 flex justify-center group h-full items-center shrink-0 min-w-[80px]"
                >
                  {/* Vertical Connector Path */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-[1px] md:w-px bg-white/10 transition-all duration-700
                    ${isTop ? "bottom-1/2 h-16 sm:h-24 lg:h-32" : "top-1/2 h-16 sm:h-24 lg:h-32"}
                    group-hover:bg-cyan-500/50 group-hover:opacity-100 opacity-20
                  `}
                  />

                  {/* Node Dot on Line */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div
                      className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full border-2 bg-black transition-all duration-500
                      ${isFarFuture ? "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]" : "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]"}
                      group-hover:scale-150 group-hover:bg-current ${accentColor}
                    `}
                    />
                  </div>

                  {/* Content Stack (Alternating) */}
                  <div
                    className={`flex flex-col justify-center items-center gap-1 sm:gap-4 lg:gap-8 absolute left-1/2 -translate-x-1/2 transition-all duration-1000 w-24 sm:w-32 lg:w-40 z-30
                    ${isTop ? "bottom-1/2 mb-4 sm:mb-6 lg:mb-10" : "top-1/2 mt-4 sm:mt-6 lg:mt-10"}
                    group-hover:${isTop ? "mb-6 sm:mb-8 lg:mb-12" : "mt-6 sm:mt-8 lg:mt-12"}
                  `}
                  >
                    {/* Icon Circle */}
                    <button
                      onClick={() => onReleaseClick(set.queryCodes)}
                      className={`w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center bg-black border-2 border-white/5 relative z-30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-125 shrink-0 focus:outline-none cursor-pointer
                      ${isFarFuture ? "group-hover:border-orange-500 shadow-orange-500/20" : "group-hover:border-cyan-500 shadow-cyan-500/20"}
                    `}
                    >
                      <div className="absolute inset-0 rounded-full bg-radial-gradient from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div
                        className={`w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 transition-all duration-700 z-10 opacity-40 group-hover:opacity-100`}
                        style={{
                          filter: `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 15px ${glowColor})`,
                        }}
                      >
                        <img
                          src={maskSrc}
                          alt={set.name}
                          className={`w-full h-full object-contain invert transition-all duration-700`}
                          onError={(e) =>
                            (e.currentTarget.src =
                              "https://svgs.scryfall.io/sets/modern.svg")
                          }
                        />
                      </div>
                    </button>

                    {/* Info Box */}
                    <button
                      onClick={() => onReleaseClick(set.queryCodes)}
                      className="w-full text-center rune-panel p-2 sm:p-4 lg:p-6 bg-black/90 backdrop-blur-md hover:border-white/30 transition-all cursor-pointer group/box shadow-2xl relative"
                    >
                      <h4 className="text-[9px] sm:text-[11px] lg:text-[13px] font-magic font-black text-white uppercase tracking-[0.05em] lg:tracking-[0.1em] mb-1 lg:mb-2 group-hover/box:text-cyan-400 transition-all leading-tight line-clamp-2 drop-shadow-md">
                        {set.name}
                      </h4>
                      <p
                        className={`text-[5px] sm:text-[6px] lg:text-[8px] font-mono uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap ${accentColor}`}
                      >
                        {releaseDate.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OutlawSheriff() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="h-full bg-transparent overflow-y-auto no-scrollbar relative p-4 sm:p-8 md:p-20 selection:bg-orange-500/30 font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.1)_0%,transparent_60%)]" />
        {/* Specific background removed to avoid double background */}
        
        {/* Animated Background Runes */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="w-[120vw] h-[120vw] border-[1px] border-white/[0.03] rounded-full flex items-center justify-center opacity-30"
          >
            <div className="w-[80%] h-[80%] border-[1px] border-white/[0.02] rounded-full flex items-center justify-center">
              <div className="w-[60%] h-[60%] border-[1px] border-white/[0.01] rounded-full" />
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto relative z-10 space-y-24"
      >
        {/* Hero Header */}
        <div className="text-center space-y-6 md:space-y-10 mt-4 md:mt-0">
          <div className="inline-block relative">
            <motion.div variants={itemVariants} className="relative">
              <h1 className="text-5xl sm:text-7xl md:text-[12rem] font-magic font-black text-white uppercase tracking-[0.25em] leading-none drop-shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                SHERIFF
              </h1>
              <div className="absolute -inset-x-10 md:-inset-x-20 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
              <div className="absolute left-1/2 -bottom-6 md:-bottom-8 -translate-x-1/2 flex gap-3 md:gap-6 items-center whitespace-nowrap bg-black/40 backdrop-blur-3xl px-4 md:px-8 py-1.5 md:py-2 rounded-full border border-orange-500/20">
                <Shield className="w-3.5 h-3.5 md:w-5 h-5 text-orange-500" />
                <span className="text-orange-500 font-magic text-[8px] md:text-[10px] tracking-[0.4em] md:tracking-[0.8em] uppercase font-black">Multiplayer Variant</span>
                <Shield className="w-3.5 h-3.5 md:w-5 h-5 text-orange-500" />
              </div>
            </motion.div>
          </div>
          <motion.p variants={itemVariants} className="text-[10px] md:text-sm font-mono text-cyan-400/50 tracking-[0.3em] md:tracking-[0.6em] uppercase max-w-3xl mx-auto pt-4 md:pt-10 px-4">
            Een tactisch spel van deductie en overleving
          </motion.p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12">
          {/* Main Column: Rules & Setup */}
          <div className="lg:col-span-8 space-y-6 md:space-y-12">
            {/* Spelopzet Panel */}
            <motion.div variants={itemVariants} className="rune-panel bg-black/40 border border-white/10 rounded-2xl md:rounded-[3rem] p-6 md:p-14 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 md:p-12 opacity-[0.02] md:opacity-[0.03] rotate-12 group-hover:opacity-[0.08] transition-opacity duration-1000">
                <Users className="w-48 md:w-72 h-48 md:h-72 text-white" />
              </div>
              
              <div className="space-y-8 md:space-y-12 relative z-10">
                <div className="flex items-center gap-4 md:gap-8 border-b border-white/5 pb-6 md:pb-10">
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-white/[0.03] border border-white/10 rounded-xl md:rounded-3xl flex items-center justify-center rotate-45 group-hover:rotate-90 transition-transform duration-1000">
                    <Zap className="w-6 h-6 md:w-10 md:h-10 text-orange-500 -rotate-45 group-hover:-rotate-90 transition-transform duration-1000" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-4xl font-magic font-black text-white uppercase tracking-widest">Speluitleg</h2>
                    <p className="text-[9px] md:text-[11px] font-mono text-white/30 uppercase tracking-[0.2em] md:tracking-[0.4em] mt-1 md:mt-3">Regels_en_Rollen_Overzicht</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                  <div className="space-y-4 md:space-y-8 text-white/60 text-xs md:text-[14px] leading-relaxed font-sans">
                    <p className="italic">
                      Sheriff is een spel waarbij je niet weet welke rol de andere spelers hebben. Elke speler krijgt een geheim doel en moet samenwerken of anderen misleiden om te winnen.
                    </p>
                    <div className="bg-orange-500/10 border-l-2 md:border-l-4 border-orange-500 p-4 md:p-8 rounded-r-xl md:rounded-r-[2rem] space-y-2 md:space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                       <h4 className="text-orange-500 font-magic font-black uppercase text-[9px] md:text-[11px] tracking-widest">De Rol van de Sheriff</h4>
                       <p className="text-white/80 leading-relaxed text-[11px] md:text-[13px]">
                         De Sheriff is de enige speler die <span className="text-white font-bold underline decoration-orange-500/40">bekend is</span> bij iedereen. Omdat iedereen hem wil uitschakelen, begint de Sheriff met <span className="text-orange-500 font-black">50% extra levens</span>.
                       </p>
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="rune-panel bg-white/[0.02] rounded-xl md:rounded-[2.5rem] border border-white/5 p-4 md:p-8 space-y-4 md:space-y-6">
                      <h4 className="text-[10px] md:text-xs font-magic font-black text-orange-500 uppercase tracking-widest">Rol Verdeling</h4>
                      <table className="w-full text-[9px] md:text-sm font-sans text-white/70 border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-left">
                            <th className="pb-2 md:pb-3 font-magic uppercase tracking-widest text-white/40">Spelers</th>
                            <th className="pb-2 md:pb-3 font-magic uppercase tracking-widest text-orange-500">S</th>
                            <th className="pb-2 md:pb-3 font-magic uppercase tracking-widest text-blue-400">D</th>
                            <th className="pb-2 md:pb-3 font-magic uppercase tracking-widest text-red-500">O</th>
                            <th className="pb-2 md:pb-3 font-magic uppercase tracking-widest text-cyan-400">R</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          <tr className="border-b border-white/5">
                            <td className="py-2 md:py-4 text-white font-black">5 Spelers</td>
                            <td className="py-2 md:py-4">1</td>
                            <td className="py-2 md:py-4">1</td>
                            <td className="py-2 md:py-4">2</td>
                            <td className="py-2 md:py-4">1</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 md:py-4 text-white font-black">6 Spelers</td>
                            <td className="py-2 md:py-4">1</td>
                            <td className="py-2 md:py-4">2</td>
                            <td className="py-2 md:py-4">2</td>
                            <td className="py-2 md:py-4">1</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 md:py-4 text-white font-black">7 Spelers</td>
                            <td className="py-2 md:py-4">1</td>
                            <td className="py-2 md:py-4">2</td>
                            <td className="py-2 md:py-4">3</td>
                            <td className="py-2 md:py-4">1</td>
                          </tr>
                          <tr className="">
                            <td className="py-2 md:py-4 text-white font-black">8 Spelers</td>
                            <td className="py-2 md:py-4">1</td>
                            <td className="py-2 md:py-4">3</td>
                            <td className="py-2 md:py-4">3</td>
                            <td className="py-2 md:py-4">1</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[7px] md:text-[9px] text-white/30 italic">S: Sheriff | D: Deputy | O: Outlaw | R: Renegade</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Roles Section */}
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-3 md:gap-4 px-2 md:px-6">
                <div className="h-[1px] flex-1 bg-white/5" />
                <h3 className="text-[10px] font-magic font-black text-white/40 uppercase tracking-[0.3em] md:tracking-[0.5em]">De Geheime Rollen</h3>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-8">
                {[
                  { 
                    n: "Sheriff", 
                    c: "text-orange-500", 
                    bg: "bg-orange-500/10",
                    border: "border-orange-500/20",
                    t: "De Wet",
                    d: "Schakel alle Outlaws en de Renegade uit. Iedereen weet dat jij de Sheriff bent. Je hebt extra levens om langer te overleven."
                  },
                  { 
                    n: "Deputy", 
                    c: "text-blue-400", 
                    bg: "bg-blue-400/10",
                    border: "border-blue-400/20",
                    t: "De Wet",
                    d: "Bescherm de Sheriff tegen aanvallen. Je wint als de Sheriff wint. Houd je eigen rol wel geheim voor anderen."
                  },
                  { 
                    n: "Outlaw", 
                    c: "text-red-500", 
                    bg: "bg-red-500/10",
                    border: "border-red-500/20",
                    t: "De Outlaws",
                    d: "Jouw doel is simpel: Dood de Sheriff. Zodra de Sheriff dood is, winnen alle Outlaws meteen."
                  },
                  { 
                    n: "Renegade", 
                    c: "text-cyan-400", 
                    bg: "bg-cyan-400/10",
                    border: "border-cyan-400/20",
                    t: "De Renegade",
                    d: "Je speelt voor jezelf. Je wint als je als laatste overblijft, maar pas op: de Sheriff moet als allerlaatste doodgaan."
                  }
                ].map((r, i) => (
                  <motion.div 
                    key={i} 
                    variants={itemVariants}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`p-4 md:p-10 rounded-2xl md:rounded-[3rem] border ${r.border} ${r.bg} space-y-2 md:space-y-6 transition-all shadow-xl flex flex-col group`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h3 className={`text-sm md:text-3xl font-magic font-black uppercase tracking-widest ${r.c}`}>{r.n}</h3>
                      <div className="text-[7px] md:text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold">{r.t}</div>
                    </div>
                    <p className="text-[9px] md:text-[13px] text-white/60 leading-relaxed font-sans">{r.d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Meta & Strategy */}
          <div className="lg:col-span-4 space-y-6 md:space-y-12">
            {/* Victory Conditions Panel */}
            <motion.div variants={itemVariants} className="rune-panel bg-black/60 border border-cyan-500/20 rounded-2xl md:rounded-[3rem] p-6 md:p-10 space-y-8 md:space-y-14 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
               
               <div className="space-y-6 md:space-y-8 relative z-10">
                 <h3 className="text-lg md:text-2xl font-magic font-black text-white uppercase tracking-widest border-b border-white/10 pb-4 md:pb-6 flex items-center gap-3 md:gap-4">
                   <Zap className="w-4 h-4 md:w-5 h-5 text-cyan-400 animate-pulse" />
                   Overwinning
                 </h3>
                 <div className="space-y-6 md:space-y-10">
                   <div className="space-y-2 md:space-y-3 group/win">
                     <p className="text-[9px] md:text-[11px] font-magic font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                       Sheriff en Deputy('s)
                     </p>
                     <p className="text-[11px] md:text-[13px] text-white/70 italic leading-relaxed pl-3 md:pl-4 border-l border-white/5">
                       Je wint als alle <span className="text-white font-bold tracking-widest">OUTLAWS</span> en de <span className="text-white font-bold tracking-widest">RENEGADE</span> zijn uitgeschakeld.
                     </p>
                   </div>
                   <div className="space-y-2 md:space-y-3 group/win">
                     <p className="text-[9px] md:text-[11px] font-magic font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Outlaws
                     </p>
                     <p className="text-[11px] md:text-[13px] text-white/70 italic leading-relaxed pl-3 md:pl-4 border-l border-white/5">
                       Je wint zodra de <span className="text-white font-bold tracking-widest">SHERIFF</span> dood is (tenzij de Renegade wint).
                     </p>
                   </div>
                   <div className="space-y-2 md:space-y-3 group/win border-t border-white/5 pt-6 md:pt-8">
                     <p className="text-[9px] md:text-[11px] font-magic font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                        Renegade
                     </p>
                     <p className="text-[11px] md:text-[13px] text-white/70 italic leading-relaxed pl-3 md:pl-4 border-l border-white/5">
                       Je wint als jij de <span className="text-white font-black tracking-widest">LAATSTE OVERLEVENDE</span> bent nadat de Sheriff is gedood.
                     </p>
                   </div>
                 </div>
               </div>

               {/* Elimination Order Section */}
               <div className="space-y-6 md:space-y-8 relative z-10 pt-2 md:pt-4">
                 <h3 className="text-lg md:text-2xl font-magic font-black text-white uppercase tracking-widest border-b border-white/10 pb-4 md:pb-6 flex items-center gap-3 md:gap-4">
                   <Skull className="w-4 h-4 md:w-5 h-5 text-red-500" />
                   Tactiek
                 </h3>
                 <div className="space-y-3 md:space-y-4">
                   {[
                     { label: "Pak de Outlaws", actor: "Sheriff & Deputy", desc: "Prioriteit: schakel de Outlaws uit." },
                     { label: "Dood de Sheriff", actor: "Outlaws", desc: "Snelste weg naar de overwinning." },
                     { label: "Houd de balans", actor: "Renegade", desc: "Zorg dat geen partij te sterk wordt." },
                     { label: "Het laatste duel", actor: "Renegade", desc: "Dood de Sheriff als allerlaatste." }
                   ].map((item, i) => (
                     <div key={i} className="group/item relative p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                       <div className="flex justify-between items-start mb-1 md:mb-2">
                         <span className="text-[7px] md:text-[9px] font-mono text-white/30 uppercase tracking-widest">{item.actor}</span>
                         <div className="w-1 h-1 bg-white/10 rounded-full" />
                       </div>
                       <h5 className="text-[10px] md:text-[13px] font-magic font-black text-white uppercase tracking-widest">{item.label}</h5>
                       <p className="text-[8px] md:text-[10px] text-white/40 italic">{item.desc}</p>
                     </div>
                   ))}
                 </div>
               </div>
            </motion.div>

          </div>
        </div>
        
        {/* Visual Footer Accents */}
        <div className="pt-10 md:pt-20 flex justify-center gap-6 md:gap-12 text-white/5 font-magic text-3xl md:text-6xl select-none">
          <span>ᛉ</span>
          <span>ᚦ</span>
          <span>ᚱ</span>
          <span>ᛗ</span>
        </div>
      </motion.div>
    </div>
  );
}

function ManaSpinner({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
      <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
      <div className="w-1/2 h-1/2 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.4),transparent)] rounded-full animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
      </div>
    </div>
  );
}

// Helper to get images from card
function getCardImages(card: any): {
  small: string;
  normal: string;
  border_crop: string;
  art_crop: string;
} {
  // Priority: Card Faces (Front) -> Root Image Uris
  const images = (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) 
    ? card.card_faces[0].image_uris 
    : (card.image_uris || {});
    
  return {
    small: images.small || "",
    normal: images.normal || "",
    border_crop: images.border_crop || "",
    art_crop: images.art_crop || "",
  };
}


