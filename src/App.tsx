/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
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
  Radio,
  Settings2,
  Brain,
  PieChart as PieChartIcon,
  Maximize2,
  Mail,
  Send,
  Share2,
  ArrowRight,
  Check,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
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
  Legend
} from 'recharts';
// import runesBackground from './assets/images/runes_background_1777929551380.png';
const runesBackground = "/runebg.png";

let cachedScryfallSets: any = null;
async function fetchScryfallSets() {
  if (cachedScryfallSets) return cachedScryfallSets;
  const res = await axios.get('https://api.scryfall.com/sets');
  cachedScryfallSets = res.data;
  return cachedScryfallSets;
}

const logo = "/runebear.png?v=" + new Date().getTime();
const logoUrl = "/runebg.png";

import { 
  ORANGE_ACCENT, 
  BG_DEEP, 
  PANEL_BG, 
  PANEL_BORDER, 
  FIELD_BG, 
  CARD_BG, 
  MANA_SYMBOL_URIS 
} from './constants';
import { db, auth, googleProvider } from './lib/firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  getDocFromServer,
  serverTimestamp,
  increment,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { Card, DeckCard, SavedDeck, ScryfallSet } from './types';


let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  } else {
    console.warn("GEMINI_API_KEY is mist. AI functies zullen niet werken tenzij je dit instelt als environment variable.");
  }
} catch (e) {
  console.error("Fout bij het initialiseren van Gemini AI:", e);
}

const BearIcon = PawPrint;

export default function App() {
  const [viewMode, setViewMode] = useState<'cards' | 'manage_decks' | 'sets' | 'calendar' | 'sheriff' | 'judge' | 'socials'>('cards');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminChamber, setShowAdminChamber] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const [tagToVerify, setTagToVerify] = useState<{
    deckId: string;
    tag: string;
    suggestions: string[];
    isAmbiguous: boolean;
    originalQuery: string;
    type?: 'oracle' | 'name' | 'mechanic' | 'other';
  } | null>(null);
  const [pendingTags, setPendingTags] = useState<Record<string, string[]>>({});

  // Performance and reliability for mobile
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Optional connection check (silent)
    async function checkConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        // Silently log for developers without alerting user
        console.debug("Firestore: Initial ping failed, might be offline or custom config required.", error.message);
      }
    }
    checkConnection();
  }, []);

  const saveUserSettings = async (updates: { userTitle?: string, cardsPerRow?: number, userName?: string, isPublic?: boolean }) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (updates.userTitle !== undefined) setUserTitle(updates.userTitle);
      if (updates.cardsPerRow !== undefined) setCardsPerRow(updates.cardsPerRow);
      if (updates.userName !== undefined) setUserName(updates.userName);
      if (updates.isPublic !== undefined) setIsPublic(updates.isPublic);
      showMessage("Settings updated", "success");
    } catch (err) {
      console.error("Failed to save settings", err);
      showMessage("Error updating settings", "error");
    }
  };
    const renderManaSymbols = (manaCost: any, size = 'w-4 h-4') => {
    if (!manaCost) return null;
    
    let symbols: string[] = [];
    
    if (Array.isArray(manaCost)) {
      symbols = manaCost.map(s => `{${String(s).toUpperCase()}}`);
    } else {
      let costString = String(manaCost).toUpperCase();
      // Normalize string: ensure it has {} around everything if it's raw text
      if (!costString.includes('{')) {
        costString = costString.replace(/(\d+)/g, '{$1}').replace(/([WUBRGCXTSP])/g, '{$1}');
      }
      symbols = costString.match(/\{[^}]+\}/g) || [];
    }

    // WUBRG Sorting Logic
    const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
    symbols.sort((a, b) => {
      const charA = a.replace(/\{|\}/g, '').charAt(0);
      const charB = b.replace(/\{|\}/g, '').charAt(0);
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
          let inner = sym.replace(/\{|\}/g, '').replace(/\//g, '').toUpperCase();
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

  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isSocialsLoading, setIsSocialsLoading] = useState(false);
  const [publicUsers, setPublicUsers] = useState<any[]>([]);
  const [viewingPublicDecks, setViewingPublicDecks] = useState<any[]>([]);
  const [viewingPublicUser, setViewingPublicUser] = useState<any>(null);
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (viewMode === 'socials') {
      const usersQuery = query(collection(db, 'users'), where('isPublic', '==', true));
      setIsSocialsLoading(true);
      getDocs(usersQuery).then(snap => {
        const users: any[] = [];
        snap.forEach(d => {
          if (d.id !== user?.uid) {
            users.push({ id: d.id, ...d.data() });
          }
        });
        setPublicUsers(users);
      }).finally(() => setIsSocialsLoading(false));

      if (user) {
        const sharedQuery = query(collection(db, 'sharedSelections'), where('toUserEmail', '==', user.email));
        onSnapshot(sharedQuery, (snap) => {
          const shared: any[] = [];
          snap.forEach(d => shared.push({ id: d.id, ...d.data() }));
          setSharedWithMe(shared);
        });
      }
    }
  }, [viewMode, user]);

  const shareSelection = async () => {
    if (!user || !shareRecipientEmail || deckbox.length === 0) return;
    setIsSharing(true);
    try {
      await setDoc(doc(collection(db, 'sharedSelections')), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        toUserEmail: shareRecipientEmail.toLowerCase().trim(),
        cards: deckbox,
        createdAt: serverTimestamp()
      });
      showMessage(`Sent to ${shareRecipientEmail}`, "success");
      setShowShareOverlay(false);
      setShareRecipientEmail("");
    } catch (e) {
      console.error(e);
      showMessage("Failed to share", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isBearSearch, setIsBearSearch] = useState(false);

  const searchSummary = useMemo(() => {
    if (allCards.length === 0 || !isBearSearch) return null;
    
    const colors: Record<string, number> = {};
    const types: Record<string, number> = {};
    
    allCards.forEach(card => {
      const id = card.color_identity || [];
      if (id.length === 0) {
        colors['C'] = (colors['C'] || 0) + 1;
      } else {
        id.forEach((c: string) => {
          colors[c] = (colors[c] || 0) + 1;
        });
      }
      
      const type = card.type_line?.split('—')[0].trim().split(' ')[0] || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return {
      total: allCards.length,
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]),
      types: Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [allCards]);
  const [deckbox, setDeckbox] = useState<DeckCard[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);

  const [mtgSets, setMtgSets] = useState<{code: string, name: string, icon_svg_uri?: string, isFuture: boolean, parent_set_code?: string, set_type?: string, released_at?: string}[]>([]);

  const DECK_ROLES = [
    { label: "Card Draw", query: 'o:"draw"' },
    { label: "Ramp", query: '(otag:ramp OR o:"search your library for a basic land")' },
    { label: "Single Removal", query: '(otag:removal OR o:"destroy target")' },
    { label: "Board Wipe", query: '(otag:board-wipe OR o:"destroy all")' },
    { label: "Tutor", query: 'otag:tutor' },
    { label: "Counterspell", query: '(otag:counterspell OR o:"counter target")' },
    { label: "Protection", query: '(otag:protection OR o:"hexproof")' },
    { label: "Graveyard Hate", query: '(otag:graveyard-hate OR o:"exile target card from a graveyard")' },
    { label: "Recursion", query: '(otag:recursion OR o:"return target card from your graveyard")' },
  ];

  const KNOWN_FUTURE_SETS = [
    { code: 'ltr', name: 'The Hobbit', released_at: '2023-06-23', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/ltr.svg' },
    { code: 'fdn', name: 'Foundations', released_at: '2024-11-15', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/fdn.svg' },
    { code: 'dft', name: 'Aetherdrift', released_at: '2025-02-14', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/dft.svg' },
    { code: 'tdb', name: 'Dragonstorm', released_at: '2025-04-11', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/tdb.svg' },
    { code: 'fin', name: 'Final Fantasy', released_at: '2025-06-01', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/fin.svg' }
  ];

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const data = await fetchScryfallSets();
        let sortedSets = data.data
          .filter((s: any) => 
            ['expansion', 'commander', 'core', 'masters', 'draft_innovation', 'funny', 'arsenal'].includes(s.set_type) && !s.digital && !s.name.toLowerCase().includes('omenpaths') && !s.name.toLowerCase().includes('pioneer')
          )
          .map((s: any) => ({ 
            code: s.code, 
            name: s.name, 
            icon_svg_uri: s.icon_svg_uri,
            released_at: s.released_at,
            set_type: s.set_type,
            parent_set_code: s.parent_set_code
          }));

        // Inject known future sets that might not be in Scryfall yet
        for (const known of KNOWN_FUTURE_SETS) {
          if (!sortedSets.find((s: any) => s.name.toLowerCase().includes(known.name.toLowerCase()))) {
            sortedSets.push(known);
          }
        }

        sortedSets = sortedSets.map((s: any) => ({
          ...s,
          isFuture: new Date(s.released_at) > new Date()
        })).sort((a: any, b: any) => {
          const dateA = new Date(a.released_at || '9999-12-31').getTime();
          const dateB = new Date(b.released_at || '9999-12-31').getTime();
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
    if (originalUri && originalUri.includes('scryfall.io')) return originalUri;
    // Fallback for missing symbols - can be expanded
    return `https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`;
  };

  const [cardsPerRow, setCardsPerRow] = useState<number>(0); // 0 means 'auto' (~220px)
  const [userTitle, setUserTitle] = useState("Deckmaster");
  const [userName, setUserName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- Auth & Firestore Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      
      if (u) {
        setIsAdmin(u.email === 'sdebeer@gmail.com');
        try {
          // Init profile
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.userTitle) setUserTitle(data.userTitle);
            if (data.userName) setUserName(data.userName);
            if (data.cardsPerRow !== undefined) setCardsPerRow(data.cardsPerRow);
            if (data.isPublic !== undefined) setIsPublic(data.isPublic);
          }

          await setDoc(userRef, {
            userId: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
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
    const decksQuery = collection(db, 'users', user.uid, 'decks');
    const unsubDecks = onSnapshot(decksQuery, (snapshot) => {
      const decks: SavedDeck[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        decks.push({
          ...(data as any),
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        } as SavedDeck);
      });
      setSavedDecks(decks);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/decks`));

    // Sync Deckbox
    const deckboxQuery = collection(db, 'users', user.uid, 'deckbox');
    const unsubDeckbox = onSnapshot(deckboxQuery, (snapshot) => {
      const items: DeckCard[] = [];
      snapshot.forEach(doc => items.push(doc.data() as DeckCard));
      setDeckbox(items);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/deckbox`));

    // Data Migration from LocalStorage
    const migrateData = async () => {
      const localDecks = localStorage.getItem('savedDecks');
      const localDeckbox = localStorage.getItem('deckbox');

      if (localDecks && localDecks !== "undefined") {
        try {
          const decks = JSON.parse(localDecks) as SavedDeck[];
          const batch = writeBatch(db);
          decks.forEach(d => {
            const deckRef = doc(db, 'users', user.uid, 'decks', d.id);
            batch.set(deckRef, {
              ...d,
              userId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          });
          await batch.commit();
          localStorage.removeItem('savedDecks');
          console.log("Migrated local decks to Firestore");
        } catch (e) { console.error("Migration failed for decks", e); }
      }

      if (localDeckbox && localDeckbox !== "undefined") {
        try {
          const items = JSON.parse(localDeckbox) as DeckCard[];
          const batch = writeBatch(db);
          items.forEach(item => {
            const cardId = item.name.replace(/[^a-zA-Z0-9]/g, '_');
            const cardRef = doc(db, 'users', user.uid, 'deckbox', cardId);
            batch.set(cardRef, { ...item, userId: user.uid }, { merge: true });
          });
          await batch.commit();
          localStorage.removeItem('deckbox');
          console.log("Migrated local deckbox to Firestore");
        } catch (e) { console.error("Migration failed for deckbox", e); }
      }
    };
    migrateData();

    return () => {
      unsubDecks();
      unsubDeckbox();
    };
  }, [user]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    console.log("Login process started...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login success:", result.user.email);
    } catch (error: any) {
      console.error("Detailed Login Error:", error);
      let errorMsg = error.message || error.code || "Onbekende fout";
      if (error.code === 'auth/popup-blocked') {
        errorMsg = "Popup geblokkeerd! Sta popups toe voor deze site.";
      }
      showMessage("Login mislukt: " + errorMsg, "error");
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
  const [commanderPreview, setCommanderPreview] = useState<any[] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [mobileCardsPerRow, setMobileCardsPerRow] = useState<1 | 2>(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [viewingDeckCards, setViewingDeckCards] = useState<any[] | null>(null);
  const [viewingDeckName, setViewingDeckName] = useState("");
  const [viewingDeckId, setViewingDeckId] = useState("");
  const [isViewingDeck, setIsViewingDeck] = useState(false);
  const [isAltCommandersOpen, setIsAltCommandersOpen] = useState(false);
  const [alternativeCommanders, setAlternativeCommanders] = useState<any[]>([]);
  const [zoomedAltCard, setZoomedAltCard] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState(0);
  const [hoveredPreviewCard, setHoveredPreviewCard] = useState<string | null>(null);
  const [hoveredPreviewPrice, setHoveredPreviewPrice] = useState<string | null>(null);

  const groupedDeckCards = useMemo(() => {
    if (!viewingDeckCards) return {};
    
    // Define ordering for groups
    const categoryOrder = ["Commanders", "Creatures", "Vanguards", "Instants", "Sorceries", "Enchantments", "Artifacts", "Lands", "Other"];
    const groups: { [key: string]: any[] } = {};
    categoryOrder.forEach(c => groups[c] = []);

    viewingDeckCards.forEach((dc: any) => {
      const c = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const type = (c?.type_line || "").toLowerCase();
      
      const isCommander = dc.categories?.some((cat: string) => cat.toLowerCase().includes('commander'));
      
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
    Object.keys(groups).forEach(key => {
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
    const hasSeenTutorial = localStorage.getItem('rune_tutorial_seen');
    if (!hasSeenTutorial && user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const closeTutorial = () => {
    setShowOnboarding(false);
    localStorage.setItem('rune_tutorial_seen', 'true');
  };
  const [existingInDeck, setExistingInDeck] = useState<Set<string>>(new Set());
  const [activeDeckCards, setActiveDeckCards] = useState<any[]>([]);
  const [commanders, setCommanders] = useState<{name: string, art_crop: string, isBackground?: boolean}[]>([]);
  const [currentCI, setCurrentCI] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // If we switch views away from search, clear the bear tech box
    if (viewMode !== 'search' && (viewMode as string) !== 'cards') {
      setIsBearSearch(false);
    }
  }, [viewMode]);
  
  // Browser History Sync
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.viewMode) {
        setViewMode(event.state.viewMode);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (window.history.state?.viewMode !== viewMode) {
      window.history.pushState({ viewMode }, '', '');
    }
  }, [viewMode]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [contextQuery, setContextQuery] = useState("");
  const [suggestedDecks, setSuggestedDecks] = useState<Set<string>>(new Set());
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

  const [copied, setCopied] = useState(false);

  // --- Effects ---

  // --- Auth ---
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
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

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    const jsonErr = JSON.stringify(errInfo);
    console.error('Firestore Error: ', jsonErr);
    throw new Error(jsonErr);
  };

  const [message, setMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
  const [commanderSelection, setCommanderSelection] = useState<{
    id: string;
    deckName: string;
    existingNames: string[];
    totalCost?: number;
    autoSelect: boolean;
    candidates: any[];
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const showMessage = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const getCardImages = (card: Card): any => {
    return card.image_uris || card.card_faces?.[0]?.image_uris || {};
  };

  const initializeDeckState = async (
    id: string, 
    deckName: string, 
    commanderNames: string[], 
    existingNames: Set<string>,
    totalCost?: number,
    autoSelect: boolean = true
  ) => {
    // If no commanders found, try to infer from existing names (look for legendary creatures)
    let finalCommanderNames = [...commanderNames];
    
    // Check if we need to ask the user
    if (finalCommanderNames.length === 0 && existingNames.size > 0) {
      const candidates = Array.from(existingNames)
        .filter(name => !!name && name.trim().length > 0)
        .slice(0, 75); // SCRYFALL LIMIT IS 75
      try {
        const identifiers = candidates.map(name => ({ name }));
        const { data: sfData } = await axios.post('https://api.scryfall.com/cards/collection', { identifiers });
        
        // Filter for cards that can be commanders
        const possibleCommanders = sfData.data.filter((c: any) => 
          c && !c.error && c.status !== 404 && c.type_line?.includes("Legendary") && 
          (c.type_line?.includes("Creature") || c.type_line?.includes("Planeswalker") || c.oracle_text?.includes("can be your commander"))
        );

        if (possibleCommanders.length > 0) {
          // If we found candidates, show the selection modal
          setCommanderSelection({
            id,
            deckName,
            existingNames: Array.from(existingNames),
            totalCost,
            autoSelect,
            candidates: possibleCommanders
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
            candidates: sfData.data.filter((c: any) => c && !c.error && c.status !== 404).slice(0, 50)
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
    await processDeckWithCommanders(id, deckName, finalCommanderNames, existingNames, totalCost, autoSelect);
  };

  const processDeckWithCommanders = async (
    id: string,
    deckName: string,
    finalCommanderNames: string[],
    existingNames: Set<string>,
    totalCost?: number,
    autoSelect: boolean = true
  ) => {
    // Fetch commander details for CI and images
    const commanderDetails = await Promise.all(
      finalCommanderNames.map(name => 
        axios.get(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
          .catch(err => {
            console.error(`Commander ${name} not found on Scryfall`, err);
            return { data: null };
          })
      )
    );

    const ciSet = new Set<string>();
    const commandersData: {name: string, art_crop: string, isBackground: boolean, scryfallData?: any}[] = [];

    commanderDetails.forEach((res, index) => {
      const c = res.data;
      if (!c) {
        commandersData.push({ 
          name: finalCommanderNames[index], 
          art_crop: "", 
          isBackground: false 
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
          scryfallData: c
        });
      }
    });

    // Sort commanders so Backgrounds are always last
    commandersData.sort((a, b) => (a.isBackground ? 1 : 0) - (b.isBackground ? 1 : 0));
    const sortedCommanderUrls = commandersData.map(c => c.art_crop).filter(url => !!url);
    const ciStr = Array.from(ciSet).sort().join("").toLowerCase() || "c";

    // If still no art crop, try to get one from the first card in existingNames
    let finalArtCrops = sortedCommanderUrls;
    if (finalArtCrops.length === 0 && existingNames.size > 0) {
      const firstCard = Array.from(existingNames)[0];
      try {
        const { data: cData } = await axios.get(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(firstCard)}`);
        const imgs = getCardImages(cData);
        if (imgs.art_crop) finalArtCrops = [imgs.art_crop];
      } catch (e) {
        // Ignore
      }
    }

    // Update saved decks in Firestore
    if (user) {
      const deckRef = doc(db, 'users', user.uid, 'decks', id);
      const existingSnap = await getDoc(deckRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      
      // Calculate ranking based on commander popularity or other metrics if available
      // For now, use Scryfall's edhrec_rank as a proxy if we have it
      let rank = existingData?.ranking || "N/A";
      if (commanderDetails[0]?.data?.edhrec_rank) {
        rank = `#${commanderDetails[0].data.edhrec_rank}`;
      }

      const deckData = {
        id,
        userId: user.uid,
        name: deckName,
        tags: existingData?.tags || [],
        commanders: finalCommanderNames,
        commanderNames: finalCommanderNames,
        existingNames: Array.from(existingNames), // Save card names for filtering
        art_crops: finalArtCrops,
        ci: ciStr,
        totalCost: totalCost || existingData?.totalCost || 0,
        ranking: rank,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(deckRef, deckData, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${id}`));
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
    performSearch({ ciOverride: ciStr, queryOverride: "", skipViewChange: !autoSelect });
  };

  const onSelectCommander = (selectedNames: string[]) => {
    if (!commanderSelection) return;
    const { id, deckName, existingNames, totalCost, autoSelect } = commanderSelection;
    setCommanderSelection(null);
    processDeckWithCommanders(id, deckName, selectedNames, new Set(existingNames), totalCost, autoSelect);
  };

  const fetchArchidektDeck = async (id: string, autoSelect: boolean = true) => {
    if (!id.trim()) return;
    setLoading(true);
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

        if (dc.categories?.some((cat: string) => cat.toLowerCase().includes("commander"))) {
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
        cardLists.forEach(n => qtyMap.set(n, (qtyMap.get(n) || 0) + 1));
        const commandersSet = new Set(commanderNames);

        for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
          const batchNames = uniqueNames.slice(i, i + BATCH_SIZE);
          const identifiers = batchNames.map(name => ({ name }));
          try {
            const { data: sfData } = await axios.post('https://api.scryfall.com/cards/collection', { identifiers });
            if (sfData && sfData.data) {
              sfData.data.forEach((card: any) => {
                if (card) {
                  const qty = qtyMap.get(card.name) || qtyMap.get(card.name.split(' // ')[0]) || 0;
                  const eurStr = card.prices?.eur || card.prices?.eur_foil;
                  if (eurStr) totalCost += parseFloat(eurStr) * qty;

                  fetchedCards.push({
                    card,
                    quantity: qty,
                    categories: Array.from(commandersSet).some(cn => cn.toLowerCase() === card.name.toLowerCase() || card.name.toLowerCase().startsWith(cn.toLowerCase())) ? ['Commander'] : []
                  });
                }
              });
            }
          } catch (e) {
            console.error("Batch fetch failed", e);
          }
        }
      }

      await initializeDeckState(id, deckName, commanderNames, existingNames, totalCost, autoSelect);
      // Removed setIsViewingDeck(true) to stay in context as requested
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to load deck from Archidekt";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTappedOutDeck = async (id: string, autoSelect: boolean = true) => {
    if (!id.trim()) return;
    setLoading(true);
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
          .replace(/\*CMDR\*/g, '')
          .replace(/\*F\*/g, '')
          .replace(/\*E\*/g, '')
          .replace(/\*A\*/g, '')
          .replace(/\*L\*/g, '')
          .replace(/\*B\*/g, '')
          .replace(/\*P\*/g, '')
          .replace(/\*S\*/g, '')
          .replace(/ \(F\)$/, '')
          .replace(/ \(V\.\d+\)$/, '')
          .trim();
      };

      if (rawText) {
        const lines = rawText.split('\n');
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;
          
          let cardName = cleanTappedOutName(trimmed);
          let isCommander = trimmed.includes('*CMDR*');
          let qty = 1;

          const match = cardName.match(/^(\d+)x?\s+(.+)$/);
          if (match) {
            qty = parseInt(match[1]);
            cardName = match[2].trim();
          }

          if (cardName) {
             existingNames.add(cardName);
             for(let i=0; i<qty; i++) cardLists.push(cardName);
             if (isCommander && !commanderNames.includes(cardName)) {
               commanderNames.push(cardName);
             }
          }
        });
      } else if (data.inventory) {
        data.inventory.forEach((item: any) => {
           let cardName = cleanTappedOutName(item.card?.oracleCard?.name || item.card?.name || item.name || "");
           if (!cardName) return;
           const qty = item.quantity || 1;
           existingNames.add(cardName);
           for(let i=0; i<qty; i++) cardLists.push(cardName);
           const cats = item.categories || [];
           if ((item.b === 'commander' || cats.some((c: string) => c.toLowerCase().includes('commander'))) && !commanderNames.includes(cardName)) {
             commanderNames.push(cardName);
           }
        });
      }

      // Fetch prices and card data for the viewer
      const fetchedCards: any[] = [];
      if (cardLists.length > 0) {
        try {
          const BATCH_SIZE = 75;
          const uniqueNames = Array.from(new Set(cardLists.map(n => n.split(' // ')[0])));
          const qtyMap = new Map();
          cardLists.forEach(n => {
            const clean = n.split(' // ')[0];
            qtyMap.set(clean, (qtyMap.get(clean) || 0) + 1);
          });

          const commandersSet = new Set(commanderNames);

          for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
            const batchNames = uniqueNames.slice(i, i + BATCH_SIZE);
            const identifiers = batchNames.map(name => ({ name }));
            const { data: sfData } = await axios.post('https://api.scryfall.com/cards/collection', { identifiers });
            if (sfData && sfData.data) {
              sfData.data.forEach((card: any) => {
                if (card) {
                  const qty = qtyMap.get(card.name) || qtyMap.get(card.name.split(' // ')[0]) || 0;
                  if (card.prices?.eur || card.prices?.eur_foil) {
                    totalCost += parseFloat(card.prices.eur || card.prices.eur_foil) * qty;
                  }
                  
                  fetchedCards.push({
                    card: card,
                    quantity: qty,
                    categories: Array.from(commandersSet).some(cn => cn.toLowerCase() === card.name.toLowerCase() || card.name.toLowerCase().startsWith(cn.toLowerCase())) ? ['Commander'] : []
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to calculate deck cost", e);
        }
      }

      await initializeDeckState(id, deckName, commanderNames, existingNames, totalCost, autoSelect);
      // Removed setIsViewingDeck(true) to stay in context as requested
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to load deck from TappedOut";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnyDeck = async (input: string, autoSelect: boolean = true) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Detect if URL or direct ID
    const ids = trimmed.split(/[;,]/).map(s => s.trim()).filter(s => s);
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
      } else {
        // If no url, detect by format: Archidekt IDs are usually numeric
        if (/^\d+$/.test(deckId)) {
          source = "archidekt";
        } else {
          source = "tappedout";
        }
      }

      if (source === "archidekt") {
        await fetchArchidektDeck(deckId, autoSelect);
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
      setGlowIndex(prev => (prev + 1) % 10); // Slower cycle for 5 mana + 5 runes
    }, 5000); // 5 seconds per step
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSymbol(prev => (prev + 1) % 9);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const findAlternativeCommanders = async () => {
    if (!viewingDeckCards) return;
    
    // 1. Identify current CI
    const currentCommanders = viewingDeckCards.filter(dc => 
      dc.categories?.some((cat: string) => cat.toLowerCase().includes('commander'))
    );
    
    if (currentCommanders.length === 0) {
      showMessage("COMMANDER UNKNOWN - CI ANALYSIS RESTRICTED", "error");
      return;
    }

    const commanderColors = new Set<string>();
    currentCommanders.forEach(dc => {
      const colors = (dc.card?.scryfallData?.color_identity || dc.card?.oracleCard?.color_identity || dc.card?.color_identity || []);
      colors.forEach((col: string) => commanderColors.add(col));
    });

    const ciString = Array.from(commanderColors).join('').toLowerCase() || 'c';

    // 2. Multiverse Pulse: Search Scryfall for all relevant legends in these exact colors
    try {
      setLoading(true);
      // Query: Find legendary creatures with the exact same color identity OR partners that can fit
      const query = `f:commander t:legendary t:creature (id=${ciString} or (is:partner id<${ciString}))`;
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec`);
      const data = await response.json();
      
      if (data.data) {
        setAlternativeCommanders(data.data.map((c: any) => ({ card: c })));
        setIsAltCommandersOpen(true);
        showMessage(`${data.data.length} MULTIVERSE LEADERS DISCOVERED`, "success");
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
    setViewMode('cards');
    setHasSearched(false);
    setAllCards([]);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleFunModeClick = (mode: 'sets' | 'calendar' | 'sheriff' | 'judge') => {
    clearDeckSelection();
    setViewMode(mode);
    setSearchQuery("");
    setContextQuery("");
    setTypeFilters([]);
    setRarityFilters([]);
    setSetFilter("Any");
    setColorFilters([]);
    setArchFilter("Any");
  };

  const performSearch = async (options?: { 
    queryOverride?: string, 
    ciOverride?: string,
    typeOverride?: string,
    typesOverride?: string[],
    rarityOverride?: string,
    raritiesOverride?: string[],
    setOverride?: string,
    colorOverride?: string,
    colorsOverride?: string[],
    archOverride?: string,
    orderOverride?: string,
    dirOverride?: string,
    skipCI?: boolean,
    skipViewChange?: boolean,
    skipFormatFilters?: boolean,
    isBearActivation?: boolean
  }) => {
    setLoading(true);
    setHasSearched(true);
    setIsBearSearch(options?.isBearActivation || false);
    try {
      // Resolve Parameters
      let ci = options?.ciOverride !== undefined ? options.ciOverride : (activeDeckId ? currentCI : "Any");
      let order = options?.orderOverride !== undefined ? options.orderOverride : sortBy;
      let dir = options?.dirOverride !== undefined ? options.dirOverride : sortDir;
      
      // Hard restriction: If a deck is selected, results MUST fall within its color identity
      // unless we are explicitly doing a global search (skipCI: true)
      // prioritize ciOverride if provided
      if (options?.ciOverride === undefined && activeDeckId && currentCI && !options?.skipCI) {
        ci = currentCI;
      } else if (!activeDeckId && options?.ciOverride === undefined) {
        // No deck selected and no specific override: search ALL colors
        ci = "Any";
      }

      // 2. Build Query
      let queryParts: string[] = [];

      // System / Format Filters
      if (!options?.skipFormatFilters) {
        queryParts.push("(-is:digital OR is:paper)", "-is:funny", "include:extras");
      }
      
      // Universal Exclusions - ALWAYS exclude tokens and emblems
      queryParts.push("-is:token", "-t:token", "-t:emblem", "-is:art_series");

      // Color Identity Enforcement
      if (ci && ci !== "Any" && !options?.skipCI) {
        queryParts.push(`id<=${ci}`);
      }

      let types = options?.typesOverride !== undefined ? options.typesOverride : (options?.typeOverride !== undefined ? [options.typeOverride] : typeFilters);
      let rarities = options?.raritiesOverride !== undefined ? options.raritiesOverride : (options?.rarityOverride !== undefined ? [options.rarityOverride] : rarityFilters);
      let set = options?.setOverride !== undefined ? options.setOverride : setFilter;
      let colors = options?.colorsOverride !== undefined ? options.colorsOverride : (options?.colorOverride !== undefined ? [options.colorOverride] : colorFilters);
      let arch = options?.archOverride !== undefined ? options.archOverride : archFilter;

      // If a specific queryOverride is provided, we assume a fresh search and clear context
      let activeContext = options?.queryOverride !== undefined ? options.queryOverride : (contextQuery || "");
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
        if (options.queryOverride === "" || options.queryOverride !== contextQuery) {
          types = options.typesOverride !== undefined ? options.typesOverride : 
                (options.typeOverride !== undefined ? [options.typeOverride] : []);
          rarities = options.raritiesOverride !== undefined ? options.raritiesOverride : 
                  (options.rarityOverride !== undefined ? [options.rarityOverride] : []);
          set = options.setOverride !== undefined ? options.setOverride : "Any";
          colors = options.colorsOverride !== undefined ? options.colorsOverride : 
                 (options.colorOverride !== undefined ? [options.colorOverride] : []);
          arch = options.archOverride !== undefined ? options.archOverride : "Any";
          
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
        queryParts.push(`(${types.map(t => `t:${t}`).join(" OR ")})`);
      }
      if (rarities.length > 0) {
        queryParts.push(`(${rarities.map(r => `r:${r}`).join(" OR ")})`);
      }
      if (set !== "Any") queryParts.push(`s:${set}`);
      if (colors.length > 0) {
        const colorQueries = colors.map(colorChar => {
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
        const role = DECK_ROLES.find(r => r.label === arch);
        if (role) queryParts.push(`(${role.query})`);
      }

      // User Input / Context 
      let userLogic: string[] = [];
      if (activeContext) {
        userLogic.push(`(${activeContext})`);
      }
      
      const effectiveSearch = (options?.queryOverride !== undefined && options.queryOverride !== "") ? "" : searchQuery;

      if (effectiveSearch.trim()) {
        // Expand search to be more inclusive as requested
        userLogic.push(`("${effectiveSearch}" OR name:"${effectiveSearch}" OR o:"${effectiveSearch}" OR t:"${effectiveSearch}")`);
      }

      if (userLogic.length > 0) {
        queryParts.push(`(${userLogic.join(" ")})`);
      }

      const query = queryParts.join(" ");

      // Use unique=cards to get distinct cards, or unique=prints if we want variants
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=${order}&dir=${dir}&unique=cards`;
      console.log("Searching Scryfall:", url);
      const { data } = await axios.get(url);
      setAllCards(data.data || []);
      
      if (!options?.skipViewChange) {
        setViewMode('cards');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAllCards([]);
        // We don't necessarily want to show an "Error" for 404 if it's just no results
      } else {
        if (err.response?.status === 400) {
          console.warn("Scryfall rejected search query with 400 Bad Request:", query, err.response?.data);
          setAllCards([]);
        } else {
          console.error("Search failed", err);
          showMessage("Search failed: " + (err.response?.data?.details || err.message), 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCardSelection = async (card: Card) => {
    if (!user) return showMessage("Please login to manage your deckbox.");
    
    const isSelected = deckbox.find(c => c.name === card.name);
    const cardId = card.name.replace(/[^a-zA-Z0-9]/g, '_');
    const cardRef = doc(db, 'users', user.uid, 'deckbox', cardId);

    if (isSelected) {
      await deleteDoc(cardRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/deckbox/${cardId}`));
    } else {
      const images: any = getCardImages(card);
      const newCard = {
        userId: user.uid,
        name: card.name,
        thumb: images.small || "",
        highRes: images.normal || images.large || "",
        from_deck: activeDeckName || "Manual",
        qty: 1,
        prices: card.prices || {}
      };
      await setDoc(cardRef, newCard).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/deckbox/${cardId}`));
    }
  };

  const updateCardQty = async (name: string, delta: number) => {
    if (!user) return;
    const cardId = name.replace(/[^a-zA-Z0-9]/g, '_');
    const cardRef = doc(db, 'users', user.uid, 'deckbox', cardId);
    const item = deckbox.find(c => c.name === name);
    if (!item) return;

    const newQty = Math.max(0, item.qty + delta);
    if (newQty === 0) {
      await deleteDoc(cardRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/deckbox/${cardId}`));
    } else {
      await updateDoc(cardRef, { qty: newQty }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/deckbox/${cardId}`));
    }
  };

  const copyDecklist = async () => {
    if (deckbox.length === 0) return;
    const list = deckbox.map(c => `${c.qty} ${c.name}`).join("\n");
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
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  const deleteSavedDeck = async (id: string) => {
    if (!user) return;
    const deckRef = doc(db, 'users', user.uid, 'decks', id);
    await deleteDoc(deckRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/decks/${id}`));
    if (activeDeckId === id) setActiveDeckId(null);
    setDeckToDelete(null);
  };

  const viewDeckDetails = async (id: string, source?: string) => {
    setLoading(true);
    try {
      if (!source) {
        source = /^\d+$/.test(id) ? "archidekt" : "tappedout";
      }

      let parsedCards: any[] = [];
      let deckName = "Deck List";

      if (source === "tappedout") {
        const { data } = await axios.get(`/api/to/${id}`);
        if (data.error) throw new Error(data.error);

        deckName = data.deckName || data.name || `TappedOut Deck ${id}`;
        
        if (data.rawText) {
          const lines = data.rawText.split('\n');
          const cards: any[] = [];
          lines.forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;
            
            let cardName = trimmed;
            let qty = 1;

            if (cardName.includes('Sideboard:')) return; 

            // Improve quantity and name matching
            // Match formats like "1x Card Name" or "1 Card Name"
            const match = cardName.match(/^(\d+)x?\s+(.+)$/i);
            if (match) {
              qty = parseInt(match[1]);
              cardName = match[2].trim();
            }

            // Remove TappedOut specific markers
            cardName = cardName.replace(/\*CMDR\*/g, '').trim();
            cardName = cardName.replace(/\*F\*/g, '').trim(); // Foil
            cardName = cardName.replace(/\*A\*/g, '').trim(); // Altered
            cardName = cardName.split(' #')[0].trim(); // Card tags like #Bear

            if (cardName) {
               cards.push({ card: { oracleCard: { name: cardName } }, quantity: qty });
            }
          });
          parsedCards = cards;
        } else if (data.inventory) {
          // If inventory already comes in the correct format (e.g. from our proxy's HTML scraping)
          parsedCards = data.inventory.filter((item: any) => {
             const categories = (item.categories || []).map((cat: string) => cat.toLowerCase());
             return !categories.includes('sideboard') && !categories.includes('maybeboard');
          }).map((item: any) => ({
             ...item,
             card: item.card || { oracleCard: { name: item.name } }
          }));
        }
      } else {
        const { data } = await axios.get(`/api/ad/${id}`);
        const cards = data.cards || (data.data && data.data.cards);
        
        if (!cards) {
          throw new Error("No cards found in deck response");
        }
        
        // More robust filtering
        parsedCards = cards.filter((dc: any) => {
          const categories = (dc.categories || []).map((cat: any) => 
            typeof cat === 'string' ? cat.toLowerCase() : cat
          );
          return !categories.includes("sideboard") && !categories.includes("maybeboard");
        });
        deckName = data.name || "Deck List";
      }
      
      // Batch fetch missing images from Scryfall
      const cardsWithoutImages = parsedCards.filter(c => {
         const scryfallId = c.card?.scryfall_id || c.card?.scryfallId || c.card?.uids?.scryfall || c.card?.scryfallData?.id || c.card?.scryfall_data?.id;
         const sfData = c.card?.scryfallData || c.card?.scryfall_data;
         const img = c.card?.edition?.imageUrl || c.card?.edition?.image_url || sfData?.image_uris?.normal || sfData?.image_uris?.large || sfData?.imageUris?.normal;
         return !img && !scryfallId;
      });

      if (cardsWithoutImages.length > 0) {
        try {
          const BATCH_SIZE = 75;
          const namesToFetch = Array.from(new Set(cardsWithoutImages.map(c => (c.card?.oracleCard?.name || c.card?.name || "").split(' // ')[0]).filter(Boolean))) as string[];
          const sfMap = new Map();
          
          for(let i = 0; i < namesToFetch.length; i += BATCH_SIZE) {
             const batch = namesToFetch.slice(i, i + BATCH_SIZE);
             const identifiers = batch.map(name => ({ name }));
             const { data: sfData } = await axios.post('https://api.scryfall.com/cards/collection', { identifiers });
             if (sfData && sfData.data) {
               sfData.data.forEach((sfCard: any) => {
                  if (sfCard && sfCard.name) {
                    sfMap.set(sfCard.name.toLowerCase(), sfCard);
                    if (sfCard.name.includes(' // ')) {
                       sfMap.set(sfCard.name.split(' // ')[0].toLowerCase(), sfCard);
                    }
                  }
               });
             }
             if (i + BATCH_SIZE < namesToFetch.length) await new Promise(r => setTimeout(r, 100));
          }
          
          parsedCards = parsedCards.map(c => {
             const name = (c.card?.oracleCard?.name || c.card?.name || "").toLowerCase();
             const cleanName = name.split(' // ')[0];
             const sfCard = sfMap.get(name) || sfMap.get(cleanName);
             if (sfCard) {
               return {
                 ...c,
                 card: {
                   ...c.card,
                   scryfallData: sfCard
                 }
               }
             }
             return c;
          });
        } catch(e) {
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

    const deck = savedDecks.find(d => d.id === deckId);
    if (!deck) return;

    // Provide instant visual feedback
    setPendingTags(prev => ({
      ...prev,
      [deckId]: [...(prev[deckId] || []), tag]
    }));

    if (!tag.includes(':::') && !tag.includes(':') && !tag.includes('=')) {
      try {
        let q = tag;
        let analysis: any = null;
        
        if (ai) {
          const prompt = `Analyze MTG concept "${tag}" for color identity ${deck.ci || 'c'}. 
          Category: name, mechanic, oracle, or other?
          Convert to valid Scryfall search string.
          If 0 results likely or ambiguous, suggest 3 alternatives.
          Return ONLY JSON: { "type": "name"|"mechanic"|"oracle"|"other", "query": "...", "suggestions": ["...", "..."], "isAmbiguous": boolean }`;
          
          const res = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          analysis = JSON.parse(res.text || '{}');
          q = analysis.query || tag;
        }

        const testQuery = `(${q}) id:${deck.ci || 'c'}`;
        let resultsCount = 0;
        try {
          const scryRes = await axios.get(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(testQuery)}`);
          resultsCount = scryRes.data.total_cards;
        } catch(e) {}

        if (resultsCount === 0 || (analysis && analysis.isAmbiguous)) {
          setTagToVerify({
            deckId,
            tag,
            suggestions: analysis?.suggestions || [],
            isAmbiguous: analysis?.isAmbiguous || false,
            originalQuery: q,
            type: analysis?.type
          });
          
          // Remove from pending as it needs user decision
          setPendingTags(prev => ({
            ...prev,
            [deckId]: (prev[deckId] || []).filter(t => t !== tag)
          }));
          return;
        }
        
        const finalEntry = `${tag}:::${q}`;
        const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
        const exists = (deck.tags || []).some(t => t.toLowerCase().startsWith(tag.toLowerCase() + ':::') || t === finalEntry);
        
        if (!exists) {
          await updateDoc(deckRef, {
            tags: arrayUnion(finalEntry),
            updatedAt: serverTimestamp()
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
        }

        // Cleanup pending
        setPendingTags(prev => ({
          ...prev,
          [deckId]: (prev[deckId] || []).filter(t => t !== tag)
        }));
      } catch (e) {
        console.error("Tag verification error", e);
        const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
        await updateDoc(deckRef, {
          tags: arrayUnion(`${tag}:::${tag}`),
          updatedAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
        
        setPendingTags(prev => ({
          ...prev,
          [deckId]: (prev[deckId] || []).filter(t => t !== tag)
        }));
      }
    } else {
      const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
      await updateDoc(deckRef, {
        tags: arrayUnion(tag),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
      
      setPendingTags(prev => ({
        ...prev,
        [deckId]: (prev[deckId] || []).filter(t => t !== tag)
      }));
    }
  };

  const finalizeTag = async (deckId: string, tag: string, query: string) => {
    if (!user) return;
    const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
    await updateDoc(deckRef, {
      tags: arrayUnion(`${tag}:::${query}`),
      updatedAt: serverTimestamp()
    }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
    setTagToVerify(null);
    setPendingTags(prev => ({
      ...prev,
      [deckId]: (prev[deckId] || []).filter(t => t !== tag)
    }));
  };


  const removeTag = async (deckId: string, tag: string) => {
    if (!user) return;
    const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
    const deck = savedDecks.find(d => d.id === deckId);
    if (deck) {
      await updateDoc(deckRef, { 
        tags: deck.tags.filter(t => t !== tag),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
    }
  };

  // --- Render Helpers ---
  const autoAddCommanderTags = async (deckId: string, commanderNames: string[]) => {
    try {
      if (!commanderNames || commanderNames.length === 0) return;
      
      const validNames = commanderNames.filter(n => !n.startsWith('http'));
      if (validNames.length === 0) {
        showMessage("Legacy deck detected. Please reload this deck first.");
        return;
      }
      
      setLoading(true);
      
      // Fetch card details for all commanders
      const cardData = await Promise.all(
        validNames.map(name => 
          axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
            .then(r => r.data)
            .catch(() => null)
        )
      );
      
      const deck = savedDecks.find(d => d.id === deckId);
      const existingTags = deck?.tags || [];

      const commandersInfo = cardData
        .filter(c => c !== null)
        .map(c => `Commander: ${c.name}\nType: ${c.type_line}\nOracle: ${c.oracle_text}`)
        .join('\n\n');

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
4. Do not include existing tags: ${existingTags.map(t => t.split(':::')[0]).join(', ')}

Return ONLY JSON. No markdown backticks.`;

      if (!ai) {
        showMessage("No Gemini API Key available. Configuration error.", "error");
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      let jsonStr = (response.text || "").replace(/```json/g, '').replace(/```/g, '').trim();
      if (!jsonStr || jsonStr === "undefined") {
        throw new Error("AI returned invalid JSON: empty or undefined");
      }
      let parsed = [];
      try {
        parsed = JSON.parse(jsonStr);
      } catch(e) {
        throw new Error("Ongeldige JSON van AI");
      }

      const validTags = [];
      for (const item of parsed) {
        if (!item.label || !item.query) continue;
        
        // Test query against Scryfall
        const testQuery = `(${item.query}) id:${deck?.ci || 'c'}`;
        try {
          // Delay to prevent rate limiting
          await new Promise(r => setTimeout(r, 100));
          const res = await axios.get(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(testQuery)}`);
          if (res.data.total_cards > 0) {
            validTags.push(`${item.label}:::${item.query}`);
          }
        } catch(e: any) {
          // Ignore 404s (no cards found)
        }
      }

      if (validTags.length === 0) {
         showMessage("Magic failed: No valid tags yielded results.");
         return;
      }
      
      if (user) {
        const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
        const combined = Array.from(new Set([...existingTags, ...validTags]));
        await updateDoc(deckRef, { 
          tags: combined,
          updatedAt: serverTimestamp() 
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
      }
      
      setSuggestedDecks(prev => new Set(prev).add(deckId));
      showMessage(`Magic complete! Added ${validTags.length} valid suggestions.`);
    } catch (err: any) {
      console.error("Failed to fetch commander for tags", err);
      let msg = err.message || "Unknown error";
      if (msg.includes("API key expired")) {
        msg = "API key expired. Vernieuw je Gemini API key in de instellingen.";
      }
      showMessage(`Magic failed: ${msg}`);
    } finally {
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
    const symbols = ['w', 'u', 'b', 'r', 'g'];
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
                transform: 'translate(-50%, -50%)'
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
          <p className="text-white/20 font-magic tracking-widest text-xs animate-pulse italic">Loading...</p>
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
            The quickest way to find new power for your Commander decks. Discover which fresh releases have the perfect synergy for your favorite strategies.
          </p>

          <button 
            onClick={login}
            disabled={isLoggingIn}
            className={`w-full flex items-center justify-center gap-3 py-4 rune-panel text-orange-500/80 hover:text-orange-500 hover:border-orange-500/30 transition-all font-magic font-black active:scale-[0.98] tracking-widest text-[10px] z-10 ${isLoggingIn ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isLoggingIn ? (
              <span className="animate-pulse">signing in...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#070707]/90 backdrop-blur-3xl border-b border-white/[0.04] z-[120] flex items-center justify-between px-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goHome}>
          <Zap className="w-5 h-5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <h1 className="text-[10px] font-magic font-black uppercase tracking-[0.3em] text-white">Version <span className="text-orange-500">3.5</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'cards' && (
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`p-2 transition-colors ${isFiltersOpen ? 'text-cyan-400' : 'text-white/40 hover:text-orange-500'}`}
            >
              <Filter className="w-6 h-6" />
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white/40 hover:text-orange-500 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-7 h-7 text-orange-500" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        id="sidebar-root"
        className={`
        fixed inset-y-0 left-0 z-[100] w-[300px] bg-[#0c0c0c] border-r-2 border-[#1a1a1a] shadow-[4px_0_24px_rgba(0,0,0,0.8)] flex flex-col shrink-0 transition-transform duration-500 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
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
            <h1 className="text-2xl font-magic font-extrabold text-white tracking-tighter text-center leading-none uppercase">Rune Deck <br/> <span className="text-lg opacity-80 uppercase tracking-widest text-orange-500/80">Companion</span></h1>
          </div>
          <p className="text-[9px] text-orange-500/60 uppercase tracking-[0.4em] font-bold mt-2">Quick add tech</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pl-10 space-y-6">

            {/* Section 1: Search Fields */}
            <section className="space-y-4">

            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Database className="w-3 h-3 text-orange-500" />
                <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Decks</h2>
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
                  setViewMode('manage_decks');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl transition-all group shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                title="Manage Decks"
              >
                <Settings2 className="w-4.5 h-4.5 text-cyan-400/60 group-hover:text-cyan-400 group-hover:rotate-90 transition-all" />
                <span className="text-[10px] font-magic font-black text-cyan-400/40 group-hover:text-cyan-400 uppercase tracking-widest">Library</span>
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="relative group">
                {savedDecks.length === 0 ? (
                   <button 
                     onClick={() => {
                        const message = "You must add or import a deck first!";
                        const errEl = document.createElement('div');
                        errEl.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-white/20 backdrop-blur-md z-[1000]';
                        errEl.innerText = message;
                        document.body.appendChild(errEl);
                        setTimeout(() => errEl.remove(), 4000);
                        
                        const manageBtn = document.getElementById('manage-decks-btn');
                        if (manageBtn) {
                           manageBtn.classList.add('ring-4', 'ring-cyan-500', 'animate-pulse', 'bg-cyan-500/20');
                           setTimeout(() => manageBtn.classList.remove('ring-4', 'ring-cyan-500', 'animate-pulse', 'bg-cyan-500/20'), 3000);
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
                      if (!deckId) {
                        clearDeckSelection();
                        performSearch({ queryOverride: "" });
                        return;
                      }
                      const deck = savedDecks.find(d => d.id === deckId);
                      if (deck) {
                        setActiveDeckId(deck.id);
                        setActiveDeckName(deck.name);
                        setExistingInDeck(new Set(deck.existingNames));
                        setCurrentCI(deck.ci || "");
                        setViewMode('cards');
                        performSearch({ ciOverride: deck.ci || "", queryOverride: "" });
                        const cmdNames = deck.commanderNames || deck.commanders || [];
                        initializeDeckState(deck.id, deck.name, cmdNames, new Set(deck.existingNames), deck.totalCost || 0, true);
                      }
                    }}
                    value={activeDeckId || ""}
                  >
                    <option value="" className="bg-[#0A0A0A]">Select a Deck...</option>
                    {savedDecks.map(deck => (
                      <option key={deck.id} value={deck.id} className="bg-[#0A0A0A]">{deck.name}</option>
                    ))}
                  </select>
                )}
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 pointer-events-none group-hover:text-cyan-400 transition-colors z-20" />
              </div>

              {activeDeckId && commanders.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setCommanderPreview(commanders)}
                  className="relative h-28 rounded-xl overflow-hidden border border-white/5 bg-black/40 cursor-pointer group hover:border-orange-500/30 transition-all mt-2"
                >
                  <div className="flex w-full h-full">
                    {commanders.map((cmd, i) => (
                      <div key={i} className="flex-1 relative overflow-hidden group">
                        <img 
                          src={cmd.art_crop || 'https://cards.scryfall.io/art_crop/front/3/b/3b19e4a3-764c-474d-9ac3-818617d12f3e.jpg'} 
                          alt={cmd.name} 
                          className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-1000" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                           <span className="text-[7px] font-magic font-extrabold text-white/40 uppercase tracking-tighter truncate">{cmd.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-black/60 px-2 py-1 rounded-full border border-white/10 backdrop-blur-md">
                       {renderManaSymbols(currentCI, 'w-3 h-3')}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-md">
                       <Zap className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>


            
            {/* Section 4: Search & Filters (Unified) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-orange-500" />
                  <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Search Engine</h2>
                </div>
              </div>

              {activeDeckId && (
                <button 
                  onClick={() => {
                    const deck = savedDecks.find(d => d.id === activeDeckId);
                    if (!deck || !deck.tags || deck.tags.length === 0) {
                      showMessage("No synergy tags found. Initiate 'Generate Tags' at your deck profile first.", "info");
                      return;
                    }
                    const tagQuery = "(" + deck.tags.map(t => t.includes(':::') ? t.split(':::').slice(1).join(':::') : `o:"${t}" OR t:"${t}"`).join(") OR (") + ")";
                    setViewMode('cards');
                    performSearch({ 
                      queryOverride: tagQuery, 
                      ciOverride: deck.ci || currentCI || "c", 
                      skipCI: false,
                      skipFormatFilters: false
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rune-panel text-cyan-500/80 hover:text-cyan-400 hover:border-cyan-500/30 font-black text-[10px] transition-all font-magic uppercase tracking-[0.3em] active:scale-[0.98] z-10"
                >
                  <Zap className="w-4 h-4" />
                  Tag Based Search
                </button>
              )}

              <div className="relative group">
                <select
                  value={archFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setArchFilter(val);
                    setSearchQuery("");
                    setViewMode('cards');
                    performSearch({ 
                      queryOverride: "", 
                      archOverride: val,
                      ciOverride: currentCI || "",
                      skipFormatFilters: false
                    });
                  }}
                  className="w-full appearance-none rune-panel rounded-sm px-4 py-2.5 text-[8px] font-magic font-black uppercase tracking-[0.2em] text-white/50 outline-none focus:border-cyan-500/50 hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                >
                  <option value="Any" className="bg-[#0A0A0A]">Veggie Search</option>
                  {DECK_ROLES.map(r => (
                    <option key={r.label} value={r.label} className="bg-[#0A0A0A]">{r.label}</option>
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
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === 'NumpadEnter') && performSearch({ queryOverride: "" })}
                />
                <button 
                  onClick={() => performSearch({ queryOverride: "" })}
                  className="rune-panel px-4 py-2.5 flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all z-10"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Integrated Filters Section - Visible always if results or viewing cards */}
              {(allCards.length > 0 || viewMode === 'cards') && (
                <div className="pt-4 border-t border-white/5 mt-4">
                  <button 
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="w-full flex items-center justify-between mb-2 group"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className={`w-3 h-3 ${isFiltersExpanded ? 'text-cyan-400' : 'text-cyan-400/40'}`} />
                      <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Live Filters</h2>
                    </div>
                    <div className={`transition-transform duration-300 ${isFiltersExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-cyan-400" />
                    </div>
                  </button>
                  
                  {isFiltersExpanded && (
                    <div className="space-y-4 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">Category</span>
                        <div className="flex flex-wrap gap-1">
                          {['Creature', 'Sorcery', 'Instant', 'Artifact', 'Enchantment', 'Land', 'Planeswalker'].map(t => (
                            <button
                              key={t}
                              onClick={() => {
                                const next = typeFilters.includes(t) ? typeFilters.filter(f => f !== t) : [...typeFilters, t];
                                setTypeFilters(next);
                                performSearch({ typesOverride: next });
                              }}
                              className={`px-2 py-1 rounded-sm text-[8px] font-magic font-bold uppercase transition-all border ${
                                typeFilters.includes(t) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">Rarity</span>
                        <div className="flex flex-wrap gap-1">
                          {['common', 'uncommon', 'rare', 'mythic'].map(r => (
                            <button
                              key={r}
                              onClick={() => {
                                const next = rarityFilters.includes(r) ? rarityFilters.filter(f => f !== r) : [...rarityFilters, r];
                                setRarityFilters(next);
                                performSearch({ raritiesOverride: next });
                              }}
                              className={`px-2 py-1 rounded-sm text-[8px] font-magic font-bold uppercase transition-all border ${
                                rarityFilters.includes(r) ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">Identity</span>
                        <div className="flex flex-wrap gap-1">
                          {['W', 'U', 'B', 'R', 'G', 'C', 'M'].map(c => (
                            <button
                              key={c}
                              onClick={() => {
                                const next = colorFilters.includes(c) ? colorFilters.filter(f => f !== c) : [...colorFilters, c];
                                setColorFilters(next);
                                performSearch({ colorsOverride: next });
                              }}
                              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
                                colorFilters.includes(c) ? 'bg-white/20 border-white text-white' : 'bg-white/5 border-white/5 text-white/20 hover:text-white/60'
                              }`}
                            >
                              {['W','U','B','R','G'].includes(c) ? (
                                <img src={MANA_SYMBOL_URIS[`{${c}}`]} className="w-4 h-4" alt={c} />
                              ) : (
                                <span className="text-[10px] font-magic font-bold">{c === 'C' ? '♢' : '★'}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-2">
                         <div className="space-y-1">
                           <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">Sort Order</span>
                           <select 
                             value={sortBy} 
                             onChange={(e) => { setSortBy(e.target.value); performSearch({ orderOverride: e.target.value }); }}
                             className="w-full bg-black/60 border border-white/5 rounded-sm px-2 py-2 text-[10px] outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-white/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                           >
                             <option value="released">Release Date</option>
                             <option value="name">Name (A-Z)</option>
                             <option value="eur">Value (EUR)</option>
                             <option value="cmc">Mana Value</option>
                             <option value="rarity">Rarity Rank</option>
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
                    <span className="text-[11px] font-magic font-black text-white uppercase tracking-widest">Selections</span>
                  </div>
                  {deckbox.length > 0 && (
                    <span className="text-xs font-mono font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{deckbox.length}</span>
                  )}
                </button>
              </div>
            </section>
          </section>

          {/* Section 5: Fun Area */}
          <section className="space-y-2">
             <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Moon className="w-3 h-3 text-orange-500" />
                <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Fun Area</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 grid-rows-3">
              <button 
                onClick={() => handleFunModeClick('sets')}
                className="flex flex-col items-center justify-center py-2 rune-panel text-white/40 hover:text-cyan-400 font-magic hover:border-cyan-500/30 transition-all group z-10 gap-1 rounded-sm"
              >
                <Library className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none">Sets</span>
              </button>
              <button 
                onClick={() => handleFunModeClick('calendar')}
                className="flex flex-col items-center justify-center py-2 rune-panel text-white/40 hover:text-orange-500 font-magic hover:border-orange-500/30 transition-all group z-10 gap-1 rounded-sm"
              >
                <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform text-orange-500/80 group-hover:text-orange-500" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none text-orange-500/80 group-hover:text-orange-500">Calendar</span>
              </button>
              <button 
                onClick={() => handleFunModeClick('sheriff')}
                className="flex flex-col items-center justify-center py-2 rune-panel text-amber-500/60 hover:text-amber-400 font-magic hover:border-amber-500/50 transition-all group z-10 gap-1 rounded-sm"
              >
                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-500/80 group-hover:text-amber-500" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none text-amber-500/80 group-hover:text-amber-400">Sheriff</span>
              </button>
              <button 
                id="ruxa-beacon"
                onClick={() => handleFunModeClick('judge')}
                className="flex flex-col items-center justify-center py-2 rune-panel text-green-500/60 hover:text-green-400 font-magic hover:border-green-500/50 transition-all group z-10 gap-1 rounded-sm"
              >
                <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform text-green-500/80 group-hover:text-green-500" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none text-green-500/80 group-hover:text-green-400">Judge</span>
              </button>
              <button 
                onClick={() => {
                  setSearchQuery("Bear");
                  performSearch({ 
                    queryOverride: 'art:bear f:paper', 
                    skipCI: true, 
                    orderOverride: 'released', 
                    dirOverride: 'desc',
                    isBearActivation: true
                  });
                }}
                className="flex flex-col items-center justify-center py-2 rune-panel text-orange-400/60 hover:text-orange-400 font-magic hover:border-orange-500/50 transition-all group z-10 gap-1 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-orange-500/20"
              >
                <PawPrint className="w-4 h-4 group-hover:scale-125 transition-transform text-orange-500/60 group-hover:text-orange-400" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none">Bears</span>
              </button>
              <button 
                onClick={() => setViewMode('socials')}
                className="flex flex-col items-center justify-center py-2 rune-panel text-cyan-400/60 hover:text-cyan-400 font-magic hover:border-cyan-500/50 transition-all group z-10 gap-1 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-cyan-500/20"
              >
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform text-cyan-500/60 group-hover:text-cyan-400" />
                <span className="text-[7px] font-magic font-bold uppercase tracking-widest leading-none">Socials</span>
              </button>
            </div>
          </section>
        </div>

        {/* Section 6: User & Settings */}
        <div className="p-5 bg-transparent border-t border-white/5 relative">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="absolute inset-0 group flex items-center justify-center transition-all duration-300"
              >
                {/* Subtle Arcane Gear Architecture */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 text-cyan-400 group-hover:text-cyan-300 transition-all duration-700 opacity-40 group-hover:opacity-100">
                  <Settings className="w-full h-full p-2.5 animate-[spin_8s_linear_infinite]" />
                </div>
                
                <div className="w-9 h-9 rounded-full bg-[#050505] border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all relative z-10">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <User className="w-4 h-4 text-cyan-400/60" />
                  )}
                </div>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-start min-w-0">
               <span className="text-[10px] font-magic font-black text-white/60 uppercase tracking-[0.1em] truncate w-full">{userName || user?.displayName || 'User'}</span>
               <span className="text-[9px] font-sans font-black text-orange-500/80 uppercase tracking-widest truncate w-full">{userTitle || 'Novice'}</span>
               <div className="mt-1 flex flex-col gap-0.5">
                 <p className="text-[5px] font-sans font-bold text-white/20 uppercase leading-tight tracking-wider">
                   © {new Date().getFullYear()} Slopsie.
                 </p>
                 <p className="text-[4.5px] font-sans font-medium text-white/10 uppercase leading-tight hover:text-white/40 transition-colors cursor-help max-w-[140px]" title="Rune Deck is unofficial Fan Content allowed under the Fan Content Policy. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.">
                    Rune Deck is unofficial Fan Content. Wizards compliant.
                 </p>
               </div>
            </div>
            
            <button 
                onClick={() => setShowRoadmap(true)}
                className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 hover:text-green-300 hover:border-green-500/40 hover:bg-green-500/20 transition-all group relative overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                title="Rune-Tech Manual"
              >
                <HelpCircle className="w-5 h-5 relative z-10 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-green-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
          </div>
        </div>
      </aside>


      {/* Global Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            >
               <motion.div 
                 initial={{ scale: 0.95, y: 10 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.95, y: 10 }}
                 className="w-full max-w-md bg-[#050505] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] rounded-[2.5rem] overflow-hidden relative"
               >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.05),transparent_50%)]" />

                  <div className="p-6 border-b border-white/5 flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                           <Settings className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                           <h2 className="font-magic font-black text-xs uppercase tracking-[0.2em] text-white">System Config</h2>
                           <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Interface v3.5</p>
                        </div>
                     </div>
                     <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="p-6 space-y-6 relative z-10 custom-scrollbar max-h-[70vh] overflow-y-auto">
                     {/* Identification Segment */}
                     <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                        <div className="w-16 h-16 rounded-full border-2 border-orange-500/30 p-1 shrink-0">
                           {user?.photoURL ? (
                             <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                           ) : (
                             <div className="w-full h-full rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-magic text-xl">
                                ᛝ
                             </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <input 
                              type="text"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              onBlur={() => saveUserSettings({ userName })}
                              className="w-full bg-transparent border-b border-white/5 focus:border-cyan-500/50 text-sm font-magic font-black text-white hover:text-cyan-400 transition-all outline-none uppercase tracking-widest"
                              placeholder="Enter Identity..."
                           />
                           <input 
                              type="text"
                              value={userTitle}
                              onChange={(e) => setUserTitle(e.target.value)}
                              onBlur={() => saveUserSettings({ userTitle })}
                              className="w-full bg-transparent text-[9px] font-mono text-white/30 uppercase tracking-widest mt-1 outline-none focus:text-orange-400 transition-all"
                              placeholder="Set Title..."
                           />
                        </div>
                     </div>

                     {/* Tactical Switches */}
                     <div className="grid grid-cols-1 gap-3">
                        <div 
                           onClick={() => saveUserSettings({ isPublic: !isPublic })}
                           className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all ${isPublic ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                        >
                           <div className="flex items-center gap-3">
                              <Eye className={`w-4 h-4 ${isPublic ? 'text-cyan-400' : 'text-white/20'}`} />
                              <div className="flex flex-col">
                                 <span className={`text-[10px] font-magic font-black uppercase tracking-widest ${isPublic ? 'text-white' : 'text-white/40'}`}>Broadcasting</span>
                                 <span className="text-[7px] font-mono text-white/20 uppercase">Global Visibility Active</span>
                              </div>
                           </div>
                           <div className={`w-8 h-4 rounded-full relative transition-all ${isPublic ? 'bg-cyan-500' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isPublic ? 'left-4.5' : 'left-0.5'}`} />
                           </div>
                        </div>
                     </div>

                     {/* Interface Density */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                           <span className="text-[8px] font-magic font-black text-white/30 uppercase tracking-widest">Interface Density</span>
                           <span className="text-[8px] font-mono text-orange-500/60 uppercase">{cardsPerRow === 0 ? 'Optimal' : `${cardsPerRow} Wide`}</span>
                        </div>
                        <div className="flex gap-2">
                           <button
                             onClick={() => saveUserSettings({ cardsPerRow: 0 })}
                             className={`flex-1 py-2.5 rounded-xl text-[9px] font-magic font-black uppercase transition-all border ${cardsPerRow === 0 ? 'bg-orange-500 border-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/10'}`}
                           >
                              Auto
                           </button>
                           {[3, 5, 8].map(n => (
                              <button
                                 key={n}
                                 onClick={() => saveUserSettings({ cardsPerRow: n })}
                                 className={`flex-1 py-2.5 rounded-xl text-[9px] font-magic font-black uppercase transition-all border ${cardsPerRow === n ? 'bg-orange-500 border-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/10'}`}
                              >
                                 {n}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Action Controls */}
                     <div className="pt-4 flex flex-col gap-2">
                        {isAdmin && (
                           <button 
                             onClick={() => {
                               setShowAdminChamber(true);
                               setIsSettingsOpen(false);
                             }}
                             className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-magic font-black uppercase tracking-widest border border-emerald-500/20 transition-all shadow-sm"
                           >
                             <Shield className="w-3 h-3" />
                             Admin Log
                           </button>
                        )}
                        <button 
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 rounded-xl text-[9px] font-magic font-black uppercase tracking-widest border border-red-500/10 transition-all"
                        >
                          <LogOut className="w-3 h-3" />
                          De-authorize
                        </button>
                     </div>
                  </div>
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
          
          <div className="flex-1 overflow-y-auto no-scrollbar relative" ref={contentRef}>
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
                           <span className="text-[9px] font-magic font-black text-orange-400 uppercase tracking-[0.4em]">Ursine Resonance</span>
                           <h3 className="text-2xl font-magic font-black text-white">Rune-Bear-Tech</h3>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Nodes</span>
                           <span className="text-3xl font-magic font-black text-white leading-none">{searchSummary.total}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        {/* Color Identity */}
                        <div className="space-y-3">
                           <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-orange-500 rotate-45" />
                              <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest">Aura Spectrum</span>
                           </div>
                           <div className="flex flex-wrap gap-1.5">
                              {searchSummary.colors.map(([color, count]) => (
                                <div key={color} className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/5 rounded-md">
                                  {MANA_SYMBOL_URIS[`{${color.toUpperCase()}}`] ? (
                                    <img src={MANA_SYMBOL_URIS[`{${color.toUpperCase()}}`]} alt={color} className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold text-white/60">{color}</span>
                                  )}
                                  <span className="text-[10px] font-mono font-black text-white">{count}</span>
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* Morphology */}
                        <div className="space-y-3">
                           <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-cyan-500 rotate-45" />
                              <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest">Cellular Matrix</span>
                           </div>
                           <div className="space-y-1.5">
                              {searchSummary.types.slice(0, 3).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between px-2.5 py-1 bg-white/5 border border-white/5 rounded-md group/type">
                                  <span className="text-[8px] font-magic font-black text-cyan-400/80 uppercase tracking-tight">{type}</span>
                                  <span className="text-[9px] font-mono font-black text-white/60">{count}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-orange-500/10">
                        <div className="flex items-center gap-2 mb-1">
                           <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
                           <span className="text-[8px] font-magic font-black text-orange-400 uppercase tracking-widest">Tactical Briefing</span>
                        </div>
                        <p className="text-[10px] font-mono text-white/30 uppercase leading-relaxed italic">
                           The Ursine weave is dense. High concentration of {searchSummary.types[0]?.[0]} energy identified. Proceed with reverence.
                        </p>
                     </div>
                  </div>

                  {/* Decorative corner runes */}
                  <div className="absolute top-2 left-2 text-[10px] font-magic text-orange-500/10">ᚱ</div>
                  <div className="absolute top-2 right-2 text-[10px] font-magic text-orange-500/10">ᚦ</div>
                </div>
              </motion.div>
            )}
            <div className="hidden md:flex fixed bottom-12 right-12 z-[100] pointer-events-auto">
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
                <span className="text-[11px] font-magic font-black uppercase tracking-[0.3em] group-hover:tracking-[0.4em] transition-all">Selected Cardboard</span>
                {deckbox.length > 0 && (
                   <span className="text-[10px] font-mono opacity-60 text-orange-200">({deckbox.length})</span>
                )}
              </button>
            </div>
          {viewMode === 'cards' && (
            <div 
              className={`grid transition-all duration-500 gap-3 sm:gap-6 p-2 pb-4 ${
                cardsPerRow === 0 ? 'grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' : ''
              }`}
              style={{
                gridTemplateColumns: cardsPerRow === 0 
                  ? undefined 
                  : `repeat(${cardsPerRow}, 1fr)`
              }}
            >
              {allCards.length === 0 && !loading && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                  {hasSearched ? (
                    <>
                      <div className="relative mb-10">
                        <div className="absolute inset-0 bg-red-500/10 blur-[100px] rounded-full scale-150" />
                        <div className="relative z-10 w-32 h-32 flex items-center justify-center bg-[#070707] border border-white/5 rounded-[40px] shadow-2xl rotate-3">
                           <Search className="w-16 h-16 text-red-500/20 group-hover:text-red-500 transition-colors" />
                        </div>
                      </div>
                      
                      <h2 className="text-4xl font-magic font-black text-white/80 uppercase tracking-tighter mb-4">No cards found</h2>
                      <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed mb-10 px-6">
                        No matches found in the Multiverse. Adjust your filters or try a different search term.
                      </p>
                      
                      <button 
                        onClick={() => {
                          setSearchQuery("");
                          setHasSearched(false);
                          performSearch({ queryOverride: "" });
                        }}
                        className="px-8 py-4 rune-panel text-white/40 font-magic font-black text-xs uppercase tracking-widest hover:text-cyan-400 hover:border-cyan-500/30 transition-all z-10"
                      >
                        Clear Search
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
                        {/* High Visibility Intense Arcane Background */}
                        <div 
                          className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-screen bg-center bg-cover bg-no-repeat bg-fixed"
                          style={{ backgroundImage: `url(${runesBackground})` }}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15)_0%,transparent_70%)] opacity-80" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(6,182,212,0.15)_0%,transparent_60%)]" />

                        {/* Dramatic Animated Rings - Integrated Orange and Cyan */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[90vw] h-[90vw] border-[10px] border-orange-500/20 rounded-full animate-[spin_120s_linear_infinite] shadow-[0_0_80px_rgba(249,115,22,0.1)]" />
                          <div className="absolute w-[85vw] h-[85vw] border-[2px] border-dashed border-cyan-500/30 rounded-full animate-[spin_80s_linear_infinite_reverse] shadow-[0_0_60px_rgba(6,182,212,0.05)]" />
                          <div className="absolute w-[75vw] h-[75vw] border-[12px] border-double border-orange-500/10 rounded-full animate-[spin_180s_linear_infinite]" />
                        </div>

                        {/* Alternating Glowing Mana Symbols and Runes aligned for background interaction */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                           {[
                             { s: 'w', t: 'mana' }, { s: 'u', t: 'mana' }, { s: 'b', t: 'mana' }, { s: 'r', t: 'mana' }, { s: 'g', t: 'mana' },
                             { s: 'ᛉ', t: 'rune' }, { s: 'ᛗ', t: 'rune' }, { s: 'ᚦ', t: 'rune' }, { s: 'ᛟ', t: 'rune' }, { s: 'ᚱ', t: 'rune' }
                           ].map((item, i) => {
                             const isActive = i === glowIndex;
                             const isMana = item.t === 'mana';
                             // Circular distribution: Mana symbols inner (r=30), Runes outer (r=42)
                             // Offset runes by 36% degrees so they don't overlap mana pins
                             const angle = (i % 5 * 2 * Math.PI) / 5 - Math.PI / 2 + (isMana ? 0 : Math.PI / 5);
                             const r = isMana ? 20 : 60; 
                             
                             return (
                               <motion.div
                                 key={i}
                                 animate={{ 
                                   scale: isActive ? 1.8 : 1,
                                   opacity: isActive ? 0.7 : 0.1,
                                   filter: isActive ? 'drop-shadow(0 0 70px white)' : 'none'
                                 }}
                                 transition={{ duration: 4, ease: "easeInOut" }}
                                 className={`absolute ${isMana ? 'w-[15vh] h-[15vh]' : 'w-[45vh] h-[45vh]'} flex items-center justify-center`}
                                 style={{
                                   top: `${50 + r * Math.sin(angle)}%`,
                                   left: `${50 + r * Math.cos(angle)}%`,
                                   transform: 'translate(-50%, -50%)'
                                 }}
                               >
                                 {isMana ? (
                                   <img src={MANA_SYMBOL_URIS[`{${item.s.toUpperCase()}}`]} alt={item.s} className="w-full h-full object-contain" />
                                 ) : (
                                   <span className={`text-[32vh] font-magic leading-none ${i % 2 === 0 ? 'text-cyan-400' : 'text-orange-500'}`}>{item.s}</span>
                                 )}
                               </motion.div>
                             );
                           })}
                        </div>
                       
                       {/* Centered Go Home View */}
                       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative z-10 flex flex-col items-center"
                          >
                             {/* THE PULSING RUNES / SYMBOLS - RESTORED & ENHANCED */}
                             <motion.div 
                               animate={{ rotate: 360 }}
                               transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                               className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
                             >
                               {[
                                 { s: 'W', r: 35, a: 0 },
                                 { s: 'U', r: 35, a: 72 },
                                 { s: 'B', r: 35, a: 144 },
                                 { s: 'R', r: 35, a: 216 },
                                 { s: 'G', r: 35, a: 288 },
                                 { s: 'λ', r: 18, a: 30 },
                                 { s: 'Ω', r: 18, a: 120 },
                                 { s: 'ψ', r: 18, a: 210 },
                                 { s: 'ζ', r: 18, a: 300 },
                               ].map((item, i) => {
                                 const isActive = activeSymbol === i;
                                 const angle = (item.a * Math.PI) / 180;
                                 const r = item.r;
                                 const isMana = ['W', 'U', 'B', 'R', 'G'].includes(item.s);

                                 return (
                                   <motion.div
                                     key={i}
                                     animate={{ 
                                       scale: isActive ? 1.8 : 1.2,
                                       opacity: isActive ? 0.7 : 0.08,
                                       filter: isActive ? 'drop-shadow(0 0 80px rgba(255,255,255,0.6))' : 'none'
                                     }}
                                     transition={{ duration: 4, ease: "easeInOut" }}
                                     className={`absolute ${isMana ? 'w-[14vh] h-[14vh] md:w-[18vh] md:h-[18vh]' : 'w-[40vh] h-[40vh] md:w-[50vh] md:h-[50vh]'} flex items-center justify-center`}
                                     style={{
                                       top: `${50 + r * Math.sin(angle)}%`,
                                       left: `${50 + r * Math.cos(angle)}%`,
                                       // Counter-rotate the symbols so they stay upright
                                       transform: `translate(-50%, -50%)`
                                     }}
                                   >
                                     {isMana ? (
                                       <img src={MANA_SYMBOL_URIS[`{${item.s.toUpperCase()}}`]} alt={item.s} className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                                     ) : (
                                       <span className={`text-[35vh] md:text-[45vh] font-magic leading-none ${i % 2 === 0 ? 'text-cyan-400' : 'text-orange-500'} blur-[1px] md:blur-[2px]`}>{item.s}</span>
                                     )}
                                   </motion.div>
                                 );
                               })}
                             </motion.div>

                             <motion.h1 
                               initial={{ opacity: 0, y: 30 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                               className="text-4xl sm:text-7xl md:text-[10rem] lg:text-[15rem] font-magic font-black text-white uppercase tracking-tighter opacity-[0.95] drop-shadow-[0_0_50px_rgba(6,182,212,0.5)] mb-4 md:mb-12 leading-[0.8] text-center italic skew-x-[-8deg] relative"
                             >
                               <span className="relative z-10">The Runes <br className="md:hidden" /> Await</span>
                               <div className="absolute inset-0 text-cyan-400/10 blur-[15px] translate-x-2 translate-y-2 pointer-events-none select-none">The Runes Await</div>
                             </motion.h1>

                             <motion.div 
                               initial={{ opacity: 0, y: 30 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="relative z-20 flex flex-col items-center justify-center text-center max-w-5xl mx-auto mb-6 md:mb-12 px-4"
                             >
                                <div className="space-y-6 md:space-y-16 py-6 md:py-16">
                                   <div className="space-y-2 md:space-y-6">
                                      <span className="text-orange-500 font-extrabold text-[10px] md:text-[14px] block tracking-[0.8em] md:tracking-[1.5em] mb-2 md:mb-6 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] uppercase font-magic">ANCIENT DECK FORGING</span>
                                      <h3 className="text-3xl sm:text-6xl md:text-9xl font-magic font-black text-white uppercase tracking-[0.3em] md:tracking-[0.6em] leading-[1.1] drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]">Forge Your <br className="hidden sm:block" /> Synergies</h3>
                                   </div>
                                   <p className="text-xs sm:text-sm md:text-xl text-white/70 font-magic font-black uppercase tracking-[0.2em] md:tracking-[0.5em] leading-[1.8] md:leading-[2.5] max-w-3xl mx-auto border-y border-white/10 py-8 md:py-16 px-4 md:px-12 bg-black/5 backdrop-blur-sm">
                                     Discover recent and future releases & summon <br className="hidden sm:block"/> the perfect additions to your legacy collections.
                                   </p>
                                   <div className="pt-2 md:pt-6 flex flex-col items-center gap-4 md:gap-8">
                                      <span className="text-[8px] md:text-[12px] font-magic font-black text-white/30 uppercase tracking-[0.4em] md:tracking-[0.8em] block">Synergy Scribed • Slopsie Approved</span>
                                      <div className="flex gap-4">
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,1)]" />
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-500 rounded-full animate-pulse delay-75 shadow-[0_0_15px_rgba(6,182,212,1)]" />
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full animate-pulse delay-150 shadow-[0_0_15px_rgba(249,115,22,1)]" />
                                      </div>
                                   </div>
                                </div>
                             </motion.div>



                            <div className="flex justify-center gap-6 mt-12">
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)] animate-pulse" />
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)] animate-pulse delay-150" />
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)] animate-pulse delay-300" />
                            </div>
                          </motion.div>
                       </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {allCards.map((card, idx) => {
                const images = getCardImages(card);
                const isSelected = deckbox.some(c => c.name === card.name);
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
                        setHoveredPreviewCard(imgs.normal || imgs.border_crop || null);
                        setHoveredPreviewPrice(card.prices?.eur || null);
                      }}
                      onMouseLeave={() => {
                        setHoveredPreviewCard(null);
                        setHoveredPreviewPrice(null);
                      }}
                      className={`
                        h-full w-full rounded-[14px] overflow-hidden border-2 transition-all duration-300 cursor-pointer
                        ${isSelected ? 'border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.5)]' : 'border-white/10 group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]'}
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
          {viewMode === 'calendar' && (
            <div className="h-full w-full absolute inset-0 z-30 bg-[#050505]">
              <ReleaseCalendar setViewMode={setViewMode} performSearch={performSearch} setSearchQuery={setSearchQuery} />
            </div>
          )}


          {viewMode === 'judge' && <JudgeView />}

          {viewMode === 'manage_decks' && (
            <div className="space-y-6 p-4 lg:p-8 relative">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rune-panel rounded-xl relative z-0">
                <div className="flex flex-col z-10">
                  <h2 className="text-xl font-magic font-extrabold text-orange-500 uppercase tracking-tight">Saved Decks</h2>
                  <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest">MY COLLECTION</p>
                </div>
                <div className="flex-1 max-w-sm z-10 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Archidekt or TappedOut ID/URL..."
                      className="bg-black/60 border border-[#2a2a2a] shadow-[inset_0_1px_5px_rgba(0,0,0,0.8)] rounded-sm px-4 py-2 text-[11px] flex-1 focus:border-cyan-500/50 outline-none placeholder:text-white/20 text-cyan-400 font-magic transition-colors"
                      value={newDeckIdInput}
                      onChange={(e) => setNewDeckIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchAnyDeck(newDeckIdInput, false)}
                    />
                    <button 
                      onClick={() => fetchAnyDeck(newDeckIdInput, false)}
                      className="rune-panel px-4 py-2 text-cyan-500/80 font-black text-[10px] items-center gap-2 flex transition-all active:scale-95 font-magic uppercase hover:text-cyan-400 hover:border-cyan-500/30 z-10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Deck
                    </button>
                  </div>
                  
                  {publicUsers.length > 0 && (
                    <div className="relative group">
                       <select 
                        className="w-full appearance-none bg-black/40 border border-white/5 rounded-sm px-4 py-2 text-[10px] text-white/40 font-magic outline-none focus:border-cyan-500/40"
                        onChange={async (e) => {
                          const uid = e.target.value;
                          if (!uid) return;
                          setLoading(true);
                          try {
                            const snap = await getDocs(collection(db, 'users', uid, 'decks'));
                            const decks: any[] = [];
                            snap.forEach(d => decks.push({ id: d.id, ...d.data() }));
                            setViewingPublicDecks(decks);
                            const u = publicUsers.find(pu => pu.id === uid);
                            setViewingPublicUser(u);
                            setIsViewingDeck(true);
                            setViewMode('socials'); // Switch to socials to see their decks
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                         <option value="">Import from User...</option>
                         {publicUsers.map(u => (
                           <option key={u.id} value={u.id}>{u.displayName || u.userName || 'Unknown User'}</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div className="ml-auto bg-orange-500 text-black px-4 py-1 rounded-sm text-xs font-black z-10 relative">
                  {savedDecks.length} Decks
                </div>
              </div>
              <DeckManager />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {savedDecks.map(deck => (
                  <div key={deck.id} className="bg-[#080808] border border-white/5 rounded-3xl overflow-hidden flex flex-col group hover:border-cyan-500/20 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)] transition-all duration-500">
                    <div className="h-48 relative overflow-hidden">
                      <img src={deck.art_crops[0] || 'https://cards.scryfall.io/art_crop/front/3/b/3b19e4a3-764c-474d-9ac3-818617d12f3e.jpg'} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000 ease-out" alt={deck.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-black/40 to-black/10 mix-blend-multiply" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
                      
                      <div className="absolute inset-x-6 top-6 flex justify-between items-start">
                         <div className="relative group/manas">
                            <div className="flex items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl group-hover:border-white/20 transition-all min-h-[30px]">
                               {renderManaSymbols(deck.ci, 'w-3.5 h-3.5')}
                            </div>
                         </div>
                         {deck.totalCost ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#00aeef]/20 shadow-xl group-hover:border-[#00aeef]/40 transition-all min-h-[30px]">
                                <span className="text-[8px] text-[#00aeef]/70 font-magic font-extrabold uppercase mr-2 tracking-widest leading-none">Price</span>
                                <span className="text-[12px] text-white/90 font-mono font-black">€{deck.totalCost.toFixed(2)}</span>
                              </div>
                            </div>
                         ) : null}
                      </div>

                      <div className="absolute inset-x-6 bottom-4">
                        <h3 className="font-magic font-bold text-2xl text-white group-hover:text-cyan-400 transition-colors uppercase leading-none drop-shadow-lg">{deck.name}</h3>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] font-mono mt-2">Commander Deck</p>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-6">
                      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl">
                        <button 
                          onClick={() => autoAddCommanderTags(deck.id, deck.commanders)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-[9px] font-magic font-black uppercase tracking-widest ${
                            suggestedDecks.has(deck.id) 
                              ? 'bg-transparent text-white/30 border border-white/5' 
                              : 'bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-orange-500/50'
                          }`}
                          title="Generate Synergy Tags"
                        >
                          <Wand2 className="w-3 h-3" />
                          {suggestedDecks.has(deck.id) ? 'Regen' : 'Generate Tags'}
                        </button>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap gap-2">
                           {(deck.tags || []).map(tag => {
                             let label = tag;
                             let query = tag;
                             if (tag.includes(':::')) {
                               const parts = tag.split(':::');
                               label = parts[0];
                               query = parts.slice(1).join(':::');
                             }
                             return (
                               <span key={tag} className="flex items-stretch group/tag shadow-sm">
                                 <button
                                   onClick={() => {
                                     setSearchQuery(query);
                                     const tagCI = deck.ci || "";
                                     setCurrentCI(tagCI);
                                     setViewMode('cards');
                                      performSearch({ 
                                        queryOverride: query, 
                                        ciOverride: tagCI, 
                                        skipCI: false,
                                        skipFormatFilters: false
                                      });
                                   }}
                                   className="px-3 py-1.5 bg-cyan-500/5 border border-white/5 rounded-l-md text-[10px] hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/30 transition-all font-bold text-cyan-400/80"
                                 >
                                   {label}
                                 </button>
                                 <button
                                   className="px-2 py-1.5 bg-white/5 border-y border-r border-white/5 rounded-r-md text-white/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
                                   onClick={() => removeTag(deck.id, tag)}
                                 >
                                   <X className="w-3 h-3" />
                                 </button>
                               </span>
                             );
                           })}
                           {(pendingTags[deck.id] || []).map((tag: string, i: number) => (
                              <span key={`pending-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/40 animate-pulse border-dashed">
                                <RotateCw className="w-2.5 h-2.5 animate-spin text-cyan-500/50" />
                                {tag}
                              </span>
                           ))}
                        </div>

                        <div 
                          id="tag-input"
                          className="flex gap-2"
                        >
                          <input 
                            type="text" 
                            placeholder="Add a custom tag (e.g. 'Bear' or 'Infect')"
                            className="bg-black/30 border border-white/5 rounded-md px-4 py-2.5 text-[10px] flex-1 outline-none focus:border-cyan-500/50 focus:bg-black/50 transition-all placeholder:text-white/20 text-white/70"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addTag(deck.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = "";
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center pt-5 mt-auto border-t border-white/5 gap-3">
                        <button 
                          onClick={() => viewDeckDetails(deck.id)}
                          className="flex-[2] px-4 py-4 bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] rounded-2xl text-black font-magic font-black text-[12px] uppercase tracking-[0.3em] hover:bg-cyan-400 hover:scale-[1.03] transition-all active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <Eye className="w-5 h-5 pointer-events-none group-hover:animate-pulse" />
                          <span>View Deck</span>
                        </button>
                        <button 
                          onClick={async () => {
                             if (!auth.currentUser) {
                                showMessage("AUTHENTICATION REQUIRED", "error");
                                return;
                             }
                             const shareTarget = prompt("Enter User Email to share with:");
                             if (shareTarget) {
                                setLoading(true);
                                await shareDeck(deck.id, shareTarget);
                                setLoading(false);
                             }
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 rounded-2xl text-white/40 hover:text-indigo-400 transition-all active:scale-90 group"
                          title="Share Deck"
                        >
                          <Send className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        </button>
                        <button 
                          onClick={() => setDeckToDelete(deck.id)}
                          className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 rounded-2xl text-white/40 hover:text-red-400 transition-all active:scale-90 group"
                          title="Delete Deck"
                        >
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'sets' && (
            <div className="p-4 lg:p-8">
              <SetExplorer setViewMode={setViewMode} performSearch={performSearch} setSearchQuery={setSearchQuery} />
            </div>
          )}

          {viewMode === 'sheriff' && (
            <div className="p-4 lg:p-8">
              <OutlawSheriff />
            </div>
          )}

          {viewMode === 'socials' && (
            <SocialsPage 
              setViewMode={setViewMode}
              user={user}
              setViewingPublicDecks={setViewingPublicDecks}
              setViewingPublicUser={setViewingPublicUser}
              setIsViewingDeck={setIsViewingDeck}
              setIsSettingsOpen={setIsSettingsOpen}
            />
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
               className="w-full max-w-6xl h-[90vh] bg-[#050808] border border-cyan-500/20 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.15)] flex flex-col relative"
             >
                {/* Arch-Rune Background Signature Floor */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-center bg-cover bg-no-repeat" style={{ backgroundImage: `url(${runesBackground})` }} />

                {/* Header Decoration */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20" />
                
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#081011] relative z-10">
                   <div className="flex items-center gap-6">
                     <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                       <Database className="w-6 h-6 text-cyan-400" />
                     </div>
                     <div className="flex flex-col">
                       <h2 className="text-2xl font-magic font-black text-cyan-400 uppercase tracking-[0.1em] truncate max-w-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{viewingDeckName || 'Deckinfo'}</h2>
                       <div className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                         <p className="text-[10px] text-white/40 uppercase font-mono tracking-[0.2em]">{viewingDeckCards.length} Cards Analyzed</p>
                       </div>
                     </div>
                   </div>
                   <button 
                     onClick={() => { setIsViewingDeck(false); setViewingDeckCards(null); }} 
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
                                 <h3 className="text-[8px] font-magic font-black text-white/30 uppercase tracking-[0.3em]">{category}</h3>
                                 <span className="text-[8px] font-mono text-cyan-400/40 ml-auto">{(cards as any[]).length}</span>
                               </div>
                               
                               <div className="flex flex-col">
                                 {(cards as any[]).map((dc, i) => {
                                   const c = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                                   const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
                                   const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                                   const edition = dc.card?.edition;
                                   const cardName = c?.name || dc.card?.name || 'Unknown Card';
                                   const manaCost = oracle?.mana_cost || scryfall?.mana_cost || edition?.mana_cost || '';
                                   
                                   let img = scryfall?.image_uris?.large || scryfall?.image_uris?.png || edition?.image_uris?.large || edition?.image_uris?.png || edition?.imageUrl || edition?.image_url || scryfall?.image_uris?.normal || oracle?.image_uris?.large || oracle?.image_uris?.normal;
                                   const scryfallId = dc.card?.scryfall_id || dc.card?.scryfallId || dc.card?.uids?.scryfall || scryfall?.id || dc.uids?.scryfall;
                                   if (!img && scryfallId) {
                                      img = `https://cards.scryfall.io/large/front/${scryfallId.slice(0, 1)}/${scryfallId.slice(1, 2)}/${scryfallId}.jpg`;
                                   }

                                   const isSelected = selectedDeckCard === img || hoveredPreviewCard === img;

                                   return (
                                     <button 
                                       key={`${category}-${i}`}
                                       onClick={() => {
                                          setSelectedDeckCard(img);
                                          setHoveredPreviewCard(img);
                                       }}
                                       onMouseEnter={() => setHoveredPreviewCard(img)}
                                       className={`group flex items-center justify-between py-1.5 px-3 rounded-lg transition-all border ${
                                         isSelected ? 'bg-cyan-500/10 border-cyan-500/20' : 'border-transparent hover:bg-white/[0.04]'
                                       }`}
                                     >
                                       <div className="flex items-center gap-2 min-w-0">
                                         <span className="text-[9px] font-mono text-white/20 w-3">{dc.quantity || 1}</span>
                                         <span className={`text-[11px] font-magic font-bold uppercase tracking-wide truncate transition-colors ${
                                           isSelected ? 'text-cyan-400' : 'text-white/50 group-hover:text-white'
                                         }`}>
                                           {cardName}
                                         </span>
                                       </div>
                                       <div className="flex items-center gap-1 shrink-0 ml-2">
                                         {renderManaSymbols(manaCost, 'w-3 h-3')}
                                       </div>
                                     </button>
                                   );
                                 })}
                                  <div className="mt-8 pt-4 border-t border-cyan-500/10">

                                  </div>
                               </div>
                             </div>
                           ))}
                       </div>


                     </div>

                     {/* IMAGE DISPLAY COLUMN */}
                     <div className="hidden lg:flex flex-1 bg-[#020404] items-center justify-center p-8 relative z-20 overflow-hidden border-r border-white/5">
                                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none flex items-center justify-center mix-blend-screen bg-center bg-cover bg-no-repeat" style={{ backgroundImage: `url(${runesBackground})` }} />
                                    
                                    {/* Animated Scrying Rings */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                       <div className="w-[40vh] h-[40vh] border border-cyan-500/20 rounded-full animate-[spin_60s_linear_infinite] p-4">
                                          <div className="w-full h-full border border-cyan-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                                       </div>
                                       <div className="absolute w-[45vh] h-[45vh] border-2 border-dashed border-cyan-500/5 rounded-full animate-[spin_120s_linear_infinite]" />
                                    </div>

                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
                                    <AnimatePresence mode="wait">
                                        {hoveredPreviewCard ? (
                                         <motion.div 
                                            key={hoveredPreviewCard}
                                            initial={{ opacity: 0, scale: 0.8, rotateY: 45 }}
                                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                            exit={{ opacity: 0, scale: 0.8, rotateY: -45 }}
                                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                            className="relative z-20 flex items-center justify-center pointer-events-none perspective-1000"
                                        >
                                            <div className="absolute inset-0 bg-cyan-400/20 blur-[80px] rounded-full animate-pulse" />
                                            {/* Rune-Tech Tech Accents */}
                                            <div className="absolute inset-0 -m-8 border border-cyan-500/20 rounded-[2rem] animate-[spin_20s_linear_infinite]" />
                                            <div className="absolute inset-0 -m-12 border border-cyan-500/10 rounded-[3rem] animate-[spin_40s_linear_infinite_reverse]" />
                                            
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
                                            <div className="absolute -top-16 -left-16 text-cyan-400/60 font-magic text-6xl animate-pulse">ᛉ</div>
                                            <div className="absolute -bottom-16 -right-16 text-cyan-400/60 font-magic text-6xl animate-pulse">ᚦ</div>
                                            <div className="absolute top-1/2 -left-24 -translate-y-1/2 text-cyan-500/20 font-magic text-4xl rotate-90">ᚱᚢᚾᛖ</div>
                                            <div className="absolute top-1/2 -right-24 -translate-y-1/2 text-cyan-500/20 font-magic text-4xl -rotate-90">ᛏᛖᚳᚺ</div>
                                        </motion.div>
                                        ) : (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center gap-10 text-cyan-400/20"
                                        >
                                            <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-500/40 rounded-full animate-spin" />
                                            <p className="text-xs uppercase tracking-[1em] font-magic animate-pulse">Awaiting Signal</p>
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
                                            <h3 className="text-[10px] font-magic font-black text-cyan-400 uppercase tracking-[0.4em]">Deckinfo</h3>
                                            <div className="flex gap-1">
                                               <div className="w-1 h-1 bg-cyan-500/40 rounded-full animate-pulse" />
                                               <div className="w-1 h-1 bg-cyan-500/20 rounded-full" />
                                            </div>
                                         </div>
                                         <p className="text-[11px] font-mono text-white/20 uppercase tracking-widest truncate">{viewingDeckName || 'No Deck Selected'}</p>
                                         
                                         {viewingPublicUser && user && viewingPublicUser.id !== user.uid && (
                                           <div className="pt-4 grid grid-cols-2 gap-2 border-t border-white/5">
                                              <button 
                                                onClick={async () => {
                                                  try {
                                                    const batch = writeBatch(db);
                                                    const newDeckRef = doc(collection(db, 'users', user.uid, 'decks'));
                                                    batch.set(newDeckRef, {
                                                       name: `Imported: ${viewingDeckName}`,
                                                       createdAt: serverTimestamp(),
                                                       colors: 'C', // fallback
                                                       cardCount: viewingDeckCards.length
                                                    });
                                                    
                                                    viewingDeckCards.forEach(dc => {
                                                       const cRef = doc(collection(db, 'users', user.uid, 'decks', newDeckRef.id, 'cards'));
                                                       batch.set(cRef, dc);
                                                    });

                                                    await batch.commit();
                                                    showMessage("DECK REPLICATED SUCCESSFULLY", "success");
                                                  } catch (e) {
                                                    handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/decks`);
                                                  }
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-lg text-black font-magic font-black text-[9px] uppercase tracking-widest transition-all"
                                              >
                                                 Clone Deck
                                              </button>
                                              <button 
                                                onClick={() => {
                                                   // Open a small suggestion form or just suggest current deckbox selections
                                                   if (deckbox.length === 0) {
                                                      showMessage("LOAD DECKBOX WITH SUGGESTIONS FIRST", "error");
                                                      return;
                                                   }
                                                   const cards = deckbox.map(c => ({ name: c.name, thumb: c.thumb }));
                                                   const suggestionRef = doc(collection(db, 'suggestions'));
                                                   setDoc(suggestionRef, {
                                                      fromUserId: user.uid,
                                                      fromUserEmail: user.email,
                                                      toUserId: viewingPublicUser.id,
                                                      deckName: viewingDeckName,
                                                      cards: cards,
                                                      createdAt: serverTimestamp()
                                                   }).then(() => showMessage("TACTICAL SUGGESTIONS BROADCASTED", "success"));
                                                }}
                                                className="bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 px-3 py-2 rounded-lg text-cyan-400 font-magic font-black text-[9px] uppercase tracking-widest transition-all"
                                              >
                                                 Suggest Cards
                                              </button>
                                           </div>
                                         )}
                                      </div>
                                    </div>
                                    {/* LOWER DATA: TELEMETRY & SYNERGY */}
                                   <div className="flex-1 bg-black/60 border-t border-white/5 backdrop-blur-xl p-8 overflow-y-auto no-scrollbar font-sans">
                                      <div className="space-y-10">
                                         {/* MANA CURVE SECTION */}
                                         <section>
                                            <div className="flex items-center gap-3 mb-6">
                                               <div className="w-1.5 h-1.5 bg-orange-500 rotate-45 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
                                               <h4 className="text-[10px] font-magic font-black text-white/50 uppercase tracking-[0.3em]">Manabase Curve</h4>
                                            </div>
                                            <div className="h-40 w-full">
                                               <ResponsiveContainer width="100%" height="100%">
                                                  <BarChart data={
                                                     (() => {
                                                        const counts: Record<string, number> = {};
                                                        for (let i = 0; i <= 7; i++) counts[i === 7 ? '7+' : i.toString()] = 0;
                                                        viewingDeckCards.forEach(dc => {
                                                           const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                                                           const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
                                                           const tl = (card?.type_line || scryfall?.type_line || '').toLowerCase();
                                                           if (tl.includes('land')) return;
                                                           let cmc = Math.floor(card?.cmc || scryfall?.cmc || 0);
                                                           const qty = dc.quantity || 1;
                                                           if (cmc >= 7) counts['7+'] += qty;
                                                           else counts[cmc.toString()] += qty;
                                                        });
                                                        return Object.entries(counts).map(([name, value]) => ({ name, value }));
                                                     })()
                                                  }>
                                                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                     <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} axisLine={false} tickLine={false} />
                                                     <YAxis hide />
                                                     <Tooltip 
                                                        contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '9px' }}
                                                        itemStyle={{ color: '#06b6d4' }}
                                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                     />
                                                     <Bar dataKey="value" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                                                  </BarChart>
                                               </ResponsiveContainer>
                                            </div>
                                         </section>

                                         {/* COLOR IDENTITY SECTION */}
                                         <section>
                                            <div className="flex items-center gap-3 mb-6">
                                               <div className="w-1.5 h-1.5 bg-emerald-500 rotate-45 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                               <h4 className="text-[10px] font-magic font-black text-white/50 uppercase tracking-[0.3em]">Mana Alignment</h4>
                                            </div>
                                            <div className="flex items-center gap-10">
                                               <div className="w-28 h-28">
                                                  <ResponsiveContainer width="100%" height="100%">
                                           <PieChart>
                                            <Pie
                                               data={(() => {
                                                  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
                                                  viewingDeckCards.forEach(dc => {
                                                     const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                                                     const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
                                                     const manaCost = oracle?.mana_cost || scryfall?.mana_cost || '';
                                                     
                                                     // Extract colored symbols from mana cost
                                                     const matches = manaCost.match(/\{[WUBRG]\}/g);
                                                     if (matches) {
                                                        matches.forEach(m => {
                                                           const color = m.substring(1, 2);
                                                           if (counts[color] !== undefined) counts[color]++;
                                                        });
                                                     }
                                                  });
                                                  return Object.entries(counts).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
                                               })()}
                                               cx="50%"
                                               cy="50%"
                                               innerRadius={24}
                                               outerRadius={36}
                                               paddingAngle={4}
                                               dataKey="value"
                                            >
                                               {(() => {
                                                  const COLORS = { W: '#f0e6d2', U: '#00aeef', B: '#333333', R: '#ef5350', G: '#4caf50' };
                                                  const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
                                                  viewingDeckCards.forEach(dc => {
                                                     const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                                                     const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
                                                     const manaCost = oracle?.mana_cost || scryfall?.mana_cost || '';
                                                     const matches = manaCost.match(/\{[WUBRG]\}/g);
                                                     if (matches) { matches.forEach(m => { const color = m.substring(1, 2); if (counts[color] !== undefined) counts[color]++; }); }
                                                  });
                                                  const data = Object.entries(counts).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
                                                  return data.map(entry => <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />);
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

                                                     viewingDeckCards.forEach(c => {
                                                        const oracle = c.card?.oracleCard || c.card?.oracle_card || c.card;
                                                        const scryfall = c.card?.scryfallData || c.card?.scryfall_data;
                                                        const edition = c.card?.edition;
                                                        const typeLine = (oracle?.type_line || scryfall?.type_line || edition?.type_line || c.card?.type_line || '').toLowerCase();
                                                        const qty = c.quantity || 1;

                                                        if (typeLine.includes('land')) {
                                                          landCount += qty;
                                                        } else {
                                                          const cmc = oracle?.cmc || scryfall?.cmc || edition?.cmc || c.card?.cmc || 0;
                                                          totalCmc += (cmc * qty);
                                                          nonLandCount += qty;
                                                        }

                                                        if (typeLine.includes('artifact')) artifactCount += qty;
                                                        if (typeLine.includes('creature')) creatureCount += qty;
                                                        if (typeLine.includes('enchantment')) enchantmentCount += qty;
                                                        if (typeLine.includes('instant') || typeLine.includes('sorcery')) spellCount += qty;
                                                     });

                                                     const avgCmc = nonLandCount > 0 ? (totalCmc / nonLandCount).toFixed(2) : "0.00";

                                                     return [
                                                        { label: 'Avg CMC', val: avgCmc, icon: Zap },
                                                        { label: 'Spells', val: spellCount, icon: BookOpen },
                                                        { label: 'Enchant', val: enchantmentCount, icon: Sparkles },
                                                        { label: 'Creatures', val: creatureCount, icon: User },
                                                        { label: 'Artifacts', val: artifactCount, icon: Hexagon },
                                                        { label: 'Lands', val: landCount, icon: MapIcon }
                                                     ].map(stat => (
                                                        <div key={stat.label} className="bg-white/[0.02] border border-white/5 p-2 rounded-sm group hover:border-cyan-500/20 transition-colors">
                                                           <p className="text-[7px] font-magic font-bold text-white/20 uppercase tracking-widest">{stat.label}</p>
                                                           <div className="flex items-center gap-2 mt-1">
                                                              <span className="text-xs font-mono font-bold text-cyan-400/80 group-hover:text-cyan-400">{stat.val}</span>
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
                                              <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-white/30">Sync Status: Optimised</span>
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
              <img src={hoveredPreviewCard} className="w-full h-auto rounded-xl" alt="Preview" />
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
              className="w-full max-w-5xl bg-[#081011] border border-cyan-500/20 rounded-[3rem] p-4 md:p-10 shadow-2xl flex flex-col gap-8 relative overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-center bg-cover" style={{ backgroundImage: `url(${runesBackground})` }} />
              
              <div className="flex items-center justify-between relative z-10 px-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-magic font-black text-cyan-400 uppercase tracking-widest leading-none">Command Candidates</h2>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mt-2">Analyzed based on color alignment</p>
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
                    <div className="text-[12px] font-magic font-black text-white/10 uppercase tracking-[0.6em] mb-4">NO LEGENDARY ENTITIES DETECTED</div>
                    <div className="w-24 h-[1px] bg-white/5 mx-auto" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8 relative z-10">
                    {alternativeCommanders.map((c, i) => {
                      const name = c?.name || "Unknown Entity";
                      const imgs = c?.image_uris || c?.card_faces?.[0]?.image_uris || {};
                      const img = imgs.normal || imgs.large || c?.image_uris?.png;
                      
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03, duration: 0.5, ease: "easeOut" }}
                          key={i}
                          className="relative group cursor-pointer"
                          onClick={() => {
                            const imgs = c?.image_uris || c?.card_faces?.[0]?.image_uris || {};
                            const imgUrl = imgs.normal || imgs.large || c?.image_uris?.png;
                            setZoomedAltCard(imgUrl);
                            showMessage(`PREVIEWING: ${name.toUpperCase()}`, "info");
                          }}
                        >
                           <div className="aspect-[0.71] rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all duration-700 transform group-hover:-translate-y-4 relative bg-black/40">
                             <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={name} />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-6">
                               <span className="text-[10px] font-magic font-black text-cyan-400 uppercase tracking-[0.4em] text-center drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">{name}</span>
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
                      transition={{ type: "spring", damping: 20, stiffness: 100 }}
                      className="relative max-w-full max-h-full"
                    >
                      <img 
                        src={zoomedAltCard} 
                        className="rounded-[2.5rem] shadow-[0_0_120px_rgba(6,182,212,0.6)] max-w-full max-h-[85vh] object-contain border-4 border-white/5" 
                        alt="Zoomed Card" 
                      />
                      <div className="absolute -bottom-16 left-0 right-0 text-center">
                        <span className="text-[12px] font-magic font-black text-white/40 uppercase tracking-[0.6em] animate-pulse">Touch to return to candidates</span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest leading-none">Scanning sub-ranks for potential leadership</p>
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
                className="relative bg-[#0d0d0d] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-screen bg-center bg-cover" style={{ backgroundImage: `url(${runesBackground})` }} />
                
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-magic font-extrabold text-white uppercase tracking-tight mb-2">Purge Deck?</h3>
                  <p className="text-sm text-white/40 leading-relaxed mb-8">
                    {userName || user?.displayName || "User"}, are you sure you want to remove this deck from your library? This action is irreversible.
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
                  <h3 className="text-2xl font-magic font-black text-white hover:text-cyan-400 transition-colors uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">Welcome to Rune Deck Companion</h3>
                  <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em] font-bold mt-1">USER INTERFACE</p>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-wider mb-1">The Library</p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">Connect your Archidekt or TappedOut decks via their ID or URL to access your collection instantly.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-wider mb-1">Synergy Engine</p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">Use your deck tags to find cards that perfectly match your strategy with one click.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-wider mb-1">Mystic Search</p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">Search through all MTG sets or use powerful filters to find your perfect 99.</p>
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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#0c0c0c] border-l-2 border-[#1a1a1a] shadow-[-50px_0_100px_rgba(0,0,0,0.8)] z-[110] p-6 flex flex-col gap-6"
            >
            <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
            
            <div className="flex items-center justify-between relative z-10">
               <div className="flex flex-col">
                  <h2 className="text-xl font-magic font-extrabold text-orange-500 uppercase tracking-tight">Current Selection</h2>
                  <div className="flex items-center gap-2">
                     <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest">{deckbox.reduce((acc, curr) => acc + curr.qty, 0)} CARDS READY</p>
                     {deckbox.length > 0 && (
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                          € {deckbox.reduce((acc, curr) => acc + (parseFloat(curr.prices?.eur || "0") * curr.qty), 0).toFixed(2)}
                        </span>
                     )}
                  </div>
               </div>
               <button onClick={() => setIsDeckboxOpen(false)} className="p-2 hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-cyan-500/30 hover:text-cyan-400 group">
                 <X className="w-5 h-5 text-white/50 group-hover:text-cyan-400" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2 relative z-10">
               {deckbox.map(item => (
                 <div 
                   key={item.name} 
                   className="flex gap-3 rune-panel bg-black/40 p-3 rounded-sm hover:border-cyan-500/30 transition-all z-10 group relative"
                   onMouseEnter={() => setHoveredPreviewCard(item.highRes || item.thumb)}
                   onMouseLeave={() => setHoveredPreviewCard(null)}
                 >
                    <div className="w-14 h-18 rounded overflow-hidden border border-white/10 shrink-0 group-hover:border-cyan-500/50 transition-colors">
                       <img src={item.thumb} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                       <div className="space-y-0.5">
                          <h4 className="text-[11px] font-black uppercase text-white/80 group-hover:text-cyan-400 transition-colors truncate">{item.name}</h4>
                          <p className="text-[8px] font-mono text-orange-500/60 uppercase tracking-widest leading-none">{item.from_deck}</p>
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <button onClick={(e) => { e.stopPropagation(); updateCardQty(item.name, -1); }} className="w-6 h-6 rounded bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all">
                               <Minus className="w-3 h-3" />
                             </button>
                             <span className="text-[10px] font-mono font-black text-white w-4 text-center">{item.qty}</span>
                             <button onClick={(e) => { e.stopPropagation(); updateCardQty(item.name, 1); }} className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-black hover:bg-orange-600 transition-all font-black">
                               <Plus className="w-3 h-3" />
                             </button>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); updateCardQty(item.name, -999); }} className="text-red-500 opacity-20 group-hover:opacity-100 transition-opacity p-1">
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
                       <img src={hoveredPreviewCard} className="w-full h-auto rounded-lg shadow-2xl" alt="Preview" />
                       <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none" />
                       <div className="mt-2 text-center">
                         <span className="text-[8px] font-magic font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">Tactical Preview Active</span>
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
               <div className="grid grid-cols-2 gap-2">
                 <button 
                  onClick={copyDecklist}
                  disabled={deckbox.length === 0}
                  className={`py-4 rounded-xl text-black font-black text-[10px] shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none font-magic uppercase tracking-widest ${copied ? 'bg-green-500' : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(249,115,22,0.25)] hover:brightness-110'}`}
                 >
                   {copied ? <RotateCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                   {copied ? 'COPIED!' : 'COPY'}
                 </button>
                 <button 
                  onClick={() => setShowShareOverlay(true)}
                  disabled={deckbox.length === 0}
                  className="py-4 bg-cyan-600/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-magic font-black text-[10px] hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-20 uppercase tracking-widest"
                 >
                   <Users className="w-4 h-4" />
                   SHARE
                 </button>
               </div>
               <button 
                onClick={async () => {
                  if (!user) return;
                  const batch = writeBatch(db);
                  deckbox.forEach(item => {
                    const cardId = item.name.replace(/[^a-zA-Z0-9]/g, '_');
                    const cardRef = doc(db, 'users', user.uid, 'deckbox', cardId);
                    batch.delete(cardRef);
                  });
                  await batch.commit().catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/deckbox`));
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
              message.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 
              message.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-100' :
              'bg-orange-500/20 border-orange-500/30 text-orange-100'
            }`}
          >
            {message.type === 'error' ? <Zap className="w-5 h-5 text-red-500" /> : 
             message.type === 'success' ? <RotateCw className="w-5 h-5 text-green-500" /> :
             <Wand2 className="w-5 h-5 text-orange-500" />}
            <p className="font-magic font-bold text-[10px] uppercase tracking-widest">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100 transition-opacity">
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
                <p className="text-orange-500 font-magic font-extrabold uppercase tracking-[0.3em] text-sm animate-pulse">Searching...</p>
                <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Searching cards...</p>
              </div>
            </div>
        </div>
      )}
      {/* Admin Chamber Modal */}
      <AnimatePresence>
        {showAdminChamber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300]"
          >
            <AdminChamber 
              isOpen={showAdminChamber} 
              onClose={() => setShowAdminChamber(false)} 
              setActiveDeckId={setActiveDeckId}
              setActiveDeckName={setActiveDeckName}
              setExistingInDeck={setExistingInDeck}
              setCurrentCI={setCurrentCI}
              setViewMode={setViewMode}
              performSearch={performSearch}
              initializeDeckState={initializeDeckState}
              setViewingDeckName={setViewingDeckName}
              fetchArchidektDeck={fetchArchidektDeck}
              setIsViewingDeck={setIsViewingDeck}
              showMessage={showMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roadmap Modal */}
      <AnimatePresence>
        {showRoadmap && (
          <RoadmapModal 
            isOpen={showRoadmap} 
            onClose={() => setShowRoadmap(false)} 
          />
        )}
      </AnimatePresence>

      <ShareSelectionOverlay 
        show={showShareOverlay}
        onClose={() => setShowShareOverlay(false)}
        onShare={shareSelection}
        email={shareRecipientEmail}
        setEmail={setShareRecipientEmail}
        loading={isSharing}
      />

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
                  <h3 className="text-xl font-magic font-bold text-emerald-400 uppercase tracking-wider">Tag Verification</h3>
                  <p className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-[0.2em]">Semantic Analysis Active</p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-gray-400 text-[13px] leading-relaxed">
                  Your tag <span className="text-emerald-400 font-bold">"{tagToVerify.tag}"</span> 
                  {tagToVerify.isAmbiguous 
                    ? " seems ambiguous. It might be a name, a mechanic, or oracle text. Please clarify."
                    : " yielded no precise matches in this Commander's color identity. Did you mean one of these?"}
                </p>

                <div className="space-y-2">
                   {tagToVerify.suggestions.map((suggestion, idx) => (
                     <button
                       key={idx}
                       onClick={() => finalizeTag(tagToVerify.deckId, tagToVerify.tag, suggestion)}
                       className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group flex items-center justify-between"
                     >
                       <span className="text-white group-hover:text-emerald-400 transition-colors font-mono text-xs">{suggestion}</span>
                       <span className="text-[10px] font-magic font-bold text-white/20 group-hover:text-emerald-500/40 uppercase tracking-widest">Apply</span>
                     </button>
                   ))}
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() => finalizeTag(tagToVerify.deckId, tagToVerify.tag, tagToVerify.originalQuery)}
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
            <div className="absolute inset-0" onClick={() => setCommanderPreview(null)} />
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              className="flex flex-col sm:flex-row gap-8 items-center justify-center relative z-10"
            >
              {commanderPreview.map((cmd, i) => {
                const sc = cmd.scryfallData || cmd;
                const imgSrc = sc.image_uris?.large || sc.card_faces?.[0]?.image_uris?.large || sc.image_uris?.normal || sc.card_faces?.[0]?.image_uris?.normal || sc.image_uris?.png || cmd.art_crop;
                
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
                      <h3 className="text-xl font-magic font-black text-white uppercase tracking-widest">{cmd.name}</h3>
                      <p className="text-xs text-orange-500 font-magic font-bold uppercase tracking-[0.2em] mt-1">Prime Commander</p>
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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setCommanderSelection(null)} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="rune-panel p-8 rounded-2xl w-full max-w-4xl relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-magic font-black text-orange-500 uppercase tracking-widest">Select Commander</h2>
                <p className="text-xs text-white/40 font-mono uppercase tracking-[0.2em]">We couldn't clearly identify your commander. Please select one below.</p>
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
                      <img src={images.normal} alt={card.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-[10px] font-magic font-bold text-white uppercase tracking-wider">{card.name}</p>
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
function RoadmapModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const manualSections = [
    {
      group: "VAULT & COLLECTION",
      nodes: [
        { term: "LIBRARY", flow: "Collection", desc: "Opens your saved decks. Here you can search through your collection, view your decks, and manage your files." },
        { term: "ADD DECK", flow: "Import", desc: "Paste an Archidekt/TappedOut URL or ID. Click 'Add' to import external data into your collection." },
        { term: "DELETE", flow: "Remove", desc: "Removes a deck from your collection. Requires confirmation to prevent accidental data loss." }
      ]
    }, {
      group: "DISCOVERY & SEARCH",
      nodes: [
        { term: "SEARCH", flow: "Scryfall Search", desc: "Search for cards using Scryfall. Supports keyword, color, and mechanic searches across the card database." },
        { term: "SYNERGY", flow: "Suggestions", desc: "Analyzes your deck's tags and suggests cards that align with your current deck's theme and cards." },
        { term: "VEGGIES", flow: "Quick Filter", desc: "Quick filters for 'Ramp', 'Draw', and 'Board Wipes'. Automatically matched to your deck's colors." }
      ]
    }, {
      group: "ARCANE UTILITIES",
      nodes: [
        { term: "SHERIFF", flow: "Game Variant", desc: "Explains the rules of this 5+ player Commander variant involving hidden roles: Sheriff, Deputies, Outlaws, and a Renegade." },
        { term: "JUDGE RUXA", flow: "AI Judge", desc: "Ask the AI rules judge for help with complex Magic rules questions." },
        { term: "SOCIALS", flow: "Community", desc: "Connect with public users, view shared card selections, and browse popular content creators." }
      ]
    }, {
      group: "DECK OPERATIONS",
      nodes: [
        { term: "LIST", flow: "Table View", desc: "Displays your deck as a categorized table. Useful for raw data inspection and spotting gaps in your card types." },
        { term: "CARDS", flow: "Grid View", desc: "The standard visual mode. Displays card art in a responsive grid for browsing and building." },
        { term: "CARDBOARD", flow: "Shopping List", desc: "Mark cards you need. Displays price estimates and allows for text export for ordering physical cards." }
      ]
    }, {
      group: "LOGISTICS & HISTORY",
      nodes: [
        { term: "STATS", flow: "Analytics", desc: "Visualizes mana curve, color distribution, and card types. Use this to balance your deck's land count and resources." },
        { term: "SETS", flow: "Expansions", desc: "Browse every MTG set release from Alpha to the latest expansions in chronological order." },
        { term: "ROADMAP", flow: "Manual", desc: "The functional guide you are currently reading. Explains all system capabilities and interactions." }
      ]
    }
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
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(rgba(34,197,94,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
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
                     <h2 className="text-2xl font-magic font-black text-green-400 uppercase tracking-[0.5em] leading-none mb-3">Deck Companion Manual // v2.6.16</h2>
                     <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-amber-500 shadow-[0_0_10px_orange]" />
                        <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.8em]">Library_Active // Companion_Active</p>
                     </div>
                  </div>
               </div>
               <button 
                  onClick={onClose}
                  className="px-8 py-3 border border-white/10 rounded group hover:border-cyan-500/40 hover:text-cyan-400 transition-all font-mono text-[11px] text-white/20 uppercase tracking-[0.3em]"
               >
                  Close Manual <X className="w-4 h-4 inline-block ml-3 group-hover:rotate-90 transition-transform" />
               </button>
            </div>

            {/* Sitemap Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-12 lg:p-16">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                  {manualSections.map((section, idx) => (
                    <div key={idx} className="space-y-12">
                       <div className="flex items-center gap-4">
                          <h3 className={`text-sm font-magic font-black uppercase tracking-[0.4em] ${idx === 3 ? 'text-amber-400' : 'text-green-400'}`}>{section.group}</h3>
                          <div className={`flex-1 h-px ${idx === 3 ? 'bg-amber-500/10' : 'bg-green-500/10'}`} />
                       </div>

                       <div className="space-y-10">
                          {section.nodes.map((node, nIdx) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (idx * 0.1) + (nIdx * 0.05) }}
                              key={nIdx}
                              className="relative pl-10 border-l border-white/5 group"
                            >
                               <div className="absolute left-[-1px] top-3 w-[3px] h-6 bg-green-500/0 group-hover:bg-green-500 transition-all" />
                               <div className="absolute left-[-4px] top-[14px] w-2 h-2 bg-black border border-white/20 rotate-45 group-hover:border-green-500 group-hover:bg-green-500/20 transition-all" />

                               <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                     <span className={`text-[13px] font-magic font-black uppercase tracking-widest transition-colors ${idx === 3 ? 'text-amber-400/80 group-hover:text-amber-300' : 'text-white/80 group-hover:text-green-400'}`}>
                                        {node.term}
                                     </span>
                                     <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${idx === 3 ? 'text-amber-500/30' : 'text-green-500/30'}`}>{node.flow}</span>
                                  </div>
                                  <p className="text-[12px] text-white/30 leading-relaxed font-sans font-light group-hover:text-white/60 transition-colors">
                                     {node.desc}
                                  </p>
                               </div>
                            </motion.div>
                          ))}
                       </div>
                    </div>
                  ))}
               </div>

               {/* System Logic Banner */}
               <div className="mt-24 p-12 border border-green-500/10 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/[0.02] to-transparent pointer-events-none" />
                  <div className="flex items-center gap-10 relative z-10">
                    <Zap className="w-12 h-12 text-green-500 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.2)]" />
                    <div>
                      <h4 className="text-xs font-magic font-black text-green-400 uppercase tracking-[0.4em] mb-3">Deck Integrity Check</h4>
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
                     {["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ"].map(r => (
                        <div key={r} className="w-12 h-12 border border-white/5 flex items-center justify-center font-magic text-green-500/10 text-2xl hover:text-green-500/40 hover:border-green-500/20 transition-all cursor-default">{r}</div>
                     ))}
                  </div>
                </div>
            </div>

            {/* Footer Bottom Bar */}
            <div className="px-10 py-6 border-t border-white/5 bg-black/80 flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <span className="text-[10px] font-mono text-white/10 uppercase tracking-[0.8em]">My Decks Command Centre</span>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-magic text-green-500/40 uppercase tracking-widest">Library Secured</span>
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
    for (let i = 0; i <= 7; i++) counts[i === 7 ? '7+' : i.toString()] = 0;
    
    cards.forEach(dc => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const typeLine = (card?.type_line || '').toLowerCase();
      if (typeLine.includes('land')) return;
      let cmc = Math.floor(card?.cmc || 0);
      if (cmc >= 7) counts['7+']++;
      else counts[cmc.toString()]++;
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cards]);

  const colorData = useMemo(() => {
    // Defensive counting to ensure accurate visualization
    const counts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    cards.forEach(dc => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      if (!card) return;
      
      const typeLine = (card.type_line || '').toLowerCase();
      if (typeLine.includes('land')) return; 

      // Extract colors from card cost or identity
      // Normalize colors to single letters WUBRG
      const colors = (card.colors || card.color_identity || [])
        .map((c: string) => c.replace(/\{|\}/g, '').toUpperCase())
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
      Other: 0
    };
    
    cards.forEach(dc => {
      const card = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
      const tl = (card?.type_line || '').toLowerCase();
      if (tl.includes('creature')) counts.Creatures++;
      else if (tl.includes('instant')) counts.Instants++;
      else if (tl.includes('sorcery')) counts.Sorceries++;
      else if (tl.includes('artifact')) counts.Artifacts++;
      else if (tl.includes('enchantment')) counts.Enchantments++;
      else if (tl.includes('land')) counts.Lands++;
      else if (tl.includes('planeswalker')) counts.Planeswalkers++;
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
    
    cards.forEach(dc => {
       const qty = dc.quantity || 1;
       total += qty;
       const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
       const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
       const tl = (oracle?.type_line || scryfall?.type_line || dc.card?.type_line || '').toLowerCase();
       
       if (tl.includes('land')) {
          lands += qty;
       } else {
          const cmc = oracle?.cmc || scryfall?.cmc || dc.card?.cmc || 0;
          totalCmc += (cmc * qty);
          nonLands += qty;
       }
       if (tl.includes('creature')) creatures += qty;
    });
    
    const avgCmc = nonLands > 0 ? (totalCmc / nonLands) : 0;
    
    // Synergies summary
    const categories: string[] = [];
    cards.forEach(dc => {
      const qty = dc.quantity || 1;
      const cats = dc.categories || [];
      for (let i = 0; i < qty; i++) categories.push(...cats);
    });
    const topCategories = [...new Set(categories)].map(cat => ({
      name: cat,
      count: categories.filter(c => c === cat).length
    })).sort((a, b) => b.count - a.count).slice(0, 3);

    return { total, lands, creatures, avgCmc, topCategories };
  }, [cards]);

  const COLORS_RECHART = {
    W: '#f8f6d3',
    U: '#0e68ab',
    B: '#1a1a1a',
    R: '#d3202a',
    G: '#00733e',
    C: '#90adbb'
  };

  const TYPE_COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative z-10 w-full mb-32">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none flex items-center justify-center mix-blend-screen bg-center bg-cover bg-no-repeat rounded-[3rem]" style={{ backgroundImage: `url(${runesBackground})` }} />
      {/* Tactical Briefing */}
      <div className="rune-panel bg-green-500/5 border border-green-500/10 rounded-3xl p-8 relative z-20 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
         <h4 className="text-[12px] font-magic font-black text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Tactical Briefing
         </h4>
         <div className="space-y-3">
            <p className="text-[11px] text-white/70 leading-relaxed">
               Deck consists of <span className="text-white font-bold">{stats.total} entries</span>. 
               The energy core maintains an average of <span className="text-green-400 font-bold">{stats.avgCmc.toFixed(2)} CMC</span>.
            </p>
            <p className="text-[11px] text-white/50 leading-relaxed">
               Primary strategic anchors detected: {stats.topCategories.map(c => <span key={c.name} className="text-white/80 font-mono px-1.5 py-0.5 bg-white/5 rounded border border-white/5 mx-0.5">{c.name}</span>)}
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ fontSize: '10px', color: '#22d3ee' }}
                cursor={{ fill: 'rgba(34,211,238,0.05)' }}
              />
              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <h3 className="text-[8px] font-magic font-bold text-cyan-400 uppercase tracking-widest mb-4">Color Weight</h3>
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
                    <Cell key={`cell-${index}`} fill={COLORS_RECHART[entry.name as keyof typeof COLORS_RECHART] || '#8884d8'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
          <h3 className="text-[8px] font-magic font-bold text-cyan-400 uppercase tracking-widest mb-4">Type Logistics</h3>
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
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
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

// Admin Chamber Component
function AdminChamber({ 
  isOpen, 
  onClose,
  showMessage,
  setActiveDeckId,
  setActiveDeckName,
  setExistingInDeck,
  setCurrentCI,
  setViewMode,
  performSearch,
  initializeDeckState,
  setViewingDeckName,
  fetchArchidektDeck,
  setIsViewingDeck
}: { 
  isOpen: boolean, 
  onClose: () => void,
  showMessage: (text: string, type?: 'info' | 'error' | 'success') => void,
  setActiveDeckId: (id: string | null) => void,
  setActiveDeckName: (name: string) => void,
  setExistingInDeck: (names: Set<string>) => void,
  setCurrentCI: (ci: string) => void,
  setViewMode: (mode: any) => void,
  performSearch: (opts?: any) => void,
  initializeDeckState: any,
  setViewingDeckName: (name: string) => void,
  fetchArchidektDeck: (id: string, autoSelect?: boolean) => void,
  setIsViewingDeck: (val: boolean) => void,
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDecks, setUserDecks] = useState<any[]>([]);
  const [userDeckbox, setUserDeckbox] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLocalLoading(true);
        try {
          const snap = await getDocs(query(collection(db, 'users')));
          const uList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          uList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
          setUsers(uList);
          if (uList.length > 0) loadUserData(uList[0]);
        } catch (e) { 
          console.error(e);
          showMessage("Neural Registry Connection Failure", "error");
        }
        setLocalLoading(false);
      };
      fetchUsers();
    }
  }, [isOpen]);

  const loadUserData = async (u: any) => {
    setSelectedUser(u);
    setLocalLoading(true);
    try {
      const decksSnap = await getDocs(collection(db, 'users', u.id, 'decks'));
      const deckboxSnap = await getDocs(collection(db, 'users', u.id, 'deckbox'));
      setUserDecks(decksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUserDeckbox(deckboxSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLocalLoading(false);
  };

  const deleteUserDeck = async (deckId: string) => {
     if (!selectedUser) return;
     if (confirm("PERMANENTLY VOID VOLUME?")) {
        try {
           await deleteDoc(doc(db, 'users', selectedUser.id, 'decks', deckId));
           setUserDecks(prev => prev.filter(d => d.id !== deckId));
           showMessage("Volume Voided", "success");
        } catch (e) {
           console.error(e);
           showMessage("Deletion Shield Active", "error");
        }
     }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-[#020303]/98 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-12 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full h-full max-w-[1700px] max-h-[950px] bg-[#050707] border border-white/10 rounded-[3rem] shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url(${runesBackground})`, backgroundSize: '200px' }} />

        {/* Command Header */}
        <header className="relative z-20 flex items-center justify-between px-10 py-6 border-b border-white/5 bg-black/60 backdrop-blur-3xl">
           <div className="flex items-center gap-8">
              <div className="relative group">
                 <div className="absolute inset-0 bg-emerald-500/20 blur-xl group-hover:bg-emerald-500/30 transition-all duration-700" />
                 <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                 </div>
              </div>
              <div className="space-y-1">
                 <h2 className="text-2xl font-magic font-black uppercase tracking-[0.3em] text-white">Central Oversight</h2>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-[0.5em] text-cyan-400 font-bold opacity-80">Neural Intelligence Active</span>
                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden lg:flex flex-col items-end pr-6 border-r border-white/5">
                 <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest leading-none mb-1.5">System Load: 4%</span>
                 <span className="text-[8px] font-mono text-emerald-400/40 uppercase tracking-widest leading-none">Connection: Encrypted</span>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-400 transition-all duration-300 active:scale-90 shadow-lg group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* User Feed - High Density */}
          <aside className="w-80 border-r border-white/5 bg-black/40 flex flex-col p-6 space-y-6">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input 
                  type="text"
                  placeholder="Filter Souls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[10px] text-white focus:border-emerald-500/40 transition-all outline-none font-magic tracking-widest uppercase"
                />
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 relative z-20">
                {filteredUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => loadUserData(u)}
                    className={`w-full group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300
                      ${selectedUser?.id === u.id 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-magic text-sm border transition-all
                      ${selectedUser?.id === u.id ? 'bg-emerald-400 text-black border-emerald-400' : 'bg-white/5 text-white/10 border-white/10'}`}>
                      {u.displayName?.[0] || '?' }
                    </div>
                    <div className="flex-1 text-left min-w-0">
                       <h4 className={`text-[11px] font-black uppercase tracking-wider truncate mb-0.5
                         ${selectedUser?.id === u.id ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                         {u.displayName || 'Soul'}
                       </h4>
                       <p className="text-[8px] font-mono text-emerald-500/20 truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
             </div>
          </aside>

          {/* Intelligence Workspace */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#060909] relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent)] pointer-events-none" />
             
             {selectedUser ? (
               <div className="max-w-6xl mx-auto space-y-12 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-8 relative z-30">
                  {/* Performance Bento Grid Entry */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
                     {/* Dense Profile Banner */}
                     <div className="xl:col-span-12 flex gap-10 bg-white/[0.02] border border-white/5 p-12 rounded-[4rem] items-center relative overflow-hidden group">
                        <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.02))] pointer-events-none" />
                        <div className="relative group/avatar">
                           <div className="w-32 h-32 rounded-full p-1.5 border border-white/10 bg-black shadow-2xl relative z-10 transition-transform duration-700 group-hover/avatar:scale-105">
                              {selectedUser.photoURL ? (
                                <img src={selectedUser.photoURL} alt="Identity" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
                                   <User className="w-12 h-12 text-white/10" />
                                </div>
                              )}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-400 rounded-2xl border-4 border-[#060909] flex items-center justify-center text-black z-20 shadow-xl">
                              <ShieldCheck className="w-5 h-5" />
                           </div>
                        </div>
                        
                        <div className="flex-1 space-y-8">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <h3 className="text-4xl font-magic font-black text-white uppercase tracking-tighter leading-none">{selectedUser.displayName}</h3>
                                 <p className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-[0.4em] font-bold italic">{selectedUser.email}</p>
                              </div>
                              <div className="flex gap-3">
                                 <button className="h-10 px-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-[10px] font-magic font-black text-cyan-400 uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all">Elevate Rank</button>
                                 <button 
                                   onClick={async () => {
                                      if(confirm("ABSOLUTE DATA TERMINATION?")) {
                                         showMessage("Purging signature...", "info");
                                      }
                                   }}
                                   className="h-10 px-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-magic font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Purge Soul</button>
                              </div>
                           </div>
                           <div className="grid grid-cols-4 gap-4">
                              {[
                                 { label: 'Neural Handle', value: '@' + (selectedUser.userName || 'none'), color: 'emerald', icon: <Globe className="w-3 h-3 text-emerald-400/40" /> },
                                 { label: 'Access Level', value: selectedUser.userTitle || 'Wanderer', color: 'cyan', icon: <Sparkles className="w-3 h-3 text-cyan-400/40" /> },
                                 { label: 'Broadcast', value: selectedUser.isPublic ? 'Active' : 'Silent', color: 'orange', icon: <Zap className="w-3 h-3 text-orange-400/40" /> },
                                 { label: 'Neural Link', value: selectedUser.id.slice(0, 12), color: 'white', icon: <Library className="w-3 h-3 text-white/20" /> }
                              ].map((stat, i) => (
                                <div key={i} className="bg-black/60 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 group/stat">
                                   <div className="flex items-center gap-2">
                                      {stat.icon}
                                      <span className="text-[8px] font-magic font-black uppercase tracking-widest text-white/20 group-hover/stat:text-white/40 transition-colors">{stat.label}</span>
                                   </div>
                                   <span className={`text-[11px] font-mono font-bold text-${stat.color}-400/80 uppercase truncate`}>{stat.value}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
                     <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] space-y-10">
                        <div className="flex items-center gap-4 text-white/40">
                           <Library className="w-6 h-6" />
                           <h4 className="text-xs font-magic font-black uppercase tracking-[0.4em]">Volume Statistics</h4>
                        </div>
                        <div className="space-y-8">
                           {[
                              { label: 'Active Grimoires', value: userDecks.length, color: 'emerald', max: 50 },
                              { label: 'Artifact cached', value: userDeckbox.length, color: 'orange', max: 200 }
                           ].map((m, i) => (
                             <div key={i} className="space-y-3">
                                <div className="flex justify-between items-end">
                                   <span className="text-[10px] font-magic font-black text-white/20 uppercase tracking-widest">{m.label}</span>
                                   <span className="text-3xl font-magic font-black text-white leading-none">{m.value}</span>
                                </div>
                                <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                   <div className={`h-full bg-${m.color}-500/40 shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all duration-1000`} style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                     
                     <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-[3rem] flex flex-col overflow-hidden">
                        <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                           <div className="flex items-center gap-4 text-white/40">
                              <Package className="w-6 h-6" />
                              <h4 className="text-xs font-magic font-black uppercase tracking-[0.4em]">Integrated Inventory</h4>
                           </div>
                           <span className="text-[8px] font-mono text-emerald-400 animate-pulse uppercase tracking-widest">Realtime-Feed</span>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar max-h-[350px]">
                           {userDecks.map(deck => (
                             <div key={deck.id} className="group bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-cyan-500/40 transition-all cursor-crosshair">
                                <div className="min-w-0 pr-6">
                                   <h5 className="text-[11px] font-magic font-black text-white/80 uppercase tracking-widest truncate mb-1 group-hover:text-cyan-400 transition-colors">{deck.name}</h5>
                                   <div className="flex items-center gap-4">
                                      <span className="text-[8px] font-mono text-white/20 uppercase">Nodes: {deck.cards?.length || 0}</span>
                                      <span className="text-[8px] font-mono text-cyan-500/40 uppercase font-black tracking-widest leading-none pt-0.5">{deck.colorIdentity || 'C'}</span>
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                   <button 
                                     onClick={async () => {
                                        if(confirm("PURGE VOLUME?")) {
                                           await deleteDoc(doc(db, 'users', selectedUser.id, 'decks', deck.id));
                                           setUserDecks(prev => prev.filter(d => d.id !== deck.id));
                                           showMessage("Volume purged", "success");
                                        }
                                     }}
                                     className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                             </div>
                           ))}
                           {userDecks.length === 0 && (
                             <div className="py-24 text-center opacity-10 uppercase font-magic font-black tracking-[0.5em] text-sm">Registry Entry Void</div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                     {userDecks.map(deck => (
                       <div 
                         key={deck.id}
                         className="bg-black/40 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-6 group hover:border-emerald-500/40 transition-all duration-500 shadow-2xl relative overflow-hidden"
                       >
                          <div className="flex gap-6 items-start">
                             <div className="w-24 h-28 rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-700">
                                {deck.art_crops?.[0] ? (
                                   <img src={deck.art_crops[0]} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 grayscale group-hover:grayscale-0 opacity-40 group-hover:opacity-100" />
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/10 font-magic text-[10px]">EMPTY</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                             </div>
                             <div className="flex-1 min-w-0 pt-2">
                                <h5 className="text-[11px] font-magic font-black text-white uppercase tracking-wider truncate mb-2 group-hover:text-emerald-400 transition-colors">{deck.name}</h5>
                                <div className="flex flex-col gap-3">
                                   <div className="flex items-center gap-3">
                                      <span className="text-[8px] font-mono font-bold text-orange-400 bg-orange-400/5 px-2 py-0.5 rounded border border-orange-400/10">€{deck.totalCost?.toFixed(2) || '0.00'}</span>
                                      <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10 uppercase">{deck.ci || 'C'}</span>
                                   </div>
                                   <p className="text-[8px] text-white/20 font-mono italic truncate">Ref: {deck.id}</p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex gap-3 pt-4 border-t border-white/5">
                             <button 
                               onClick={() => {
                                 setViewingDeckName(deck.name);
                                 fetchArchidektDeck(deck.id, false);
                                 setIsViewingDeck(true);
                               }}
                               className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-magic font-black uppercase tracking-widest text-white/30 hover:text-white transition-all flex items-center justify-center gap-2"
                             >
                                <Maximize2 className="w-3.5 h-3.5" /> Visualize
                             </button>
                             <button 
                               onClick={() => deleteUserDeck(deck.id)}
                               className="w-14 h-14 bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 rounded-2xl text-red-500/30 hover:text-red-500 flex items-center justify-center transition-all"
                             >
                                <Trash2 className="w-4.5 h-4.5" />
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>

                  {userDecks.length === 0 && (
                     <div className="py-32 flex flex-col items-center justify-center text-center opacity-10">
                        <Database className="w-20 h-20 mb-6" />
                        <p className="text-xl font-magic font-black uppercase tracking-[0.5em]">No Data Artifacts</p>
                     </div>
                  )}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center relative">
                  <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full animate-pulse opacity-20" />
                  <div className="relative z-10 opacity-30">
                     <ShieldCheck className="w-24 h-24 mb-8 text-emerald-500 mx-auto" />
                     <h3 className="text-3xl font-magic font-black text-white uppercase tracking-[0.5em]">Command Hub Standby</h3>
                     <p className="text-[11px] font-mono uppercase tracking-[0.3em] mt-6 max-w-sm mx-auto text-emerald-400/60 leading-relaxed font-bold">
                        Awaiting authorization pattern. Select a Seeker signature to decrypt their specific grimoire catalog and cardboard assets.
                     </p>
                  </div>
               </div>
             )}
          </main>
        </div>
      </motion.div>
      
      {localLoading && (
        <div className="absolute inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center">
           <div className="flex flex-col items-center gap-6">
              <RotateCw className="w-12 h-12 text-emerald-400 animate-spin" />
              <p className="text-[9px] font-magic font-black uppercase tracking-[0.6em] text-emerald-400 animate-pulse">Syncing Neural Grid...</p>
           </div>
        </div>
      )}
    </div>
  );
}

// MTG Judge Component
function JudgeView() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hallo! Mijn naam is Ruxa, Bear Judge. Ik help je graag met de complexe regels van ons mooie spel. Waar kan ik m'n tanden in zetten?" }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForSelection, setWaitingForSelection] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [selectedCards, setSelectedCards] = useState<Record<string, string>>({});
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
      const res = await axios.get(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
      return res.data.data.slice(0, 5);
    } catch (e) { return []; }
  };

  const fetchCardContext = async (name: string): Promise<string> => {
    try {
      const res = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
      const data = res.data;
      const typeLine = data.type_line || 'Type: Unknown';
      const cmc = data.cmc !== undefined ? `Mana Value: ${data.cmc}` : '';
      const pt = (data.power && data.toughness) ? `P/T: ${data.power}/${data.toughness}` : '';
      const oracle = data.oracle_text || 'Geen regeltekst gevonden.';
      const colors = data.color_identity?.join(', ') || 'Kleurloos';
      return `**Kaart: ${data.name}**\n**Metadata:** ${typeLine} | ${cmc} | ${pt}\n**Color Identity:** ${colors}\n**Regeltekst:** ${oracle}\n`;
    } catch (e) { return `**Kaart: ${name}**\n*Kon kaartdata niet vinden.*\n`; }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const queryStr = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: queryStr }]);
    setInput("");
    setIsProcessing(true);
    setPendingQuery(queryStr);

    try {
      // 1. Extract card names
      const systemPrompt = `Je bent een gespecialiseerde Magic: The Gathering kaartnaam extractor. Extraheer ALLE MTG kaartnamen uit de tekst van de gebruiker. 
      Geef ALLEEN de namen terug als een komma-gescheiden lijst. 
      Let op: Zelfs gedeeltelijke namen of bijnamen moeten worden herkend als MTG kaarten als ze duidelijk daarnaar verwijzen.
      Als er geen kaarten zijn, geef dan een lege string terug.`;
      
      if (!ai) {
        throw new Error("AI not initialized. Check GEMINI_API_KEY.");
      }

      // Using gemini-flash-latest as a stable alias
      const response = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: queryStr }] }],
        config: {
          systemInstruction: systemPrompt
        }
      });
      
      const text = response.text || "";
      const extracted = text.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 2);
      
      // 2. Validate cards and check for ambiguity
      const newSuggestions: Record<string, string[]> = {};
      const validNames: string[] = [];

      for (const name of extracted) {
         try {
           const scryRes = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
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
      let errorMsg = "Oei, mijn mentale archief is even onbereikbaar. Probeer het over een momentje opnieuw.";
      if (err.message) {
        if (err.message.includes("AI not initialized")) {
          errorMsg = "Mijn excuses, de archieven zijn nog niet ontsloten. Configureer de GEMINI_API_KEY om mijn wijsheid te raadplegen.";
        } else if (err.message.includes("API key expired")) {
          errorMsg = "Mijn excuses, mijn API key lijkt verlopen te zijn. Vernieuw deze in de instellingen.";
        } else {
          errorMsg = `Er is iets misgegaan: ${err.message.slice(0, 50)}...`;
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
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
          return <img key={i} src={MANA_SYMBOL_URIS[symbol]} alt={symbol} className="inline-block w-4 h-4 mx-0.5 align-middle brightness-125 saturate-150 shadow-[0_0_5px_rgba(255,255,255,0.2)]" />;
        }
        return <span key={i} className="font-mono font-bold text-green-400">{`{${part}}`}</span>;
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
          const res = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
          cardsData.push(res.data);
          context += `**Kaart: ${res.data.name}**\n**Metadata:** ${res.data.type_line} | Mana Value: ${res.data.cmc} | P/T: ${res.data.power}/${res.data.toughness}\n**Color Identity:** ${res.data.color_identity?.join(', ')}\n**Regeltekst:** ${res.data.oracle_text}\n`;
        } catch (e) {
          context += `**Kaart: ${name}**\n*Kon kaartdata niet vinden.*\n`;
        }
      }

      const systemPrompt = `Je bent Ruxa, een deskundige maar bondige Magic: The Gathering Judge. 
      
      MISSIE:
      Beantwoord regelsvragen van de gebruiker direct en trefzeker. Gebruik de meegeleverde context als bron.
      
      RICHTLIJNEN VOOR STIJL EN TAAL:
      - Antwoord in het NEDERLANDS, maar gebruik de officiële ENGELSE Magic jargon (bijv. "state-based actions", "priority", "stack", "trigger", "resolven"). Gebruik termen als "resolven" in plaats van "resolving zijn geweest".
      - GEBRUIK GEEN opmaak zoals sterretjes (* of **) voor het jargon; laat de tekst vloeiend in de zin staan.
      - NOEM NOOIT specifieke regelnummers (bijv. CR 123.4) tenzij de gebruiker er expliciet naar vraagt.
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
        const response = await (ai as any).models.generateContent({
          model: modelId,
          contents: [{ parts: [{ text: userMessage }] }],
          config: {
            systemInstruction: systemPrompt
          }
        });
        ruling = response.text || "";
      } catch (e: any) {
        console.error("Ruxa API error:", e);
        if (e.message && e.message.includes("503")) {
           throw new Error("De AI is momenteel overbelast. Probeer het over een minuutje weer!");
        }
        if (e.message && e.message.includes("API key expired")) {
          throw new Error("API key expired. Vernieuw je Gemini API key in de instellingen.");
        }
        throw e;
      }

      setMessages(prev => [...prev, 
        { 
          role: 'assistant', 
          content: ruling,
          relatedCards: cardsData
        }
      ]);
    } catch (err: any) {
      console.error(err);
      const detail = err.message ? ` (${err.message.slice(0, 50)}...)` : "";
      setMessages(prev => [...prev, { role: 'assistant', content: `Mijn excuses, de archieven zijn tijdelijk verzegeld.${detail}` }]);
    }
    setIsProcessing(false);
    setWaitingForSelection(false);
    setSuggestions({});
    setSelectedCards({});
    setLastExtracted(new Set());
  };

  const handleSelectionConfirm = () => {
    const finalCards = [...lastExtracted];
    Object.values(selectedCards).forEach(name => {
      if (!(name as string).includes("Negeer")) finalCards.push(name as string);
    });
    generateRuling(pendingQuery, finalCards);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-[#050505] rounded-3xl">
      {/* Background Runes */}
      <div className="absolute inset-0 opacity-100 pointer-events-none select-none overflow-hidden rounded-3xl">
        <div className="absolute top-1/4 left-1/4 text-[80vw] font-magic leading-none opacity-[0.02] text-green-500 -translate-x-1/2 -translate-y-1/2">Γ</div>
        <div className="absolute bottom-1/4 right-1/4 text-[60vw] font-magic leading-none opacity-[0.02] text-emerald-500 translate-x-1/4 translate-y-1/4">Λ</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full border-[2vw] border-dashed border-green-500/5 rotate-12 animate-[spin_120s_linear_infinite]"></div>
      </div>

      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-2 sm:p-4 overflow-visible relative group/ruxa z-10">
        {/* Decorative Ruxa Background */}
        <div className="absolute left-0 bottom-0 w-[450px] h-[90%] pointer-events-none z-0 hidden lg:block opacity-0 group-hover/ruxa:opacity-100 focus-within:opacity-100 transition-all duration-700 transform translate-x-10 group-hover/ruxa:-translate-x-56 focus-within:-translate-x-56">
          <img 
            src="/ruxa.png" 
            alt="Peeking Ruxa" 
            className="w-full h-full object-contain object-bottom drop-shadow-[0_0_40px_rgba(16,185,129,0.3)] -scale-x-100" 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>

        <div className="rune-panel flex-1 flex flex-col rounded-[2.5rem] overflow-hidden border-green-500/10 shadow-[0_0_50px_rgba(16,185,129,0.1)] bg-[#020402]/90 backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="p-6 border-b border-green-500/10 flex items-center justify-between bg-green-950/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Gavel className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="font-magic font-black text-sm uppercase tracking-[0.2em] text-green-400">Ruxa's Court</h2>
              <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Bear Judge Oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/5 rounded-full border border-green-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-mono uppercase text-green-500/60 font-black tracking-widest">Connected</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-lg overflow-hidden
                  ${msg.role === 'user' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
                >
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <img src="/ruxa.png" alt="R" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                </div>
                <div className={`p-4 rounded-3xl text-sm font-sans leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-orange-500/5 border border-orange-500/10 text-orange-100 rounded-tr-none' 
                    : 'bg-green-500/5 border border-green-500/10 text-green-50 rounded-tl-none'}`}
                >
                   {renderRuxaContent(msg.content)}
                   {msg.relatedCards && msg.relatedCards.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {msg.relatedCards.map((card: any, idx: number) => (
                          <div key={idx} className="group/card relative w-20 sm:w-24 aspect-[2.5/3.5] rounded-lg overflow-hidden border border-white/10 hover:border-green-400/50 transition-all flex-shrink-0 shadow-lg">
                            <img 
                              src={card.image_uris?.small || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.small} 
                              alt={card.name}
                              className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <p className="text-[6px] font-mono text-white truncate text-center">{card.name}</p>
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
                    <div className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-magic font-black uppercase text-green-500/40 tracking-widest">Consulting Rules...</span>
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
                <span className="text-[9px] font-magic font-black text-green-400 uppercase tracking-widest">Identificatie Verifiëren</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(suggestions).map(([term, choices]) => (
                  <div key={term} className="space-y-1">
                    <p className="text-[8px] font-bold text-green-500/40 uppercase pl-1">Voor "{term}":</p>
                    <select 
                      onChange={(e) => setSelectedCards(prev => ({ ...prev, [term]: e.target.value }))}
                      className="w-full bg-black/60 border border-green-500/20 rounded-xl px-4 py-2.5 text-[10px] text-green-100 outline-none focus:border-green-400 transition-all cursor-pointer"
                    >
                      <option value="">Selecteer kaart...</option>
                      {(choices as string[]).map((c, cidx) => <option key={`${c}-${cidx}`} value={c}>{c}</option>)}
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
             Beer Judge Ruxa is een AI-assistent. Verifieer uitspraken altijd met de officiële regels.
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

function SetExplorer({ setViewMode, performSearch, setSearchQuery }: { 
  setViewMode: (v: string) => void;
  performSearch: (o: any) => void;
  setSearchQuery: (s: string) => void;
}) {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['core', 'expansion']));

  const ALL_FILTERS = [
    { id: 'main', labels: ['core', 'expansion'], name: 'Main Sets' },
    { id: 'commander', labels: ['commander'], name: 'Commander' },
    { id: 'masters', labels: ['masters', 'draft_innovation'], name: 'Masters/Draft' },
    { id: 'modern', labels: ['eternal', 'alchemy'], name: 'Modern/Eternal' },
    { id: 'masterpiece', labels: ['masterpiece', 'arsenal', 'spellbook', 'from_the_vault'], name: 'Masterpieces' },
    { id: 'decks', labels: ['starter', 'box', 'duel_deck', 'premium_deck'], name: 'Box/Decks' },
    { id: 'multiplayer', labels: ['planechase', 'archenemy', 'vanguard', 'minigame'], name: 'Multiplayer' },
    { id: 'promo', labels: ['promo', 'treasure_chest', 'funny'], name: 'Promo/Funny' },
    { id: 'extras', labels: ['token', 'memorabilia'], name: 'Tokens/Extras' }
  ];

  const toggleFilter = (labels: string[]) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      const isAllActive = labels.every(l => next.has(l));
      if (isAllActive) {
        labels.forEach(l => next.delete(l));
      } else {
        labels.forEach(l => next.add(l));
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchSets() {
      try {
        const data = await fetchScryfallSets();
        const today = new Date();
        
        const excludedCodes = ['otp', 'big', 'pip', 'rex', 'mom', 'mat', 'plst', 'ha7', 'ea3']; 
        
        const filtered = data.data.filter((s: ScryfallSet) => {
          return s.card_count > 0 &&
            (!s.digital || s.set_type === 'alchemy') && 
            !excludedCodes.includes(s.code.toLowerCase()) &&
            !s.name.toLowerCase().includes("omenpaths");
        }).map((s: any) => {
          const childCodes = data.data
            .filter((sub: any) => sub.parent_set_code === s.code)
            .map((sub: any) => sub.code);
          return {
            ...s,
            queryCodes: [s.code, ...childCodes],
            isFuture: s.released_at ? new Date(s.released_at) > today : false
          };
        });

        const roadmapSets = [
          { name: 'Lorwyn Eclipsed', date: '2026-01-01', code: 'LOR' },
          { name: 'Teenage Mutant Ninja Turtles', date: '2026-03-01', code: 'TMN' },
          { name: 'Secrets of Strixhaven', date: '2026-04-01', code: 'STX2' },
          { name: 'Marvel Super Heroes', date: '2026-06-01', code: 'MVL' },
          { name: 'The Hobbit', date: '2026-08-01', code: 'HBT' },
          { name: 'Reality Fracture', date: '2026-10-01', code: 'RF' },
          { name: 'Universes Beyond: Star Trek', date: '2026-11-01', code: 'STK' }
        ];

        roadmapSets.forEach(rs => {
          const rsDate = new Date(rs.date);
          const isFarFuture = rsDate > today;

          const existingIdx = filtered.findIndex((m: any) => 
            m.name.toLowerCase().includes(rs.name.toLowerCase().split(' ')[0]) || 
            (m.released_at && m.released_at.startsWith(rs.date.substring(0, 7)))
          );

          if (existingIdx !== -1) {
            // Already added from Scryfall. Assure the correct query codes and just rely on Scryfall's date and isFuture.
          } else {
            filtered.push({
              id: `roadmap-${rs.code}`,
              name: rs.name,
              released_at: rs.date,
              set_type: 'expansion',
              code: rs.code,
              queryCodes: [rs.code],
              icon_svg_uri: 'https://svgs.scryfall.io/sets/modern.svg',
              isFuture: isFarFuture
            } as any);
          }
        });

        filtered.sort((a: any, b: any) => {
           const dA = new Date(a.released_at || '1970-01-01').getTime();
           const dB = new Date(b.released_at || '1970-01-01').getTime();
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

  const filteredSets = sets.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeFilters.has(s.set_type);
    return matchesSearch && matchesType;
  });

  const onSetClick = (codes: string[]) => {
    setSearchQuery("");
    setViewMode('cards');
    performSearch({ 
      queryOverride: `(${codes.map(c => `s:${c}`).join(" OR ")}) -is:token -is:art_series`,
      autoSelect: true,
      skipCI: true,
      skipFormatFilters: true
    });
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col w-full bg-[#050505]">
      {/* Background Runes */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 text-[80vw] font-magic leading-none opacity-[0.02] text-cyan-500 -translate-x-1/2 -translate-y-1/2">۞</div>
        <div className="absolute bottom-1/4 right-1/4 text-[60vw] font-magic leading-none opacity-[0.02] text-purple-500 translate-x-1/4 translate-y-1/4">Σ</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full border-[2vw] border-dashed border-white/5 opacity-10 animate-[spin_120s_linear_infinite]"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20 relative z-10 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="pt-4" />

          <div className="flex flex-col items-center gap-6 max-w-xl mx-auto mb-16 relative z-20">
            <div className="relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter Expansions (e.g. MH3, INN)..."
                className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs focus:border-cyan-500/50 outline-none transition-all font-sans tracking-wider text-white shadow-xl"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ALL_FILTERS.map(f => {
                const isActive = f.labels.every(l => activeFilters.has(l));
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.labels)}
                    className={`px-4 py-2 rounded-full text-[9px] font-magic font-bold uppercase tracking-widest border transition-all backdrop-blur-md ${isActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/60 text-white/40 border-white/10 hover:border-cyan-500/30'}`}
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
              <p className="text-[10px] font-magic font-bold text-white/20 uppercase tracking-widest">Expansions loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-2 gap-y-4 sm:gap-x-4 sm:gap-y-6 px-2 relative z-10 w-full">
              {filteredSets.map(set => (
                  <div key={set.id || set.code}
                  onClick={() => onSetClick(set.queryCodes || [set.code])}
                  className="group relative aspect-square flex items-center justify-center p-2 hover:scale-[1.15] active:scale-[0.95] transition-all duration-500"
                >
                  <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 pointer-events-none
                    ${set.isFuture ? 'bg-orange-500' : 'bg-cyan-500'}
                  `} />
                  
                  <img 
                    src={set.icon_svg_uri} 
                    className={`w-full h-full object-contain invert transition-all duration-500 relative z-10
                      ${set.isFuture ? 'opacity-30 group-hover:opacity-100 grayscale brightness-125 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'opacity-40 group-hover:opacity-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]'}
                    `}
                    alt={set.code}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://svgs.scryfall.io/sets/modern.svg";
                    }}
                  />
                  
                  {set.isFuture && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] z-20" />
                  )}

                  <div className="absolute inset-x-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0 z-[100]">
                    <div className="mx-auto w-fit bg-black/90 px-3 py-1 rounded border border-white/10 shadow-2xl backdrop-blur-md whitespace-nowrap flex items-center gap-2">
                      <span className={`text-[9px] font-magic font-bold uppercase tracking-widest drop-shadow-md flex-1 text-center
                        ${set.isFuture ? 'text-orange-400' : 'text-cyan-400'}
                      `}>
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

function ReleaseCalendar({ setViewMode, performSearch, setSearchQuery }: { 
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
          return s.released_at.startsWith('2026') || new Date(s.released_at) >= today;
        });

        const validTypes = ['expansion', 'core'];
        const mainSets = futureRaw.filter((s: any) => 
          validTypes.includes(s.set_type) && 
          !s.digital && 
          !s.name.toLowerCase().includes("omenpaths") &&
          !s.name.toLowerCase().includes("art series") &&
          !s.name.toLowerCase().includes("promo")
        );

        let mapped = mainSets.map((main: any) => {
          const childCodes = data.data
            .filter((sub: any) => sub.parent_set_code === main.code)
            .map((sub: any) => sub.code);
          return {
            ...main,
            fullName: main.name,
            queryCodes: [main.code, ...childCodes]
          };
        });

        // Filter to show late 2025 and all of 2026
        const filtered = mapped.filter(m => {
          const d = new Date(m.released_at);
          const year = d.getFullYear();
          return year === 2026 || (year === 2025 && d.getMonth() >= 9) || year > 2026;
        });

        filtered.push({
          code: "stk",
          name: "Universes Beyond: Star Trek",
          released_at: "2026-11-01",
          set_type: "expansion",
          icon_svg_uri: "",
          queryCodes: ["stk"],
          fullName: "Universes Beyond: Star Trek"
        });

        filtered.sort((a: any, b: any) => new Date(a.released_at).getTime() - new Date(b.released_at).getTime());
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
    setViewMode('cards');
    performSearch({ 
      queryOverride: `(${codes.map(c => `s:${c}`).join(" OR ")}) -is:token -is:art_series`,
      autoSelect: true,
      skipCI: true,
      skipFormatFilters: true
    });
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col bg-[#050505] w-full">
      {/* Background Runes */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-0 right-0 text-[60vw] font-magic leading-none opacity-[0.03] text-cyan-500 translate-x-1/4 -translate-y-1/4">Ж</div>
        <div className="absolute bottom-0 left-0 text-[50vw] font-magic leading-none opacity-[0.03] text-orange-500 -translate-x-1/4 translate-y-1/4">Ѧ</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full border-[10vw] border-white/5 opacity-10"></div>
      </div>

      <div className="text-center pt-12 z-10 space-y-2">
        <h3 className="text-3xl md:text-5xl font-magic font-black text-white uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">RELEASE CALENDAR 2026</h3>
        <p className="text-[8px] md:text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em] md:tracking-[0.5em] font-black underline decoration-cyan-500/20 underline-offset-8">GLIMPSE INTO THE FUTURE OF THE MULTIVERSE</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RotateCw className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 relative flex items-center justify-center mt-10 overflow-visible w-full">
          {/* Main Horizontal Timeline Line */}
          <div className="absolute left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-orange-500 top-1/2 -translate-y-1/2 opacity-30 shadow-[0_0_30px_rgba(6,182,212,0.5)] z-0" />
          
          <div className="flex w-full px-4 md:px-12 items-center justify-between h-full relative z-20 overflow-visible flex-nowrap min-w-min">
            {timeline.map((set, idx) => {
              const isTop = idx % 2 === 0;
              const releaseDate = new Date(set.released_at);
              const isFarFuture = releaseDate.getFullYear() > 2026 || (releaseDate.getFullYear() === 2026 && releaseDate.getMonth() >= 5); 
              const accentColor = isFarFuture ? 'text-orange-500' : 'text-cyan-500';
              const glowColor = isFarFuture ? 'rgba(249,115,22,1)' : 'rgba(6,182,212,1)';
              const maskSrc = set.icon_svg_uri || 'https://svgs.scryfall.io/sets/modern.svg';

              return (
                <div key={set.id || set.code || idx} className="relative flex-1 flex justify-center group h-full items-center shrink-0 min-w-[80px]">
                  {/* Vertical Connector Path */}
                  <div className={`absolute left-1/2 -translate-x-1/2 w-[1px] md:w-px bg-white/10 transition-all duration-700
                    ${isTop ? 'bottom-1/2 h-16 sm:h-24 lg:h-32' : 'top-1/2 h-16 sm:h-24 lg:h-32'}
                    group-hover:bg-cyan-500/50 group-hover:opacity-100 opacity-20
                  `} />

                  {/* Node Dot on Line */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full border-2 bg-black transition-all duration-500
                      ${isFarFuture ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]' : 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]'}
                      group-hover:scale-150 group-hover:bg-current ${accentColor}
                    `} />
                  </div>

                  {/* Content Stack (Alternating) */}
                  <div className={`flex flex-col justify-center items-center gap-1 sm:gap-4 lg:gap-8 absolute left-1/2 -translate-x-1/2 transition-all duration-1000 w-24 sm:w-32 lg:w-40 z-30
                    ${isTop ? 'bottom-1/2 mb-4 sm:mb-6 lg:mb-10' : 'top-1/2 mt-4 sm:mt-6 lg:mt-10'}
                    group-hover:${isTop ? 'mb-6 sm:mb-8 lg:mb-12' : 'mt-6 sm:mt-8 lg:mt-12'}
                  `}>
                    
                    {/* Icon Circle */}
                    <button onClick={() => onReleaseClick(set.queryCodes)} className={`w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center bg-black border-2 border-white/5 relative z-30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-125 shrink-0 focus:outline-none cursor-pointer
                      ${isFarFuture ? 'group-hover:border-orange-500 shadow-orange-500/20' : 'group-hover:border-cyan-500 shadow-cyan-500/20'}
                    `}>
                      <div className="absolute inset-0 rounded-full bg-radial-gradient from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className={`w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 transition-all duration-700 z-10 opacity-40 group-hover:opacity-100`} style={{ filter: `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 15px ${glowColor})`}}>
                         <img 
                            src={maskSrc} 
                            alt={set.name}
                            className={`w-full h-full object-contain invert transition-all duration-700`}
                            onError={(e) => (e.currentTarget.src = 'https://svgs.scryfall.io/sets/modern.svg')}
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
                      <p className={`text-[5px] sm:text-[6px] lg:text-[8px] font-mono uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap ${accentColor}`}>
                        {releaseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#050505] rounded-3xl">
      {/* Background Runes */}
      <div className="absolute inset-0 opacity-100 pointer-events-none select-none overflow-hidden rounded-3xl">
        <div className="absolute top-1/4 left-1/4 text-[80vw] font-magic leading-none opacity-[0.02] text-amber-500 -translate-x-1/2 -translate-y-1/2">Ϟ</div>
        <div className="absolute bottom-1/4 right-1/4 text-[60vw] font-magic leading-none opacity-[0.02] text-cyan-500 translate-x-1/4 translate-y-1/4">Σ</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full border-[2vw] border-dashed border-amber-500/5 rotate-45 animate-[spin_150s_linear_infinite]"></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-12 pb-32">
          {/* Header */}
          <div className="text-center relative">
            <div className="absolute left-1/2 -top-4 -translate-x-1/2 flex gap-4 opacity-10">
              <span className="text-4xl font-magic">Ю</span>
              <span className="text-4xl font-magic">Ѧ</span>
              <span className="text-4xl font-magic">Ж</span>
            </div>
            <h2 className="text-5xl font-magic font-black text-white uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">Outlaw Sheriff</h2>
            <p className="text-xs text-white/50 font-mono tracking-[0.5em] uppercase mb-8">Ethereal-02: Social Subversion</p>
            <div className="max-w-2xl mx-auto rune-panel p-6 rounded-3xl bg-cyan-950/20 border-cyan-500/20">
              <p className="text-sm text-cyan-100/80 font-sans leading-relaxed">
                Sheriff is a social Commander variant where players receive secret roles with different objectives. In addition to normal Magic play, it involves bluffing, cooperation, and betrayal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Setup */}
            <div className="rune-panel p-8 rounded-[2rem] space-y-6 bg-black/60 border-cyan-500/10 group hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Settings className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-magic font-bold text-cyan-400 uppercase tracking-widest">Setup</h3>
              </div>
              <div className="space-y-4 text-sm text-white/70">
                <p className="font-bold text-amber-500/90 font-mono tracking-widest uppercase text-xs">Standard Commander rules apply.</p>
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <strong className="text-cyan-300 block mb-2 uppercase text-[10px] tracking-widest">Role Distribution:</strong>
                  <ul className="space-y-2 font-mono text-[11px]">
                    <li className="flex items-center gap-2 text-amber-400"><div className="w-1 h-1 bg-amber-400 rounded-full" /> 1 Sheriff (Publicly revealed)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500/50 rounded-full" /> 1+ Deputies (Secret)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-500/50 rounded-full" /> 1+ Outlaws (Secret)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-purple-500/50 rounded-full" /> 1 Renegade (Secret)</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <strong className="text-cyan-300 block mb-2 uppercase text-[10px] tracking-widest">Starting Life:</strong>
                  <div className="flex justify-between items-center px-2">
                    <div className="text-center">
                      <p className="text-[10px] opacity-50 mb-1">SHERIFF</p>
                      <p className="text-2xl font-magic text-green-400">40</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-[10px] opacity-50 mb-1">OTHERS</p>
                      <p className="text-2xl font-magic text-white">30</p>
                    </div>
                  </div>
                </div>
                <p className="text-center py-2 px-4 bg-cyan-500/5 border border-cyan-500/10 rounded-full text-[10px] uppercase tracking-widest"><strong className="text-cyan-300">Starting Player:</strong> The Sheriff always starts.</p>
              </div>
            </div>

            {/* Game Dynamics */}
            <div className="rune-panel p-8 rounded-[2rem] space-y-6 bg-black/60 border-amber-500/10 group hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-xl font-magic font-bold text-amber-500 uppercase tracking-widest">Dynamics</h3>
              </div>
              <div className="space-y-4 text-sm text-white/70">
                {[
                  { title: "Social Deduction", desc: "Uncover roles through behavior and actions.", color: "text-amber-500" },
                  { title: "Negotiation", desc: "Bluffing and temporary alliances are strictly encouraged.", color: "text-amber-500" },
                  { title: "Politics", desc: "Cooperation is possible, but trust is your primary resource.", color: "text-amber-500" },
                  { title: "Subterfuge", desc: "Misleading others is a valid path to victory.", color: "text-amber-500" }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
                    <div className={`mt-1 font-magic text-xs ${item.color}`}>{idx + 1}</div>
                    <div>
                      <strong className={`block text-[11px] uppercase tracking-widest mb-0.5 ${item.color}`}>{item.title}</strong>
                      <p className="text-xs text-white/50">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Roles & Objectives */}
          <div className="space-y-8 relative">
            <h3 className="text-3xl font-magic font-black text-center text-white uppercase tracking-[0.4em]">Roles & Alliances</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { 
                  name: "Sheriff", 
                  icon: Shield, 
                  color: "amber", 
                  status: "Public (Revealed)", 
                  obj: "Survive and eliminate all Outlaws and the Renegade.",
                  win: "All Outlaws and the Renegade are defeated."
                },
                { 
                  name: "Outlaw", 
                  icon: Flame, 
                  color: "red", 
                  status: "Secret (Hidden)", 
                  obj: "Eliminate the Sheriff at all costs.",
                  win: "The Sheriff is eliminated while at least one Outlaw remains."
                },
                { 
                  name: "Deputy", 
                  icon: Users, 
                  color: "blue", 
                  status: "Secret (Guardian)", 
                  obj: "Protect the Sheriff and ensure their victory.",
                  win: "The Sheriff wins (even if you fall in battle)."
                },
                { 
                  name: "Renegade", 
                  icon: Skull, 
                  color: "purple", 
                  status: "Secret (Solo)", 
                  obj: "Be the last player standing in the court.",
                  win: "Everyone else is eliminated."
                }
              ].map((role, idx) => (
                <div key={idx} className={`rune-panel p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-all bg-[#0a0a0a]/80 border-${role.color}-500/20 border`}>
                  <div className={`absolute top-0 left-0 w-1 h-full bg-${role.color}-500/50`} />
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-2xl bg-${role.color}-500/10 border border-${role.color}-500/20`}>
                      <role.icon className={`w-6 h-6 text-${role.color}-500`} />
                    </div>
                    <h4 className={`text-2xl font-magic font-bold text-${role.color}-500 uppercase tracking-[0.2em]`}>{role.name}</h4>
                  </div>
                  <div className="space-y-3 text-sm text-white/60">
                    <p><strong className="text-white/80 font-mono text-[10px] tracking-widest uppercase mr-2">Status:</strong> {role.status}</p>
                    <p><strong className="text-white/80 font-mono text-[10px] tracking-widest uppercase mr-2">Objective:</strong> {role.obj}</p>
                    <div className={`mt-4 pt-4 border-t border-${role.color}-500/20`}>
                      <p className={`text-[11px] font-magic font-bold text-${role.color}-400 uppercase tracking-widest`}>
                        <Sparkles className="w-3 h-3 inline mr-2" /> Wins if: {role.win}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Count Distribution */}
          <div className="rune-panel p-8 rounded-[2.5rem] bg-black/60 border border-white/5 relative">
            <h3 className="text-lg font-magic font-bold text-white/80 uppercase tracking-[0.3em] text-center mb-8">Infiltration Overview</h3>
            
            <div className="grid grid-cols-5 gap-4 mb-6 text-center">
              {[
                { label: "Players", color: "text-cyan-400" },
                { label: "Sheriff", color: "text-amber-500" },
                { label: "Outlaws", color: "text-red-500" },
                { label: "Deputies", color: "text-blue-500" },
                { label: "Renegade", color: "text-purple-500" }
              ].map(head => (
                <div key={head.label} className={`text-[10px] font-mono font-black uppercase tracking-widest ${head.color}`}>
                  {head.label}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {[
                { p: 4, s: 1, o: 2, d: 0, r: 1 },
                { p: 5, s: 1, o: 2, d: 1, r: 1 },
                { p: 6, s: 1, o: 3, d: 1, r: 1 },
                { p: 7, s: 1, o: 3, d: 2, r: 1 },
                { p: 8, s: 1, o: 3, d: 3, r: 1 }
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 items-center text-center font-magic text-lg">
                  <div className="text-white font-black">{row.p}</div>
                  <div className="text-amber-500 opacity-80">{row.s}</div>
                  <div className="text-red-500 opacity-80">{row.o}</div>
                  <div className="text-blue-500 opacity-80">{row.d}</div>
                  <div className="text-purple-500 opacity-80">{row.r}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-3xl bg-cyan-950/10 border border-cyan-500/10">
              <h3 className="text-xs font-magic font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> Core Constraints
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/50">
                <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" /> Roles are strictly hidden at start (except Sheriff).</li>
                <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" /> Voluntary reveal is permitted as a political gambit.</li>
                <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" /> Identity is publicly broadcast upon total elimination.</li>
                <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1 shrink-0" /> Termination occurs instantly when any win-state is met.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
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
function getCardImages(card: any): { small: string; normal: string; border_crop: string; art_crop: string } {
  const images = card.image_uris || card.card_faces?.[0]?.image_uris || {};
  return {
    small: images.small || '',
    normal: images.normal || '',
    border_crop: images.border_crop || '',
    art_crop: images.art_crop || ''
  };
}

function SocialsPage({ 
  setViewMode, 
  user,
  setViewingPublicDecks,
  setViewingPublicUser,
  setIsViewingDeck,
  setIsSettingsOpen
}: { 
  setViewMode: (m: any) => void;
  user: any;
  setViewingPublicDecks: (d: any[]) => void;
  setViewingPublicUser: (u: any) => void;
  setIsViewingDeck: (v: boolean) => void;
  setIsSettingsOpen: (v: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<'community' | 'shared' | 'creators'>('community');
  const [publicUsers, setPublicUsers] = useState<any[]>([]);
  const [sharedMessages, setSharedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunity = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('isPublic', '==', true)));
        const users: any[] = [];
        usersSnap.forEach(d => {
          if (user && d.id === user.uid) return;
          users.push({ id: d.id, ...d.data() });
        });
        setPublicUsers(users);

        if (user?.email) {
          const sharedSnap = await getDocs(query(collection(db, 'sharedSelections'), where('toUserEmail', '==', user.email.toLowerCase())));
          const shared: any[] = [];
          sharedSnap.forEach(d => shared.push({ id: d.id, ...d.data() }));
          setSharedMessages(shared);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunity();
  }, [user]);

  const creators = [
    { name: "The Professor", channel: "@TolarianCommunityCollege", icon: "https://yt3.googleusercontent.com/ytc/AIdro_k1S7f1C2weTXJyZZO-SykHaEoWeWblN_cu0szVe6cpPw=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@TolarianCommunityCollege", desc: "MTG's most distinguished educator. Excellent for product reviews and gameplay." },
    { name: "The Command Zone", channel: "@commandcast", icon: "https://yt3.googleusercontent.com/ytc/AIdro_ndVswsCvdE-r0J6NFNlhDyHIjxZnvgntVBuWLznMSFig=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@commandcast", desc: "The definitive source for Commander strategy and high-production gameplay." },
    { name: "MTGGoldfish", channel: "@MTGGoldfish", icon: "https://yt3.googleusercontent.com/ytc/AIdro_lPUFQn84lDHcw2D_BoZAOSi2YjEC1hJ4HaPue3JfYX0A=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@MTGGoldfish", desc: "SaffronOlive's home for decks, news, and budget magic Brews." },
    { name: "PleasantKenobi", channel: "@PleasantKenobi", icon: "https://yt3.googleusercontent.com/vr61wfGEBnaksZUQU42DANjkr23T-IXSjt4rqCaUZEqjFMgl9_ceO4VpfaQ150a0i_P1i7_T8g=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@PleasantKenobi", desc: "Vince's unique blend of MTG analysis, humor, and salt." },
    { name: "Rhystic Studies", channel: "@RhysticStudies", icon: "https://yt3.googleusercontent.com/p_ZWKYGKSGUrYWftjj-8mdO8vG4vD0vQJDv20aDVsaEoer-stgrFwITXvhH2kEXjdiUvzY9Wag=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@RhysticStudies", desc: "Exquisite video essays exploring the art and history of Magic." },
    { name: "Joel are Magic", channel: "@JoelareMagic", icon: "https://yt3.googleusercontent.com/GLoSrfNCIAQkEqMMSHfoPoKQvvJBt03NLEpzGnrzkruJGtdvhQf0d-aoWoqJBOIlg4oS9WEOHnE=s160-c-k-c0x00ffffff-no-rj", url: "https://www.youtube.com/@JoelareMagic", desc: "Cinematic EDH gameplay featuring special guests and big personalities." },
  ];

  const shareText = encodeURIComponent(`Master Your Multiverse! Check out Rune Deck Companion: ${window.location.href}`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const emailUrl = `mailto:?subject=Join Move to Rune Deck&body=${shareText}`;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#050505] relative overflow-hidden">
       {/* Background Aesthetics */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.1),transparent_50%)]" />
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.1),transparent_50%)]" />
       
       <div className="max-w-7xl mx-auto w-full px-6 py-12 relative z-10 flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
             <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                      <Users className="w-6 h-6 text-cyan-400" />
                   </div>
                   <h1 className="text-4xl font-magic font-black text-white uppercase tracking-tighter">Socials</h1>
                </div>
                <p className="text-sm font-mono text-white/30 uppercase tracking-[0.3em]">Connect with the community</p>
             </div>

             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                {(['community', 'shared'] as const).map(tab => (
                   <button
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={`px-6 py-2.5 rounded-xl text-[10px] font-magic font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white/60'}`}
                   >
                      {tab}
                   </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                   {activeTab === 'community' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                      >
                         {/* Active Users Section */}
                         <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                               <Users className="w-4 h-4 text-orange-500" />
                               <h3 className="text-xs font-magic font-black text-white/80 uppercase tracking-[0.2em]">Active Users</h3>
                            </div>
                            {loading ? (
                              <div className="py-20 flex justify-center">
                                 <ManaSpinner className="w-12 h-12" />
                              </div>
                            ) : publicUsers.length === 0 ? (
                              <div className="py-20 text-center rune-panel">
                                 <p className="text-white/20 font-magic font-black uppercase tracking-widest">No public users found.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {publicUsers.map(u => (
                                   <PublicUserCard 
                                      key={u.id} 
                                      user={u} 
                                      onClick={async () => {
                                         const decksSnap = await getDocs(collection(db, 'users', u.id, 'decks'));
                                         const decks: any[] = [];
                                         decksSnap.forEach(d => decks.push({ id: d.id, ...d.data() }));
                                         setViewingPublicDecks(decks);
                                         setViewingPublicUser(u);
                                         setIsViewingDeck(true);
                                      }}
                                   />
                                 ))}
                              </div>
                            )}
                         </div>

                         {/* Creators Section */}
                         <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                               <Sparkles className="w-4 h-4 text-cyan-400" />
                               <h3 className="text-xs font-magic font-black text-white/80 uppercase tracking-[0.2em]">Creators</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {creators.map((c, i) => (
                                 <CreatorCard key={i} {...c} />
                               ))}
                            </div>
                         </div>
                      </motion.div>
                   )}

                   {activeTab === 'shared' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                      >
                         {sharedMessages.length === 0 ? (
                           <div className="py-20 text-center rune-panel bg-white/[0.02]">
                              <Mail className="w-12 h-12 text-white/5 mx-auto mb-4" />
                              <p className="text-white/20 font-magic font-black uppercase tracking-widest">You have no shared cards.</p>
                           </div>
                         ) : (
                           <div className="space-y-4">
                              {sharedMessages.map(msg => (
                                <div key={msg.id} className="rune-panel p-6 bg-white/[0.03] hover:bg-white/[0.05] transition-all group">
                                   <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                            <Send className="w-4 h-4 text-cyan-400 rotate-12" />
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-[10px] font-magic font-black text-cyan-400/80 uppercase tracking-widest">Shared Cards</span>
                                            <span className="text-[11px] font-sans font-black text-white/60">{msg.fromUserEmail}</span>
                                         </div>
                                      </div>
                                      <span className="text-[9px] font-mono text-white/20">{msg.createdAt?.toDate().toLocaleDateString()}</span>
                                   </div>
                                   <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
                                      {msg.cards.slice(0, 8).map((card: any, idx: number) => (
                                        <div key={idx} className="aspect-[0.71] rounded-sm overflow-hidden border border-white/10 relative group/card">
                                           <img src={card.thumb} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform" />
                                           {msg.cards.length > 8 && idx === 7 && (
                                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                                 <span className="text-[10px] font-magic font-black text-white">+{msg.cards.length - 7}</span>
                                              </div>
                                           )}
                                        </div>
                                      ))}
                                   </div>
                                   <div className="flex gap-3">
                                      {/* Logic to import this selection to current deckbox or library can be added here */}
                                      <button 
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-magic font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${copiedId === msg.id ? 'bg-green-500 text-black border-transparent' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'}`}
                                        onClick={() => {
                                          const clipboard = msg.cards.map((c: any) => `${c.qty || 1} ${c.name}`).join('\n');
                                          navigator.clipboard.writeText(clipboard);
                                          setCopiedId(msg.id);
                                          setTimeout(() => setCopiedId(null), 2000);
                                        }}
                                      >
                                         {copiedId === msg.id ? <Check className="w-3 h-3" /> : null}
                                         {copiedId === msg.id ? 'Copied' : 'Copy Decklist'}
                                      </button>
                                      <button 
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"
                                        onClick={async () => {
                                          await deleteDoc(doc(db, 'sharedSelections', msg.id));
                                          setSharedMessages(prev => prev.filter(p => p.id !== msg.id));
                                        }}
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </div>
                                </div>
                              ))}
                           </div>
                         )}
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <div className="space-y-8">
                {/* User Status / Toggle */}
                <div className="rune-panel p-8 bg-gradient-to-br from-white/[0.03] to-transparent border-white/5 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.1),transparent_70%)]" />
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-full border-2 border-orange-500/30 p-1 flex items-center justify-center group-hover:border-orange-500 transition-all duration-700">
                           <div className="w-full h-full rounded-full bg-orange-500/10 flex items-center justify-center">
                              <User className="w-6 h-6 text-orange-500" />
                           </div>
                         </div>
                         <div>
                            <h3 className="font-magic font-black text-white uppercase tracking-widest">My Profile</h3>
                            <div className="flex items-center gap-2 mt-1">
                               <div className={`w-2 h-2 rounded-full animate-pulse ${user ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                               <span className="text-[9px] font-mono font-black text-white/30 uppercase tracking-[0.2em]">{user ? 'Connected' : 'Offline'}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl">
                         <p className="text-[10px] text-white/40 leading-relaxed uppercase font-mono tracking-widest italic mb-4">
                            Connect with other players to share card selections and browse public decks.
                         </p>
                         <div className="grid grid-cols-2 gap-2">
                            <a 
                               href={whatsappUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group flex flex-col items-center gap-2 text-center"
                            >
                               <Share2 className="w-4 h-4 text-cyan-400/50 group-hover:text-cyan-400" />
                               <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest group-hover:text-cyan-400">WhatsApp</span>
                            </a>
                            <a 
                               href={emailUrl}
                               className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group flex flex-col items-center gap-2 text-center"
                            >
                               <Mail className="w-4 h-4 text-orange-500/50 group-hover:text-orange-500" />
                               <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-widest group-hover:text-orange-500">Email Link</span>
                            </a>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Tactical Suggestions */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-2">
                      <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                      <h3 className="text-xs font-magic font-black text-white/80 uppercase tracking-[0.2em]">Social Tips</h3>
                   </div>
                   <div className="rune-panel p-6 bg-black/40 border-white/5 space-y-4">
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-start text-left gap-4 group"
                      >
                         <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-black transition-all">
                            <Settings className="w-4 h-4 text-orange-500 group-hover:text-black" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-mono text-white/60 uppercase leading-snug tracking-tighter group-hover:text-white transition-colors">
                               Customize your arcane profile and social visibility.
                            </p>
                            <span className="text-[8px] text-white/20 uppercase font-black tracking-widest mt-2 block">Link: Security Config</span>
                         </div>
                      </button>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function CreatorCard({ name, channel, icon, url, desc }: any) {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="rune-panel p-6 bg-[#0c0c0c] hover:bg-cyan-500/5 border-white/5 hover:border-cyan-500/30 transition-all duration-500 flex flex-col gap-4 group relative overflow-hidden h-full"
    >
       <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl group-hover:shadow-cyan-500/20">
             <img src={icon} alt={name} className="w-full h-full object-cover" />
          </div>
          <div>
             <h3 className="text-lg font-magic font-black text-white uppercase tracking-tighter group-hover:text-cyan-400 transition-colors leading-tight">{name}</h3>
             <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-[9px] font-mono text-orange-500/80 uppercase tracking-widest font-black">{channel}</p>
             </div>
          </div>
       </div>
       <p className="text-[10px] font-sans text-white/40 leading-relaxed uppercase tracking-tight group-hover:text-white/60 transition-colors relative z-10 line-clamp-3">
          {desc}
       </p>
       <div className="flex items-center gap-2 mt-auto pt-4 relative z-10">
          <div className="h-[1px] flex-1 bg-white/10 group-hover:bg-cyan-500/30 transition-all" />
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 group-hover:border-cyan-500/30 transition-all">
             <span className="text-[8px] font-magic font-black text-white/40 group-hover:text-cyan-400 uppercase tracking-widest">Connect</span>
             <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-cyan-400" />
          </div>
       </div>
    </a>
  );
}

function PublicUserCard({ user, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="rune-panel p-6 bg-[#0c0c0c] hover:bg-orange-500/5 border-white/5 hover:border-orange-500/30 transition-all duration-500 cursor-pointer group relative flex items-center justify-between"
    >
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden group-hover:border-orange-500/50 transition-colors shadow-lg">
             {user.photoURL ? (
                <img src={user.photoURL} alt={user.userName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
             ) : (
                <User className="w-6 h-6 text-white/20" />
             )}
          </div>
          <div>
             <h3 className="text-sm font-magic font-black text-white uppercase tracking-widest group-hover:text-orange-400 transition-colors line-clamp-1">{user.displayName || user.userName || 'Elder User'}</h3>
             <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">{user.userTitle || 'Wanderer'}</span>
          </div>
       </div>
       <div className="flex flex-col items-end gap-1">
          <Layers className="w-4 h-4 text-white/10 group-hover:text-orange-500 animate-pulse" />
          <span className="text-[8px] font-magic font-black text-white/20 uppercase tracking-widest">Browse</span>
       </div>
    </div>
  );
}

function ShareSelectionOverlay({ 
  show, 
  onClose, 
  onShare, 
  email, 
  setEmail, 
  loading 
}: any) {
  const [publicUsers, setPublicUsers] = useState<any[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (show) {
      const fetchUsers = async () => {
        setFetchingUsers(true);
        try {
          const snap = await getDocs(query(collection(db, 'users'), where('isPublic', '==', true)));
          const users: any[] = [];
          snap.forEach(d => users.push({ id: d.id, ...d.data() }));
          setPublicUsers(users);
        } catch (e) {
          console.error(e);
        } finally {
          setFetchingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [show]);

  return (
    <AnimatePresence>
       {show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          >
             <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="w-full max-w-md bg-gradient-to-br from-[#121212] to-[#050505] border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden relative"
             >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.1),transparent_70%)] pointer-events-none" />
                <div className="p-8 space-y-6 relative z-10">
                   <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                         <Send className="w-8 h-8 text-cyan-400" />
                      </div>
                      <h2 className="text-2xl font-magic font-black text-white uppercase tracking-tighter">Share Selection</h2>
                      <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-[0.3em] font-mono">Select a recipient</p>
                   </div>

                   <div className="space-y-4">
                      {/* Public Users Quick Select */}
                      <div className="space-y-2">
                         <label className="text-[8px] font-magic font-black text-white/20 uppercase tracking-widest pl-2">Public Users</label>
                         <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {fetchingUsers ? (
                               <div className="h-10 w-full flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                  <RotateCw className="w-3 h-3 animate-spin text-white/20" />
                                </div>
                            ) : publicUsers.length === 0 ? (
                               <div className="text-[8px] text-white/10 font-bold uppercase tracking-widest py-2 px-4 italic">No public users detected...</div>
                            ) : (
                               publicUsers.map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => setEmail(u.email)}
                                    className={`shrink-0 flex items-center gap-2 p-1.5 rounded-xl border transition-all ${email === u.email ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                                  >
                                     <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10">
                                        <img src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.userName}`} className="w-full h-full object-cover" />
                                     </div>
                                     <span className="text-[9px] font-magic font-black uppercase tracking-widest pr-2">{u.displayName || u.userName}</span>
                                  </button>
                               ))
                            )}
                         </div>
                      </div>

                      <div className="relative group">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-cyan-400 transition-colors" />
                         <input 
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           placeholder="MAgic.player@multiverse.com"
                           className="w-full bg-black/40 border border-white/5 rounded-2xl px-12 py-4 text-xs focus:border-cyan-500/50 outline-none text-white transition-all font-mono uppercase"
                         />
                      </div>
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-magic font-black text-white/40 uppercase tracking-widest transition-all"
                      >
                         Cancel
                      </button>
                      <button 
                        onClick={onShare}
                        disabled={loading || !email}
                        className="flex-[2] py-4 bg-cyan-600 shadow-lg shadow-cyan-500/20 rounded-2xl text-[10px] font-magic font-black text-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-20"
                      >
                         {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                         Send Selection
                      </button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
       )}
    </AnimatePresence>
  );
}
