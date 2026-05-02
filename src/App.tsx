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
  Copy, 
  RotateCw, 
  PawPrint, 
  Wand2,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  PlusCircle,
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
  Database,
  Layers,
  Moon,
  Eye,
  User,
  Shield,
  Flame,
  Skull,
  Users,
  Gavel,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
// IMPORTANT: DO NOT CHANGE THE LOGO PATH. 
// The rune_bear.png file is located in the /public folder of the project.
// Using a local path ensures the logo remains visible even if external repos change.
const logo = "/rune_bear.png?v=" + new Date().getTime();

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
  writeBatch
} from 'firebase/firestore';
import { Card, DeckCard, SavedDeck } from './types';


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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminChamber, setShowAdminChamber] = useState(false);

  // Performance and reliability for mobile
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Mandatory connection test
    async function checkConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    }
    checkConnection();
  }, []);

  const saveUserSettings = async (updates: { userTitle?: string, cardsPerRow?: number }) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (updates.userTitle !== undefined) setUserTitle(updates.userTitle);
      if (updates.cardsPerRow !== undefined) setCardsPerRow(updates.cardsPerRow);
      showMessage("Settings updated", "success");
    } catch (err) {
      console.error("Failed to save settings", err);
      showMessage("Failed to save settings", "error");
    }
  };
  const [authLoading, setAuthLoading] = useState(true);

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [deckbox, setDeckbox] = useState<DeckCard[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);

  const [mtgSets, setMtgSets] = useState<{code: string, name: string, icon_svg_uri?: string, isFuture: boolean}[]>([]);

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
    { code: 'hob', name: 'The Hobbit', released_at: '2026-08-01', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/default.svg' },
    { code: 'rf', name: 'Reality Fracture', released_at: '2026-10-01', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/default.svg' },
    { code: 'trek', name: 'Star Trek', released_at: '2026-11-01', set_type: 'expansion', icon_svg_uri: 'https://svgs.scryfall.io/sets/default.svg' }
  ];

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get('https://api.scryfall.com/sets');
        let sortedSets = res.data.data
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

  const [cardsPerRow, setCardsPerRow] = useState<number>(0); // 0 means 'auto' (~220px)
  const [userTitle, setUserTitle] = useState("Planeswalker");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- Auth & Firestore Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      
      if (u) {
        setIsAdmin(u.email === 'sdebeer@gmail.com');
        // Init profile
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.userTitle) setUserTitle(data.userTitle);
          if (data.cardsPerRow !== undefined) setCardsPerRow(data.cardsPerRow);
        }

        setDoc(userRef, {
          userId: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`));
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

      if (localDecks) {
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

      if (localDeckbox) {
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

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      showMessage("Login mislukt: " + error.message, "error");
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [mobileCardsPerRow, setMobileCardsPerRow] = useState<1 | 2>(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [viewingDeckCards, setViewingDeckCards] = useState<any[] | null>(null);
  const [viewingDeckName, setViewingDeckName] = useState("");
  const [isViewingDeck, setIsViewingDeck] = useState(false);
  const [hoveredPreviewCard, setHoveredPreviewCard] = useState<string | null>(null);

  const flatDeckCards = useMemo(() => {
    if (!viewingDeckCards) return [];
    
    return [...viewingDeckCards].sort((a, b) => {
      const nameA = a.card?.oracleCard?.name || a.card?.name || "";
      const nameB = b.card?.oracleCard?.name || b.card?.name || "";
      return nameA.localeCompare(nameB);
    });
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
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'manage_decks' | 'sets' | 'calendar' | 'sheriff' | 'judge'>('cards');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Any");
  const [rarityFilter, setRarityFilter] = useState("Any");
  const [setFilter, setSetFilter] = useState("Any");
  const [colorFilter, setColorFilter] = useState("Any");
  const [archFilter, setArchFilter] = useState("Any");
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
    existingNames: Set<string>
  ) => {
    // Fetch commander details for CI and images
    const commanderDetails = await Promise.all(
      commanderNames.map(name => 
        axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
          .catch(err => {
            console.error(`Commander ${name} not found on Scryfall`, err);
            return { data: null };
          })
      )
    );

    const ciSet = new Set<string>();
    const commandersData: {name: string, art_crop: string, isBackground: boolean}[] = [];
    const artCrops: string[] = [];
    const commanderUrls: string[] = [];

    commanderDetails.forEach((res, index) => {
      const c = res.data;
      if (!c) {
        // If Scryfall failed, we at least keep the name but won't have images/CI
        commandersData.push({ 
          name: commanderNames[index], 
          art_crop: "", 
          isBackground: false 
        });
        return;
      }
      c.color_identity?.forEach((color: string) => ciSet.add(color));
      const imgs: any = getCardImages(c);
      if (imgs.normal) commanderUrls.push(imgs.normal);
      
      const isBackground = c.type_line?.toLowerCase().includes("background");
      const crop = imgs.art_crop || imgs.normal;
      
      if (crop) {
        artCrops.push(crop);
        commandersData.push({ 
          name: c.name, 
          art_crop: crop,
          isBackground: !!isBackground
        });
      }
    });

    // Sort commanders so Backgrounds are always last
    commandersData.sort((a, b) => (a.isBackground ? 1 : 0) - (b.isBackground ? 1 : 0));

    const sortedCommanderUrls = commandersData.map(c => c.art_crop);
    const ciStr = Array.from(ciSet).sort().join("").toLowerCase() || "c";

    // Update saved decks in Firestore
    if (user) {
      const deckRef = doc(db, 'users', user.uid, 'decks', id);
      const existingSnap = await getDoc(deckRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      
      const deckData = {
        id,
        userId: user.uid,
        name: deckName,
        tags: existingData?.tags || [],
        commanders: commanderNames,
        art_crops: sortedCommanderUrls,
        ci: ciStr,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(deckRef, deckData, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${id}`));
    }

    setActiveDeckId(id);
    setActiveDeckName(deckName);
    setExistingInDeck(existingNames);
    setCommanders(commandersData);
    setCurrentCI(ciStr);
    
    // Reset filters when loading a new deck
    setTypeFilter("Any");
    setRarityFilter("Any");
    setSetFilter("Any");
    setArchFilter("Any");
    setColorFilter("Any");
    
    // Perform initial search after loading deck
    performSearch({ ciOverride: ciStr });
  };

  const fetchArchidektDeck = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/ad/${id}`);
      
      const commanderNames: string[] = [];
      const existingNames = new Set<string>();

      data.cards.forEach((dc: any) => {
        const name = dc.card.oracleCard.name;
        existingNames.add(name);
        if (dc.categories?.includes("Commander")) {
          commanderNames.push(name);
        }
      });

      const deckName = data.name || `Deck ${id}`;
      
      await initializeDeckState(id, deckName, commanderNames, existingNames);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to load deck from Archidekt";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTappedOutDeck = async (id: string) => {
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

      if (rawText) {
        const lines = rawText.split('\n');
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;
          
          let cardName = trimmed;
          let isCommander = false;

          // Some TappedOut exports put *CMDR* for the commander
          if (cardName.includes('*CMDR*')) {
            isCommander = true;
            cardName = cardName.replace('*CMDR*', '').trim();
          }

          // Format is typically: "1x Card Name"
          const match = cardName.match(/^(\d+)x?\s+(.+)$/);
          if (match) {
            cardName = match[2].trim();
          }

          if (cardName) {
             existingNames.add(cardName);
             if (isCommander && !commanderNames.includes(cardName)) {
               commanderNames.push(cardName);
             }
          }
        });
      } else if (data.inventory) {
        // Just in case we hit the actual API format
        data.inventory.forEach((item: any) => {
           let cardName = item.card.name;
           existingNames.add(cardName);
           if (item.b === 'commander' && !commanderNames.includes(cardName)) {
             commanderNames.push(cardName);
           }
        });
      }

      await initializeDeckState(id, deckName, commanderNames, existingNames);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to load deck from TappedOut";
      showMessage(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnyDeck = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Detect if URL or direct ID
    let deckId = trimmed;
    let source = "archidekt";

    if (trimmed.includes("tappedout.net")) {
      source = "tappedout";
      const match = trimmed.match(/mtg-decks\/([^/]+)/);
      if (match) deckId = match[1];
    } else if (trimmed.includes("archidekt.com")) {
      source = "archidekt";
      const match = trimmed.match(/decks\/(\d+)/);
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
      await fetchArchidektDeck(deckId);
    } else {
      await fetchTappedOutDeck(deckId);
    }
  };

  const performSearch = async (options?: { 
    queryOverride?: string, 
    ciOverride?: string,
    typeOverride?: string,
    rarityOverride?: string,
    setOverride?: string,
    colorOverride?: string,
    archOverride?: string,
    skipCI?: boolean
  }) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const ci = options?.ciOverride !== undefined ? options.ciOverride : currentCI;
      const type = options?.typeOverride !== undefined ? options.typeOverride : typeFilter;
      const rarity = options?.rarityOverride !== undefined ? options.rarityOverride : rarityFilter;
      const set = options?.setOverride !== undefined ? options.setOverride : setFilter;
      const color = options?.colorOverride !== undefined ? options.colorOverride : colorFilter;
      const arch = options?.archOverride !== undefined ? options.archOverride : archFilter;

      const baseFilters = [
        "game:paper",
        "-is:digital",
        "-is:art_series",
        "-is:funny",
        "-is:token",
        "-t:emblem",
      ];

      if (ci && !options?.skipCI) baseFilters.push(`ci<=${ci}`);
      if (type !== "Any") baseFilters.push(`t:${type}`);
      if (rarity !== "Any") baseFilters.push(`r:${rarity}`);
      if (set !== "Any") baseFilters.push(`s:${set}`);
      if (color !== "Any") {
        if (color === "C") baseFilters.push("c:c");
        else if (color === "Multi") baseFilters.push("c:m");
        else baseFilters.push(`c:${color}`);
      }

      if (arch !== "Any") {
        const role = DECK_ROLES.find(r => r.label === arch);
        if (role) baseFilters.push(role.query);
      }

      let query = baseFilters.join(" ");
      if (options?.queryOverride) {
        query += ` ${options.queryOverride}`;
      } else if (searchQuery.trim()) {
        query += ` (o:"${searchQuery}" OR t:"${searchQuery}" OR "${searchQuery}")`;
      }

      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=desc`;
      console.log("Searching Scryfall:", url);
      const { data } = await axios.get(url);
      setAllCards(data.data || []);
      setViewMode('cards');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAllCards([]);
        // We don't necessarily want to show an "Error" for 404 if it's just no results
      } else {
        console.error("Search failed", err);
        showMessage("Search failed: " + (err.response?.data?.details || err.message), 'error');
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
        from_deck: activeDeckName || "Manual",
        qty: 1
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

  const deleteSavedDeck = async (id: string) => {
    if (!user) return;
    const deckRef = doc(db, 'users', user.uid, 'decks', id);
    await deleteDoc(deckRef).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/decks/${id}`));
    if (activeDeckId === id) setActiveDeckId(null);
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

            if (cardName.includes('*CMDR*')) {
              cardName = cardName.replace('*CMDR*', '').trim();
            }

            const match = cardName.match(/^(\d+)x?\s+(.+)$/);
            if (match) {
              qty = parseInt(match[1]);
              cardName = match[2].trim();
            }

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

  const addTag = async (deckId: string, tag: string) => {
    if (!tag.trim() || !user) return;
    const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
    const deck = savedDecks.find(d => d.id === deckId);
    if (deck && !deck.tags.includes(tag)) {
      await updateDoc(deckRef, { 
        tags: [...deck.tags, tag],
        updatedAt: serverTimestamp() 
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
    }
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

Your goal is to suggest 5-8 highly effective Scryfall search terms (tags) that a player would use to find cards with deep mechanical synergy or strategic value for this specific deck. 
If there are multiple commanders (e.g. Partners or a Commander + Background), focus heavily on the synergy BETWEEN them.

Rules for tags:
1. They must be concise (1-3 words).
2. They should focus on the deck's unique engine and win conditions.
3. Include both mechanical keywords and logical strategy descriptors.
4. Do not include existing tags: ${existingTags.join(', ')}

Return ONLY a comma-separated list of tags. No preamble, no explanation.`;

      if (!ai) {
        showMessage("Geen Gemini API Key beschikbaar. Configuratiefout.", "error");
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const suggestedText = (response.text || "").replace(/[^a-zA-Z0-9,\s-]/g, "");
      const suggestedTags = suggestedText
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0 && !existingTags.includes(t))
        .slice(0, 8);
      
      if (user) {
        const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
        const combined = Array.from(new Set([...existingTags, ...suggestedTags]));
        await updateDoc(deckRef, { 
          tags: combined,
          updatedAt: serverTimestamp() 
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/decks/${deckId}`));
      }
      
      showMessage(`Magic complete! Added ${suggestedTags.length} suggestions.`);
    } catch (err) {
      console.error("Failed to fetch commander for tags", err);
      showMessage("Magic failed... check logs.");
    } finally {
      setLoading(false);
    }
  };

  const renderManaSymbols = (ci: string) => {
    const fixedCI = ci || "c";
    return (
      <div className="flex gap-1">
        {fixedCI.split("").map((s, i) => (
          <img key={`${s}-${i}`} src={MANA_SYMBOL_URIS[s]} className="w-4 h-4" alt={s} />
        ))}
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
                src={MANA_SYMBOL_URIS[s]}
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
          <p className="text-white/20 font-magic tracking-widest text-xs animate-pulse italic">Initializing Rune Magic...</p>
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
            className="w-full flex items-center justify-center gap-3 py-4 rune-panel text-orange-500/80 hover:text-orange-500 hover:border-orange-500/30 transition-all font-magic font-black active:scale-[0.98] tracking-widest text-[10px] z-10"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
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
      <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[40vh] h-[40vh] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#070707]/60 backdrop-blur-2xl border-b border-white/[0.04] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <h1 className="text-sm font-magic font-black uppercase tracking-[0.2em] text-white">Rune Deck</h1>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'cards' && (
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="p-2 text-white/40 hover:text-orange-500 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white/40 hover:text-orange-500 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-[300px] bg-[#0c0c0c] border-r-2 border-[#1a1a1a] shadow-[4px_0_24px_rgba(0,0,0,0.8)] flex flex-col shrink-0 transition-transform duration-500 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="rune-book-spine" />
        <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
        
        <div className="flex flex-col items-center p-6 pb-2 relative z-10">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-white/20"
          >
            <X className="w-5 h-5" />
          </button>
                 <div className="w-24 h-24 mb-4 hover:scale-105 transition-transform cursor-pointer group relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img 
              src={logo} 
              alt="Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(255,152,0,0.6)]"
            />
          </div>
          <h1 className="text-2xl font-magic font-extrabold text-orange-500 tracking-tighter text-center leading-none uppercase">Rune Deck <br/> <span className="text-lg opacity-80">Companion</span></h1>
          <p className="text-[9px] text-cyan-500/40 uppercase tracking-[0.4em] font-bold mt-2">Quick Add-tech</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-10">
          {/* Section 1: Decks */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-orange-500" />
              <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Decks</h2>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => {
                  setActiveDeckId(null);
                  setSearchQuery("");
                  setViewMode('manage_decks');
                }}
                className="w-full flex items-center justify-center gap-2 py-4 rune-panel rounded-sm text-[9px] font-magic font-extrabold uppercase tracking-[0.1em] text-cyan-500/60 hover:text-cyan-400 hover:border-cyan-500/30 transition-all z-10"
              >
                Manage Decks
              </button>
              <div className="relative group">
                <select 
                  className="w-full appearance-none rune-panel rounded-sm px-5 py-4 text-[10px] font-magic font-bold uppercase tracking-[0.2em] text-white/50 outline-none focus:border-cyan-500/50 hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                  onChange={(e) => fetchAnyDeck(e.target.value)}
                  value={activeDeckId || ""}
                >
                  <option value="" disabled className="bg-[#0A0A0A]">Select a Deck...</option>
                  {savedDecks.map(deck => (
                    <option key={deck.id} value={deck.id} className="bg-[#0A0A0A]">{deck.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 pointer-events-none group-hover:text-cyan-400 transition-colors z-20" />
              </div>
              
              {activeDeckId && commanders.length > 0 && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="flex justify-center items-center w-full">
                    <div className="flex items-center -space-x-8">
                       {[...commanders].reverse().map((cmd, i) => (
                          <div key={i} className="relative group hover:z-50 transition-all duration-300 hover:scale-105" style={{ zIndex: i }}>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#0A0A0A] shadow-[0_0_20px_rgba(0,0,0,0.8)] relative group-hover:border-orange-500/50">
                              <img src={cmd.art_crop || undefined} alt={cmd.name} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 mix-blend-overlay" />
                            </div>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[140px] text-[10px] font-magic font-bold text-white bg-black/80 backdrop-blur px-3 py-1 rounded-full uppercase tracking-wider text-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none">
                               {cmd.name}
                            </div>
                          </div>
                       ))}
                    </div>
                  </div>
                  {currentCI && (
                    <div className="flex justify-center scale-150 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] opacity-80 mt-1">
                       {renderManaSymbols(currentCI)}
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>

          {/* Section 3: Search Engine */}
          <section className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-orange-500" />
                <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Search Engine</h2>
              </div>
              
              <div className="space-y-2">
                {activeDeckId && (
                  <button 
                    onClick={() => {
                      const deck = savedDecks.find(d => d.id === activeDeckId);
                      if (deck && deck.tags.length > 0) {
                        const tagQuery = "(" + deck.tags.map(t => `o:"${t}" OR t:"${t}"`).join(" OR ") + ")";
                        setViewMode('cards');
                        performSearch({ queryOverride: tagQuery });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rune-panel text-cyan-500/80 hover:text-cyan-400 hover:border-cyan-500/30 font-black text-[10px] transition-all font-magic uppercase tracking-[0.3em] active:scale-[0.98] z-10"
                  >
                    <Zap className="w-4 h-4" />
                    Tag Based Search
                  </button>
                )}

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Manual search..."
                    className="bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] border border-white/[0.04] rounded-[1.5rem] px-5 py-3.5 text-[10px] font-bold flex-1 focus:border-orange-500/50 outline-none text-white/80 placeholder:text-white/20 transition-all font-sans uppercase tracking-widest"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === 'NumpadEnter') && performSearch()}
                  />
                  <button 
                    onClick={() => performSearch()}
                    className="rune-panel px-5 py-3.5 flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/30 transition-all z-10"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {activeDeckId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-orange-500" />
                  <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Veggie Categories</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DECK_ROLES.slice(0, 4).map((role) => (
                    <button
                      key={role.label}
                      onClick={() => {
                        setSearchQuery("");
                        setArchFilter(role.label);
                        setViewMode('cards');
                        performSearch({ archOverride: role.label, queryOverride: "" });
                      }}
                      className={`py-3 rune-panel rounded-sm text-[8px] font-black transition-all font-magic uppercase tracking-widest z-10 ${archFilter === role.label ? 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10 shadow-[inset_0_1px_5px_rgba(6,182,212,0.2)]' : 'text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5'}`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
                <div className="relative group">
                  <select
                    value={archFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setArchFilter(val);
                      setSearchQuery("");
                      setViewMode('cards');
                      performSearch({ archOverride: val, queryOverride: "" });
                    }}
                    className="w-full appearance-none rune-panel rounded-sm px-5 py-3.5 text-[8px] font-magic font-black uppercase tracking-[0.2em] text-white/50 outline-none focus:border-cyan-500/50 hover:bg-black/40 transition-all cursor-pointer pr-10 z-10"
                  >
                    <option value="Any" className="bg-[#0A0A0A]">All Categories...</option>
                    {DECK_ROLES.map(r => (
                      <option key={r.label} value={r.label} className="bg-[#0A0A0A]">{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/10 pointer-events-none group-hover:text-cyan-400 transition-colors z-20" />
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Deckbox */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-orange-500" />
              <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Deckbox</h2>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsDeckboxOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rune-panel rounded-sm text-orange-500/80 font-magic font-bold text-[10px] uppercase tracking-[0.2em] hover:text-orange-500 hover:border-orange-500/30 transition-all group z-10"
              >
                View Selection
                {deckbox.length > 0 && (
                  <span className="bg-orange-500 text-black px-1.5 py-0.5 rounded-sm text-[8px] font-black shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                    {deckbox.length}
                  </span>
                )}
              </button>
            </div>
          </section>

          {/* Section 5: Fun Area */}
          <section className="space-y-4">
             <div className="flex items-center gap-2">
              <Moon className="w-3 h-3 text-orange-500" />
              <h2 className="text-[10px] font-magic font-extrabold text-white/30 uppercase tracking-[0.2em]">Fun Area</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  setViewMode('sets');
                  setSearchQuery("");
                }}
                className="flex flex-col items-center justify-center p-3.5 rune-panel text-white/40 hover:text-cyan-400 font-magic hover:border-cyan-500/30 transition-all group z-10"
              >
                <Library className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-magic font-bold uppercase tracking-widest">Sets</span>
              </button>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSetFilter("Any");
                  setArchFilter("Any");
                  setViewMode('cards');
                  performSearch({ queryOverride: "art:bear is:paper order:released", setOverride: "Any", archOverride: "Any", skipCI: true });
                }}
                className="flex flex-col items-center justify-center p-3.5 rune-panel text-white/50 hover:text-cyan-400 hover:border-cyan-500/30 font-magic transition-all group z-10"
              >
                <div className="text-[14px] mb-0.5 group-hover:scale-110 transition-transform">🐾</div>
                <span className="text-[8px] font-magic font-bold uppercase tracking-widest">Bears</span>
              </button>
              <button 
                onClick={() => {
                  setViewMode('calendar');
                  setSearchQuery("");
                }}
                className="flex flex-col items-center justify-center p-3.5 rune-panel text-white/40 hover:text-orange-500 font-magic hover:border-orange-500/30 transition-all group z-10"
              >
                <Calendar className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-orange-500/80 group-hover:text-orange-500" />
                <span className="text-[8px] font-magic font-bold uppercase tracking-widest text-orange-500/80 group-hover:text-orange-500">Calendar</span>
              </button>
              <button 
                onClick={() => {
                  setViewMode('sheriff');
                  setSearchQuery("");
                }}
                className="flex flex-col items-center justify-center p-3.5 rune-panel text-amber-500/60 hover:text-amber-400 font-magic hover:border-amber-500/50 transition-all group z-10"
              >
                <Shield className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-amber-500/80 group-hover:text-amber-500" />
                <span className="text-[8px] font-magic font-bold uppercase tracking-widest text-amber-500/80 group-hover:text-amber-400">Sheriff</span>
              </button>
              <button 
                onClick={() => {
                  setViewMode('judge');
                  setSearchQuery("");
                }}
                className="flex flex-col items-center justify-center p-3.5 rune-panel text-green-500/60 hover:text-green-400 font-magic hover:border-green-500/50 transition-all group z-10"
              >
                <Gavel className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-green-500/80 group-hover:text-green-500" />
                <span className="text-[8px] font-magic font-bold uppercase tracking-widest text-green-500/80 group-hover:text-green-400">Judge</span>
              </button>
            </div>
          </section>
        </div>

        {/* Section 6: Legal & Profile */}
        <div className="p-4 bg-transparent border-t border-white/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2.5 p-1.5 h-10 bg-white/[0.03] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] border border-white/[0.04] rounded-full hover:bg-white/[0.06] transition-all group overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-orange-500/50 transition-all">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-orange-500" />
                )}
              </div>
              <div className="flex flex-col items-start truncate leading-tight">
                <span className="text-[8px] font-magic font-black text-white/40 uppercase tracking-[0.1em] group-hover:text-white transition-colors truncate w-full">{user?.displayName || 'Slinger'}</span>
                <span className="text-[6.5px] font-sans font-bold text-orange-500/60 uppercase tracking-widest truncate w-full">{userTitle || 'Novice'}</span>
              </div>
            </button>

            <div className="flex-1 p-3 bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] border border-white/[0.04] rounded-[1.5rem] flex flex-col gap-0.5 opacity-20 hover:opacity-100 transition-all duration-700 group">
              <p className="text-[7px] font-magic font-black uppercase tracking-[0.1em] text-white/40 text-center group-hover:text-orange-500/60 transition-colors leading-none">
                © {new Date().getFullYear()} Slopsie
              </p>
              <p className="font-sans font-bold text-[5px] text-white/10 leading-none uppercase text-center group-hover:text-white/20 transition-colors">
                Rune Deck is unofficial Fan Content allowed under the Fan Content Policy. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.
              </p>
            </div>
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
               className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="w-full max-w-lg bg-gradient-to-br from-[#121212]/95 to-[#050505]/95 backdrop-blur-2xl border border-white/[0.05] shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[2rem] overflow-hidden"
               >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                     <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-orange-500" />
                        <h2 className="font-magic font-black text-sm uppercase tracking-widest">User Settings</h2>
                     </div>
                     <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="p-8 space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-magic font-black text-white/30 uppercase tracking-widest">Planeswalker Title</label>
                        <div className="flex gap-2">
                           <input 
                              type="text"
                              value={userTitle}
                              onChange={(e) => setUserTitle(e.target.value)}
                              onBlur={() => saveUserSettings({ userTitle })}
                              onKeyDown={(e) => e.key === 'Enter' && saveUserSettings({ userTitle })}
                              placeholder="e.g. Master Brewer"
                              className="w-full bg-black/40 backdrop-blur-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/[0.05] rounded-[1.5rem] px-5 py-3.5 text-xs focus:border-orange-500 outline-none text-white/80 transition-all font-sans"
                           />
                           <button 
                             onClick={() => saveUserSettings({ userTitle })}
                             className="px-5 py-3.5 bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/[0.05] rounded-[1.5rem] text-white/60 hover:text-white hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest font-magic"
                           >
                             Save
                           </button>
                        </div>
                        <p className="text-[8px] text-white/20 uppercase tracking-tighter">This title appears under your name in the armory.</p>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-magic font-black text-white/30 uppercase tracking-widest">Grid Density (Cards per Row)</label>
                        <div className="grid grid-cols-5 gap-2">
                           <button
                             onClick={() => saveUserSettings({ cardsPerRow: 0 })}
                             className={`py-3 rounded-2xl text-[9px] font-black uppercase transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border ${cardsPerRow === 0 ? 'bg-orange-500/80 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:bg-white/10'}`}
                           >
                             Auto
                           </button>
                           {[2, 3, 4, 5, 8, 11].map((n) => (
                             <button
                                key={n}
                                onClick={() => saveUserSettings({ cardsPerRow: n })}
                                className={`py-3 rounded-2xl text-[10px] font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border ${cardsPerRow === n ? 'bg-orange-500/80 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:bg-white/10'}`}
                             >
                               {n}
                             </button>
                           ))}
                        </div>
                        <p className="text-[8px] text-white/20 uppercase tracking-tighter">Auto keeps cards at roughly actual scale (220px).</p>
                     </div>

                     <div className="pt-4 border-t border-white/5">
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              setShowAdminChamber(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-4 mb-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Admin Chamber
                          </button>
                        )}
                        <button 
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Logout
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

          {/* Top Filter Bar */}
          {viewMode === 'cards' && (
            <div className={`transition-all duration-500 ${isFiltersOpen ? 'w-full opacity-100' : 'w-auto'}`}>
              <div className="rune-panel rounded-lg p-2 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-1 z-10">
                <div 
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="flex items-center gap-3 pl-3 pr-4 cursor-pointer group h-10"
                >
                  <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                    <Filter className="w-4 h-4" />
                  </div>
                  {!isFiltersOpen && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-magic font-black text-white/60 uppercase tracking-widest leading-none">Filters</span>
                    </div>
                  )}
                </div>
              </div>

              {isFiltersOpen && (
                <div className="flex flex-wrap gap-2 w-full flex-1 justify-center sm:justify-start animate-in fade-in slide-in-from-top-2 z-10">
                  <div className="flex flex-col gap-1.5 w-full sm:w-28">
                    <select 
                      value={typeFilter} 
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-black/60 border border-white/5 rounded-sm px-2 py-1.5 text-[10px] outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-white/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    >
                      <option value="Any" className="bg-[#111]">Type</option>
                      <option value="Creature" className="bg-[#111]">Creature</option>
                      <option value="Sorcery" className="bg-[#111]">Sorcery</option>
                      <option value="Instant" className="bg-[#111]">Instant</option>
                      <option value="Artifact" className="bg-[#111]">Artifact</option>
                      <option value="Enchantment" className="bg-[#111]">Enchantment</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full sm:w-28">
                    <select 
                      value={rarityFilter} 
                      onChange={(e) => setRarityFilter(e.target.value)}
                      className="bg-black/60 border border-white/5 rounded-sm px-2 py-1.5 text-[10px] outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-white/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    >
                      <option value="Any" className="bg-[#111]">Rarity</option>
                      <option value="common" className="bg-[#111]">Common</option>
                      <option value="uncommon" className="bg-[#111]">Uncommon</option>
                      <option value="rare" className="bg-[#111]">Rare</option>
                      <option value="mythic" className="bg-[#111]">Mythic</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full sm:w-28">
                    <select 
                      value={colorFilter} 
                      onChange={(e) => setColorFilter(e.target.value)}
                      className="bg-black/60 border border-white/5 rounded-sm px-2 py-1.5 text-[10px] outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-white/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    >
                      <option value="Any" className="bg-[#111]">Colors</option>
                      <option value="W" className="bg-[#111]">White</option>
                      <option value="U" className="bg-[#111]">Blue</option>
                      <option value="B" className="bg-[#111]">Black</option>
                      <option value="R" className="bg-[#111]">Red</option>
                      <option value="G" className="bg-[#111]">Green</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => performSearch()}
                    className="px-4 py-3 rune-panel text-orange-500/80 font-magic font-black text-[10px] hover:text-orange-500 hover:border-orange-500/30 transition-all uppercase tracking-widest z-10"
                  >
                    Apply Filters
                  </button>
                  <button 
                    onClick={() => setIsFiltersOpen(false)}
                    className="p-1 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area - Scrollable */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto no-scrollbar custom-scrollbar min-h-0"
        >
          {viewMode === 'cards' ? (
            <div 
              className={`grid gap-3 sm:gap-6 p-2 pb-4`}
              style={{
                gridTemplateColumns: cardsPerRow === 0 
                  ? 'repeat(auto-fill, minmax(220px, 1fr))' 
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
                      <div className="relative mb-10 group cursor-pointer">
                        <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full scale-150 transition-all duration-1000 group-hover:bg-orange-500/10 group-hover:scale-[1.8]" />
                        <div className="relative z-10 w-32 h-32 flex items-center justify-center rune-panel rounded-full shadow-[0_0_40px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_40px_rgba(249,115,22,0.2)] group-hover:border-orange-500/30 transition-all duration-500">
                           <Eye className="w-16 h-16 text-cyan-500/30 group-hover:text-orange-500 transition-colors duration-500" />
                           <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                           <div className="absolute inset-2 border-2 border-dashed border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                        </div>
                      </div>
                      
                      <h2 className="text-4xl font-magic font-extrabold text-white/80 uppercase tracking-tighter mb-4 shadow-black">The Runes Await</h2>
                      <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed mb-10 px-6 font-mono tracking-widest text-[10px]">
                        OPEN YOUR ARCHIDEKT GRIMOIRE OR SEARCH THE MULTIVERSE TO CONTINUE.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg px-6">
                         <button 
                          onClick={() => setViewMode('manage_decks')}
                          className="flex flex-col items-center gap-4 p-6 rune-panel rounded-sm hover:border-orange-500/30 transition-all group z-10"
                         >
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                              <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                               <p className="text-xs font-magic font-bold text-white uppercase tracking-widest mb-1">Connect Deck</p>
                               <p className="text-[10px] text-white/20">Archidekt Integration</p>
                            </div>
                         </button>

                         <button 
                          onClick={() => setViewMode('sets')}
                          className="flex flex-col items-center gap-4 p-6 rune-panel rounded-sm hover:border-orange-500/30 transition-all group z-10"
                         >
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                              <Package className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                               <p className="text-xs font-magic font-bold text-white uppercase tracking-widest mb-1">Explore Sets</p>
                               <p className="text-[10px] text-white/20">Latest MTG releases</p>
                            </div>
                         </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {allCards.map((card) => {
                const images = getCardImages(card);
                const isSelected = deckbox.some(c => c.name === card.name);
                const isExisting = existingInDeck.has(card.name);

                if (isExisting) return null;

                return (
                  <motion.div 
                    layout
                    key={card.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    className="relative group aspect-[0.71]"
                  >
                    <div 
                      onClick={() => toggleCardSelection(card)}
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
          ) : viewMode === 'sets' ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-4 mt-8 pt-8 overflow-visible max-w-7xl mx-auto">
              {mtgSets.map((set, idx) => {
                // Determine tooltip direction based on row/column
                // This is a simple approximation for a responsive grid

                return (
                  <motion.button
                    key={set.code}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.3, zIndex: 100 }}
                    onClick={() => {
                      setActiveDeckId(null);
                      setCommanders([]);
                      setCurrentCI("");
                      setTypeFilter("Any");
                      setRarityFilter("Any");
                      setColorFilter("Any");
                      setArchFilter("Any");
                      setSetFilter(set.code);
                      setViewMode('cards');
                      performSearch({ 
                        queryOverride: `set:${set.code}`, 
                        ciOverride: "",
                        typeOverride: "Any",
                        rarityOverride: "Any",
                        colorOverride: "Any",
                        archOverride: "Any",
                        setOverride: set.code
                      }); 
                    }}
                    className="group relative flex flex-col items-center justify-center p-1 outline-none"
                  >
                        <div className="w-16 h-16 relative flex items-center justify-center p-2.5 bg-[#121212] border border-white/10 rounded-full group-hover:border-cyan-400 cursor-pointer transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] shadow-xl overflow-hidden group-hover:scale-110">
                      {set.icon_svg_uri ? (
                        <img 
                            src={set.icon_svg_uri} 
                            alt={set.name}
                            style={{ 
                             filter: set.isFuture ? 'drop-shadow(0 0 6px rgba(249,115,22,0.6)) brightness(1.2)' : 'drop-shadow(0 0 6px rgba(6,182,212,0.6)) brightness(1.2)'
                            }}
                            className="w-full h-full object-contain filter transition-transform duration-500 invert opacity-90 group-hover:opacity-100" 
                            referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Package className={`w-4 h-4 ${set.isFuture ? 'text-orange-500/50' : 'text-cyan-500/50'}`} />
                          <span className={`${set.isFuture ? 'text-orange-500/80' : 'text-cyan-500/80'} text-[8px] font-magic uppercase tracking-widest`}>{set.code}</span>
                        </div>
                      )}
                    </div>
                    {/* Rune-tech Tooltip */}
                    <div className="absolute px-4 py-2.5 bg-[#050505]/95 backdrop-blur-md border border-cyan-500/30 rounded-none mix-blend-screen overflow-hidden text-[9px] font-magic whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[200] shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all duration-300 top-full mt-2 left-1/2 -translate-x-1/2">
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/80" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/50" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50" />
                      <p className="text-white/90 font-black uppercase tracking-[0.2em] mb-1 pl-1">{set.name}</p>
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-1" />
                      <p className={`uppercase tracking-[0.3em] font-mono text-[8px] font-black pl-1 ${set.isFuture ? 'text-orange-400' : 'text-cyan-400'}`}>
                        {set.code} • {new Date(set.released_at).getFullYear()}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="p-8 max-w-6xl mx-auto w-full relative">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-magic font-extrabold text-white/80 uppercase tracking-tighter mb-4 shadow-black">RELEASE CALENDAR 2026</h2>
                <p className="text-[10px] text-cyan-400 font-mono tracking-[0.3em] font-bold">GLIMPSE INTO THE FUTURE OF THE MULTIVERSE</p>
              </div>

              {/* Responsive Timeline Container */}
              <div className="relative w-full overflow-x-auto no-scrollbar pb-16 pt-8">
                <div className="min-w-[1000px] relative flex items-center justify-between py-56 px-12 mt-10">
                  {/* Central Glow Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#1a1a1a] -translate-y-1/2 rounded-full">
                    <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-cyan-500/10 via-cyan-500/50 to-orange-500/50 blur-[2px] shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
                    <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-cyan-500/50 via-cyan-500 to-orange-500" />
                  </div>

                  {mtgSets
                    .filter(s => s.released_at.startsWith('2026') && s.set_type === 'expansion' && !s.name.toLowerCase().includes('commander') && !s.name.toLowerCase().includes('omenpaths'))
                    .sort((a, b) => new Date(a.released_at).getTime() - new Date(b.released_at).getTime())
                    .map((set, idx) => {
                      const isTop = idx % 2 === 0;
                      return (
                        <div key={set.code} className="relative flex flex-col items-center group w-32 shrink-0">
                          
                          {/* Connector Line */}
                          <div className={`absolute left-1/2 w-0.5 bg-[#2a2a2a] group-hover:bg-cyan-500 transition-colors duration-500 shadow-[0_0_10px_rgba(6,182,212,0)] group-hover:shadow-[0_0_10px_rgba(6,182,212,0.8)]
                            ${isTop ? 'bottom-1/2 top-auto translate-y-1/2 h-20' : 'top-1/2 bottom-auto -translate-y-1/2 h-20'}
                          `} />
                          
                          {/* Node */}
                          <div className={`absolute top-1/2 left-1/2 w-4 h-4 rounded-full border-2 -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:scale-150 transition-all duration-300
                             ${set.isFuture ? 'bg-[#0c0c0c] border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] group-hover:bg-orange-500' : 'bg-[#0c0c0c] border-cyan-500 group-hover:bg-cyan-500'}
                          `} />
                          
                          {/* Content Group */}
                          <div className={`absolute left-1/2 -translate-x-1/2 w-48 flex flex-col items-center text-center z-20 transition-transform duration-300
                            ${isTop ? 'bottom-full mb-10 group-hover:-translate-y-2' : 'top-full mt-10 group-hover:translate-y-2'}
                          `}>
                            <button 
                               onClick={() => {
                                 setViewMode('cards');
                                 setSearchQuery("");
                                 const cCode = set.code.length === 3 ? `${set.code}c` : `w${set.code}`;
                                 performSearch({ queryOverride: `(set:${set.code} OR set:${cCode} OR set:t${set.code})`, setOverride: "Any", archOverride: "Any" });
                               }}
                               className="w-24 h-24 mb-4 relative flex items-center justify-center p-3 bg-[#080808] border border-white/5 rounded-lg group-hover:border-cyan-400 cursor-pointer transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] shadow-2xl overflow-hidden hover:scale-110"
                            >
                               {set.icon_svg_uri ? (
                                 <img 
                                   src={set.icon_svg_uri} 
                                   alt={set.name} 
                                   style={{ 
                                    filter: set.isFuture ? 'drop-shadow(0 0 8px rgba(249,115,22,0.6)) brightness(1.2)' : 'drop-shadow(0 0 8px rgba(6,182,212,0.6)) brightness(1.2)'
                                   }}
                                   className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-500 invert opacity-80 group-hover:opacity-100" 
                                 />
                               ) : (
                                 <div className="flex flex-col items-center justify-center space-y-1">
                                   <Package className="w-6 h-6 text-orange-500/50" />
                                   <span className="text-orange-500/80 text-[10px] font-magic uppercase tracking-widest">{set.code}</span>
                                 </div>
                               )}
                            </button>

                            <div className="bg-[#080808]/80 backdrop-blur-md p-3 border border-white/5 rounded-md shadow-xl w-full">
                               <h3 className="text-[11px] font-magic font-bold text-white/90 uppercase tracking-widest leading-snug line-clamp-2 min-h-[32px] flex items-center justify-center">{set.name}</h3>
                               <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
                               <p className={`text-[9px] font-mono font-bold tracking-[0.2em] uppercase ${set.isFuture ? 'text-orange-500' : 'text-cyan-500'}`}>
                                 {new Date(set.released_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                               </p>
                            </div>
                          </div>

                        </div>
                      );
                  })}
                </div>
              </div>
            </div>
          ) : viewMode === 'sheriff' ? (
            <div className="p-8 max-w-4xl mx-auto w-full relative space-y-8 pb-32">
              <div className="text-center mb-12 relative z-10">
                <div className="flex justify-center mb-4">
                  <Shield className="w-16 h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                </div>
                <h2 className="text-5xl font-magic font-extrabold text-amber-500 uppercase tracking-tighter mb-2 shadow-black drop-shadow-2xl">SHERIFF</h2>
                <p className="text-xs text-white/60 font-mono tracking-[0.2em] uppercase">Social Deduction Commander Variant</p>
                <div className="max-w-2xl mx-auto mt-6">
                  <p className="text-sm text-cyan-100/70 font-sans leading-relaxed">
                    Sheriff is een sociale Commander-variant waarbij spelers geheime rollen krijgen met verschillende doelen. Naast het normale Magic-spel komt er bluffen, samenwerken en verraden bij kijken.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative">
                {/* Opzet */}
                <div className="rune-panel p-6 rounded-xl space-y-4">
                  <h3 className="text-lg font-magic font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-500/30 pb-2">Opzet</h3>
                  <div className="space-y-4 text-sm text-white/70">
                    <p className="font-bold text-amber-500/90">Normale Commander-regels.</p>
                    <div>
                      <strong className="text-cyan-300 block mb-1">Rolverdeling:</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>1 Sheriff <span className="text-amber-400/80">(bekend)</span></li>
                        <li>1 of meer Deputies <span className="text-cyan-500/50">(geheim)</span></li>
                        <li>1 of meer Outlaws <span className="text-cyan-500/50">(geheim)</span></li>
                        <li>1 Renegade <span className="text-cyan-500/50">(geheim)</span></li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-cyan-300 block mb-1">Startlevens:</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Sheriff: <span className="text-green-400">40 levens</span></li>
                        <li>Alle anderen: <span className="text-white">30 levens</span></li>
                      </ul>
                    </div>
                    <p><strong className="text-cyan-300">Startspeler:</strong> De Sheriff</p>
                  </div>
                </div>

                {/* Speldynamiek */}
                <div className="rune-panel p-6 rounded-xl space-y-4">
                  <h3 className="text-lg font-magic font-bold text-amber-400 uppercase tracking-widest border-b border-amber-500/30 pb-2">Speldynamiek</h3>
                  <div className="space-y-3 text-sm text-white/70">
                    <p><strong className="text-amber-500 block">Sociale deductie:</strong> Rollen achterhalen via gedrag en acties.</p>
                    <p><strong className="text-amber-500 block">Bluffen en onderhandelen:</strong> Toegestaan en vaak noodzakelijk.</p>
                    <p><strong className="text-amber-500 block">Politieke allianties:</strong> Tijdelijk samenwerken kan, maar niemand kan iedereen blijven vertrouwen.</p>
                    <p><strong className="text-amber-500 block">Open communicatie:</strong> Praten, dreigen, sussen en misleiden maken deel uit van het spel.</p>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-6 z-10 relative">
                <h3 className="text-2xl font-magic font-bold text-center text-white/90 uppercase tracking-widest mt-12 mb-8">Rollen & Doelen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sheriff */}
                  <div className="bg-[#0a0a0a]/80 border border-amber-500/30 p-6 rounded-xl relative overflow-hidden group hover:border-amber-500 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80" />
                    <h4 className="text-xl font-magic font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield className="w-5 h-5"/> Sheriff</h4>
                    <div className="space-y-2 text-sm text-white/70">
                      <p><strong className="text-white/90">Status:</strong> Bekend (open vanaf het begin).</p>
                      <p><strong className="text-white/90">Doel:</strong> Overleef en schakel alle Outlaws en de Renegade uit.</p>
                      <p><strong className="text-white/90">Samenwerking:</strong> Met de Deputies.</p>
                      <p className="pt-2 mt-2 border-t border-white/10 text-amber-400 font-bold">Wint als: Alle Outlaws en de Renegade zijn verslagen.</p>
                    </div>
                  </div>

                  {/* Outlaw */}
                  <div className="bg-[#0a0a0a]/80 border border-red-500/30 p-6 rounded-xl relative overflow-hidden group hover:border-red-500 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80" />
                    <h4 className="text-xl font-magic font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Flame className="w-5 h-5"/> Outlaw</h4>
                    <div className="space-y-2 text-sm text-white/70">
                      <p><strong className="text-white/90">Status:</strong> Geheim (spelers weten niet wie de andere Outlaws zijn).</p>
                      <p><strong className="text-white/90">Doel:</strong> Schakel de Sheriff uit.</p>
                      <p><strong className="text-white/90">Samenwerking:</strong> Onderling, zodra ze elkaar vinden.</p>
                      <p className="pt-2 mt-2 border-t border-white/10 text-red-400 font-bold">Wint als: De Sheriff is uitgeschakeld en minstens één Outlaw leeft nog.</p>
                    </div>
                  </div>

                  {/* Deputy */}
                  <div className="bg-[#0a0a0a]/80 border border-blue-500/30 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/80" />
                    <h4 className="text-xl font-magic font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-5 h-5"/> Deputy</h4>
                    <div className="space-y-2 text-sm text-white/70">
                      <p><strong className="text-white/90">Status:</strong> Geheim (tot de speler zich onthult, optioneel).</p>
                      <p><strong className="text-white/90">Doel:</strong> Bescherm de Sheriff en help hem winnen.</p>
                      <p><strong className="text-white/90">Samenwerking:</strong> Met de Sheriff.</p>
                      <p className="pt-2 mt-2 border-t border-white/10 text-blue-400 font-bold">Wint als: De Sheriff wint (zelf moet niet per se in leven zijn, zolang de Sheriff wint).</p>
                    </div>
                  </div>

                  {/* Renegade */}
                  <div className="bg-[#0a0a0a]/80 border border-purple-500/30 p-6 rounded-xl relative overflow-hidden group hover:border-purple-500 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/80" />
                    <h4 className="text-xl font-magic font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Skull className="w-5 h-5"/> Renegade</h4>
                    <div className="space-y-2 text-sm text-white/70">
                      <p><strong className="text-white/90">Status:</strong> Geheim (volledige solorol).</p>
                      <p><strong className="text-white/90">Doel:</strong> Overleef als enige speler.</p>
                      <p><strong className="text-white/90">Samenwerking:</strong> Werkt in principe met niemand, kan tijdelijk samenwerken als strategie.</p>
                      <p className="pt-2 mt-2 border-t border-white/10 text-purple-400 font-bold">Wint als: Iedereen anders is uitgeschakeld.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rules and Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10 relative mt-12">
                <div className="rune-panel p-6 rounded-xl">
                  <h3 className="text-lg font-magic font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-500/30 pb-2 mb-4">Belangrijke spelregels</h3>
                  <ul className="list-disc pl-5 space-y-3 text-sm text-white/70">
                    <li>Rollen worden geheim gehouden bij start <span className="text-amber-500/80">(behalve de Sheriff)</span>.</li>
                    <li>Rollen mogen vrijwillig onthuld worden.</li>
                    <li>Bij uitschakeling wordt iemands rol bekendgemaakt.</li>
                    <li>Het spel stopt zodra een rol zijn winconditie behaalt.</li>
                  </ul>
                </div>

                <div className="rune-panel p-6 rounded-xl">
                  <h3 className="text-lg font-magic font-bold text-white/80 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Verdeling per spelersaantal</h3>
                  
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-cyan-400/80 font-mono tracking-widest uppercase">
                          <th className="py-2 pr-2 font-bold">Spelers</th>
                          <th className="py-2 px-2 text-amber-500">Sheriff</th>
                          <th className="py-2 px-2 text-red-500">Outlaws</th>
                          <th className="py-2 px-2 text-blue-500">Deputies</th>
                          <th className="py-2 pl-2 text-purple-500">Renegade</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/80">
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-2 font-bold">4</td>
                          <td className="py-2 px-2 text-amber-400">1</td>
                          <td className="py-2 px-2 text-red-400">2</td>
                          <td className="py-2 px-2 text-blue-400/50">-</td>
                          <td className="py-2 pl-2 text-purple-400">1</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-2 font-bold">5</td>
                          <td className="py-2 px-2 text-amber-400">1</td>
                          <td className="py-2 px-2 text-red-400">2</td>
                          <td className="py-2 px-2 text-blue-400">1</td>
                          <td className="py-2 pl-2 text-purple-400">1</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-2 font-bold">6</td>
                          <td className="py-2 px-2 text-amber-400">1</td>
                          <td className="py-2 px-2 text-red-400">3</td>
                          <td className="py-2 px-2 text-blue-400">1</td>
                          <td className="py-2 pl-2 text-purple-400">1</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-2 font-bold">7</td>
                          <td className="py-2 px-2 text-amber-400">1</td>
                          <td className="py-2 px-2 text-red-400">3</td>
                          <td className="py-2 px-2 text-blue-400">2</td>
                          <td className="py-2 pl-2 text-purple-400">1</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-2 font-bold">8</td>
                          <td className="py-2 px-2 text-amber-400">1</td>
                          <td className="py-2 px-2 text-red-400">3</td>
                          <td className="py-2 px-2 text-blue-400">3</td>
                          <td className="py-2 pl-2 text-purple-400">1</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'judge' ? (
             <JudgeView />
          ) : viewMode === 'manage_decks' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rune-panel rounded-xl">
                <div className="flex flex-col z-10">
                <h2 className="text-xl font-magic font-extrabold text-orange-500 uppercase tracking-tight">Saved Decks</h2>
                <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest">MY COLLECTION</p>
              </div>
                <div className="flex-1 max-w-sm z-10">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Archidekt or TappedOut ID/URL..."
                      className="bg-black/60 border border-[#2a2a2a] shadow-[inset_0_1px_5px_rgba(0,0,0,0.8)] rounded-sm px-4 py-2 text-[11px] flex-1 focus:border-cyan-500/50 outline-none placeholder:text-white/20 text-cyan-400 font-magic transition-colors"
                      value={newDeckIdInput}
                      onChange={(e) => setNewDeckIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchAnyDeck(newDeckIdInput)}
                    />
                    <button 
                      onClick={() => fetchAnyDeck(newDeckIdInput)}
                      className="rune-panel px-4 py-2 text-cyan-500/80 font-black text-[10px] items-center gap-2 flex transition-all active:scale-95 font-magic uppercase hover:text-cyan-400 hover:border-cyan-500/30 z-10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Deck
                    </button>
                  </div>
                </div>
                <div className="ml-auto bg-orange-500 text-black px-4 py-1 rounded-sm text-xs font-black z-10 relative">
                  {savedDecks.length} Decks
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {savedDecks.map(deck => (
                  <div key={deck.id} className="bg-[#0c0c0c] border border-white/[0.04] rounded-sm overflow-hidden flex flex-col group hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-500 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                    <div className="h-40 relative overflow-hidden">
                      <img src={deck.art_crops[0] || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={deck.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute inset-x-4 top-4 flex justify-between">
                         <div className="bg-black/60 backdrop-blur p-1 rounded-full">{renderManaSymbols(deck.ci)}</div>
                         <span className="text-[9px] font-bold text-white/50 bg-black/60 backdrop-blur px-2 py-1 rounded-full">{deck.id}</span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <h3 className="font-magic font-bold line-clamp-1 group-hover:text-orange-500 transition-colors uppercase">{deck.name}</h3>
                          <p className="text-[10px] text-white/30 uppercase font-black tracking-widest font-mono">Commander Deck</p>
                        </div>
                        
                        <div className="flex items-center justify-between gap-3 bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] border border-white/[0.04] p-3 rounded-2xl">
                          <div className="flex -space-x-2">
                            {deck.art_crops.map((crop, i) => (
                              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#111] overflow-hidden">
                                <img src={crop || undefined} className="w-full h-full object-cover" alt="" />
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => autoAddCommanderTags(deck.id, deck.commanders)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black rounded-full transition-all text-xs font-black uppercase tracking-widest border border-orange-500/20"
                            title="Suggest synergy tags"
                          >
                            <Wand2 className="w-4 h-4" />
                            Suggest Tags
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                         {deck.tags.map(tag => (
                           <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] flex items-center gap-2 group/tag">
                             #{tag}
                             <X 
                              className="w-3 h-3 hover:text-red-500 cursor-pointer" 
                              onClick={() => removeTag(deck.id, tag)}
                             />
                           </span>
                         ))}
                      </div>

                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Add tag..."
                          className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] flex-1 outline-none focus:border-orange-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addTag(deck.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                      </div>

                      <div className="flex gap-2 pt-2 mt-auto">
                        <button 
                          onClick={() => fetchAnyDeck(deck.id)}
                          className="flex-1 py-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] rounded-2xl text-orange-500 font-magic font-extrabold text-[10px] transition-all uppercase tracking-widest active:scale-95"
                        >
                          Select
                        </button>
                        <button 
                          onClick={() => viewDeckDetails(deck.id)}
                          className="flex-1 py-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl text-black font-magic font-black text-[10px] transition-all uppercase tracking-widest active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_15px_rgba(249,115,22,0.2)]"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => deleteSavedDeck(deck.id)}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all border border-red-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>

      {/* Onboarding Tutorial Modal */}
      <AnimatePresence>
        {isViewingDeck && viewingDeckCards && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-5xl h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
            >
               <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-magic font-black text-orange-500 uppercase tracking-tighter truncate max-w-md">{viewingDeckName || 'Deck Manifest'}</h2>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em]">{viewingDeckCards.length} Cards in Manifest</p>
                  </div>
                  <button onClick={() => { setIsViewingDeck(false); setViewingDeckCards(null); }} className="p-3 hover:bg-white/5 rounded-full transition-colors border border-white/5 group">
                    <X className="w-6 h-6 text-white/40 group-hover:text-white" />
                  </button>
               </div>

               <div className="flex flex-1 bg-[#050505] rounded-b-3xl overflow-hidden relative">
                 <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 no-scrollbar border-t border-white/[0.05]">
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                     {flatDeckCards.map((dc: any, idx: number) => {
                        const c = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                        const qty = dc.quantity || 1;
                        const isFoil = dc.modifier === 'Foil' || dc.modifier === 'Etched Foil';
                        
                        const edition = dc.card?.edition;
                        const scryfall = dc.card?.scryfallData || dc.card?.scryfall_data;
                        const oracle = dc.card?.oracleCard || dc.card?.oracle_card || dc.card;
                        
                        let img = edition?.imageUrl || edition?.image_url || edition?.image_uris?.normal || edition?.imageUris?.normal;
                        const scryfallId = dc.card?.scryfall_id || dc.card?.scryfallId || dc.card?.uids?.scryfall || scryfall?.id || dc.uids?.scryfall;
                        
                        if (!img && scryfallId) {
                           img = `https://cards.scryfall.io/normal/front/${scryfallId.slice(0, 1)}/${scryfallId.slice(1, 2)}/${scryfallId}.jpg`;
                        }
                        if (!img) {
                           img = scryfall?.image_uris?.normal || scryfall?.image_uris?.large || scryfall?.imageUris?.normal;
                        }
                        if (!img) {
                           img = oracle?.scryfallData?.image_uris?.normal || oracle?.image_uris?.normal || oracle?.imageUris?.normal;
                        }
                        if (!img && scryfall?.card_faces?.length > 0) {
                           img = scryfall.card_faces[0].image_uris?.normal || scryfall.card_faces[0].imageUris?.normal;
                        }

                        if (img && typeof img === 'string' && !img.startsWith('http')) {
                          if (img.includes('scryfall.com') || img.includes('cards.scryfall.io')) {
                             img = `https:${img.startsWith('//') ? '' : '//'}${img}`;
                          } else if (img.startsWith('/')) {
                             img = `https://archidekt.com${img}`;
                          } else {
                             img = undefined;
                          }
                        }
                        
                        const cardName = c?.name || dc.card?.name || 'Unknown Card';
                        
                        // Check if it's a commander
                        const isCommander = dc.categories?.some((cat: string) => cat.toLowerCase().includes('commander'));
                        
                        return (
                          <div 
                            key={`${cardName}-${idx}`} 
                            className={`group relative aspect-[0.71] w-full bg-white/[0.03] rounded-lg sm:rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.8)] border border-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:-translate-x-1 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] ${isCommander ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-400 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]' : ''}`}
                            onMouseEnter={() => setHoveredPreviewCard(img || null)}
                            onMouseLeave={() => setHoveredPreviewCard(null)}
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 sm:p-4 z-0">
                                <span className="text-[10px] sm:text-xs font-magic font-extrabold text-white/30 truncate px-1 uppercase tracking-wider">{cardName}</span>
                                <div className="mt-2 w-8 h-px bg-white/10" />
                            </div>
                            
                            {img && (
                              <img 
                                src={img} 
                                className="w-full h-full object-cover relative z-10 transition-opacity duration-500 opacity-100" 
                                alt={cardName} 
                                loading="lazy" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  // Avoid infinite loops
                                  if (target.src.includes('api.scryfall.com/cards/named')) {
                                    target.style.opacity = '0';
                                    return;
                                  }
                                  const safeName = cardName.split(' // ')[0];
                                  target.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(safeName)}&format=image&version=normal`;
                                }} 
                              />
                            )}
                            
                            <div className="absolute top-1 left-0 flex flex-col gap-1 z-20">
                               {qty > 1 && (
                                 <div className="bg-black/90 backdrop-blur-md px-2 py-0.5 text-[11px] font-black text-orange-500 rounded-r-md border-y border-r border-orange-500/30 shadow-lg">
                                    {qty}x
                                 </div>
                               )}
                               {isFoil && (
                                 <div className="bg-gradient-to-r from-purple-500/90 to-blue-500/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-tighter rounded-r-md border-y border-r border-white/20 shadow-lg">
                                    Foil
                                 </div>
                               )}
                            </div>
                          </div>
                        );
                     })}
                   </div>
                 </div>
                 
                 {/* Desktop Preview Sidebar */}
                 <div className="hidden lg:flex flex-col w-64 xl:w-80 bg-[#0A0A0A] border-l border-white/[0.05] p-6 shrink-0 relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] justify-center items-center">
                    <h3 className="absolute top-6 left-6 text-white/30 font-magic text-[10px] uppercase tracking-widest text-center mt-2 w-full pr-12">Card Preview</h3>
                    {hoveredPreviewCard ? (
                      <img src={hoveredPreviewCard} className="w-full h-auto rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.5)] border-2 border-cyan-500/50 transition-all duration-300" />
                    ) : (
                      <div className="w-full aspect-[0.71] rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-center justify-center text-white/20 text-xs font-magic uppercase tracking-widest text-center px-4">
                          Hover a card <br/>to preview
                      </div>
                    )}
                 </div>
               </div>
               
               <AnimatePresence>
                 {hoveredPreviewCard && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95, y: 10 }}
                     transition={{ duration: 0.15 }}
                     className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-48 sm:w-56 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.5)] border-2 border-cyan-500/50 pointer-events-none"
                   >
                     <img src={hoveredPreviewCard} className="w-full h-auto" alt="Preview" />
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          </motion.div>
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
                  <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em] font-bold mt-1">RUNE-TECH INTERFACE</p>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-magic font-bold text-white uppercase tracking-wider mb-1">The Vault</p>
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

      {/* Deckbox Side Panel */}
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
                  <p className="text-[10px] text-cyan-500/60 font-bold font-mono tracking-widest">{deckbox.reduce((acc, curr) => acc + curr.qty, 0)} CARDS READY</p>
               </div>
               <button onClick={() => setIsDeckboxOpen(false)} className="p-2 hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-cyan-500/30 hover:text-cyan-400 group">
                 <X className="w-5 h-5 text-white/50 group-hover:text-cyan-400" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2 relative z-10">
               {deckbox.map(item => (
                 <div key={item.name} className="flex gap-3 rune-panel bg-black/40 p-3 rounded-sm hover:border-cyan-500/30 transition-all z-10">
                    <img src={item.thumb} className="w-12 h-16 rounded-sm object-cover shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-cyan-500/20" alt={item.name} />
                    <div className="flex-1 flex flex-col justify-between">
                       <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-white line-clamp-1">{item.name}</h4>
                          <p className="text-[9px] text-orange-500 font-black tracking-widest">{item.from_deck}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <button onClick={() => updateCardQty(item.name, -1)} className="w-6 h-6 rounded bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all">
                            <span className="text-sm">-</span>
                          </button>
                          <span className="text-xs font-black min-w-[20px] text-center">{item.qty}</span>
                          <button onClick={() => updateCardQty(item.name, 1)} className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-black hover:bg-orange-600 transition-all font-black">
                             <Plus className="w-3 h-3" />
                          </button>
                          <div className="flex-1" />
                          <button onClick={() => updateCardQty(item.name, -999)} className="text-red-500 opacity-30 hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                 </div>
               ))}

               {deckbox.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-white/10 gap-3">
                   <Package className="w-12 h-12" />
                   <p className="text-xs font-bold">Your selection is empty</p>
                 </div>
               )}
            </div>

            <div className="space-y-3 pt-6 border-t border-white/10">
               <button 
                onClick={copyDecklist}
                disabled={deckbox.length === 0}
                className={`w-full py-4 rounded-2xl text-black font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none font-magic uppercase tracking-widest ${copied ? 'bg-green-500' : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(249,115,22,0.25)] hover:brightness-110'}`}
               >
                 {copied ? <RotateCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                 {copied ? 'COPIED TO CLIPBOARD!' : 'COPY DECKLIST'}
               </button>
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
                className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
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
                <p className="text-orange-500 font-magic font-extrabold uppercase tracking-[0.3em] text-sm animate-pulse">Consulting the Runes</p>
                <p className="text-white/20 text-[10px] font-bold mt-2 uppercase tracking-widest">Searching the Multiverse...</p>
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
            <AdminChamber isOpen={showAdminChamber} onClose={() => setShowAdminChamber(false)} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Admin Chamber Component
function AdminChamber({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDecks, setUserDecks] = useState<any[]>([]);
  const [userDeckbox, setUserDeckbox] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLocalLoading(true);
        try {
          const snap = await getDocs(query(collection(db, 'users')));
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
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
     if (!window.confirm("Are you sure you want to purge this record from the Archives?")) return;
     setLocalLoading(true);
     try {
       await deleteDoc(doc(db, 'users', selectedUser.id, 'decks', deckId));
       setUserDecks(prev => prev.filter(d => d.id !== deckId));
     } catch (e) {
       console.error("Purge failed:", e);
       alert("Manifest extraction failed. Check security permissions.");
     }
     setLocalLoading(false);
  };

  const clearUserDeckbox = async () => {
     if (!selectedUser) return;
     if (!window.confirm("Purge the entire Deckbox essence of this Seeker?")) return;
     setLocalLoading(true);
     try {
       const q = query(collection(db, 'users', selectedUser.id, 'deckbox'));
       const snap = await getDocs(q);
       const batch = writeBatch(db);
       snap.docs.forEach(doc => batch.delete(doc.ref));
       await batch.commit();
       setUserDeckbox([]);
     } catch (e) { console.error(e); }
     setLocalLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-[#020402] flex flex-col overflow-hidden text-emerald-100 font-sans border border-emerald-500/20 m-2 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-emerald-500/20 bg-emerald-950/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-magic font-black text-sm uppercase tracking-[0.2em] text-emerald-400">Admin Archive</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Seeker Oversight Protocol</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-emerald-500/10 rounded-2xl transition-all border border-transparent hover:border-emerald-500/20 group">
          <X className="w-6 h-6 text-emerald-400 transition-transform group-hover:rotate-90" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* User List Sidebar */}
        <div className="w-72 border-r border-emerald-500/10 overflow-y-auto bg-black/60 custom-scrollbar">
          <div className="p-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/50 mb-6 flex items-center gap-2">
               <Users className="w-4 h-4" /> Active Souls
             </p>
             <div className="space-y-2">
                {users.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => loadUserData(u)}
                    className={`w-full flex flex-col p-4 rounded-2xl transition-all border text-left group
                      ${selectedUser?.id === u.id 
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                        : 'hover:bg-emerald-500/5 border-transparent text-emerald-100/60 hover:text-emerald-100'}`}
                  >
                    <span className="text-[11px] font-bold truncate w-full group-hover:tracking-wider transition-all uppercase">{u.displayName || 'Unnamed Seeker'}</span>
                    <span className="text-[8px] opacity-30 truncate w-full font-mono mt-1">{u.email}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* User Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent)] custom-scrollbar">
          {selectedUser ? (
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-emerald-500/10 pb-8">
                  <div>
                    <h1 className="text-4xl font-magic font-black text-white mb-2 uppercase tracking-tighter">{selectedUser.displayName}</h1>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 font-mono tracking-widest">{selectedUser.id}</span>
                      <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest ml-2">{selectedUser.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-8">
                     <div className="flex flex-col items-center md:items-end">
                       <span className="text-[10px] font-black uppercase text-emerald-500/30 tracking-widest mb-1">Stored Rites</span>
                       <span className="text-3xl font-magic font-black text-emerald-400">{userDecks.length}</span>
                     </div>
                     <div className="flex flex-col items-center md:items-end">
                       <span className="text-[10px] font-black uppercase text-emerald-500/30 tracking-widest mb-1">Deckbox Essence</span>
                       <span className="text-3xl font-magic font-black text-emerald-400">{userDeckbox.length}</span>
                     </div>
                  </div>
               </header>

               {/* Decks Grid */}
               <section>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-magic font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4" /> User Deck Archives
                    </h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userDecks.map(deck => (
                      <div key={deck.id} className="bg-black/60 border border-emerald-500/10 rounded-3xl p-5 flex items-center justify-between group hover:border-emerald-500/40 hover:bg-black/40 transition-all duration-300">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 rounded-2xl bg-black/60 border border-emerald-500/10 overflow-hidden group-hover:scale-105 transition-transform">
                              {deck.art_crops?.[0] ? 
                                <img src={deck.art_crops[0]} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" /> : 
                                <div className="w-full h-full flex items-center justify-center bg-emerald-500/5 text-emerald-500/20 font-magic text-xs">NO IMG</div>
                              }
                           </div>
                           <div>
                             <h4 className="text-[12px] font-black uppercase text-emerald-100 tracking-[0.1em] mb-2">{deck.name}</h4>
                             <div className="flex flex-wrap gap-1.5">
                               {deck.tags?.map((t: string) => (
                                 <span key={t} className="text-[8px] bg-emerald-500/5 text-emerald-400/70 px-2 py-0.5 rounded-lg border border-emerald-500/10 font-bold uppercase">{t}</span>
                               ))}
                             </div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                              onClick={() => deleteUserDeck(deck.id)}
                              className="p-3 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="p-3 bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/10 transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                    ))}
                    {userDecks.length === 0 && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/10 rounded-[3rem] bg-emerald-500/[0.01]">
                        <Database className="w-10 h-10 text-emerald-500/20 mb-4" />
                        <p className="text-[11px] uppercase font-black text-emerald-500/40 tracking-[0.3em]">No decks discovered in this Seeker's path</p>
                      </div>
                    )}
                 </div>
               </section>

               {/* Deckbox Content */}
               <section>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-magic font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      <Layers className="w-4 h-4" /> Current Selection (Deckbox)
                    </h3>
                    <button 
                      onClick={clearUserDeckbox}
                      className="text-[9px] font-black uppercase text-red-500/50 hover:text-red-500 flex items-center gap-2 border border-red-500/10 hover:border-red-500/30 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Purge Deckbox
                    </button>
                 </div>
                 <div className="bg-emerald-500/[0.02] border border-emerald-500/5 rounded-[2.5rem] p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                       {userDeckbox.map(card => (
                         <div key={card.id || card.name} className="relative aspect-[0.71] rounded-xl overflow-hidden border border-emerald-500/10 group shadow-lg hover:border-emerald-500/40 hover:shadow-emerald-500/10 transition-all">
                            <img src={card.thumb} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115 grayscale group-hover:grayscale-0" />
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-black/90 backdrop-blur-md border-t border-emerald-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                               <p className="text-[9px] font-black truncate uppercase text-white tracking-widest">{card.name}</p>
                               <div className="flex items-center justify-between mt-1">
                                 <span className="text-[8px] text-emerald-400/60 font-mono">Q: {card.qty}</span>
                                 <Copy className="w-2.5 h-2.5 text-emerald-500/40 cursor-pointer hover:text-emerald-400" />
                               </div>
                            </div>
                         </div>
                       ))}
                       {userDeckbox.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                          <p className="text-[11px] uppercase font-black text-emerald-500/20 tracking-[0.5em]">Inventory Vacant</p>
                        </div>
                       )}
                    </div>
                 </div>
               </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
               <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-[60px] animate-pulse rounded-full" />
                  <Database className="w-32 h-32 relative text-emerald-500/20 animate-bounce transition-all duration-1000" />
               </div>
               <p className="font-magic font-black uppercase tracking-[0.6em] text-2xl text-emerald-100/30">Archive Repository</p>
               <p className="text-[10px] mt-4 font-black uppercase tracking-[0.2em] text-emerald-500/40 border border-emerald-500/10 px-6 py-2 rounded-full">Select a Seeker to commence inspection</p>
            </div>
          )}
        </div>
      </div>

      {localLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center">
           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <RotateCw className="w-16 h-16 text-emerald-400 animate-spin transition-all duration-300" />
                <Shield className="absolute inset-0 m-auto w-6 h-6 text-emerald-400/50" />
              </div>
              <p className="text-[11px] font-magic font-black uppercase tracking-[0.4em] text-emerald-400 animate-pulse">Syncing with Archivists</p>
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
      const oracle = data.oracle_text || 'No oracle text found.';
      const colors = data.color_identity?.join(', ') || 'Colorless';
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
        model: "gemini-flash-latest",
        contents: queryStr,
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
      if (err.message && err.message.includes("AI not initialized")) {
        errorMsg = "Mijn excuses, de archieven zijn nog niet ontsloten. Configureer de GEMINI_API_KEY om mijn wijsheid te raadplegen.";
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      setIsProcessing(false);
    }
  };

  const generateRuling = async (query: string, confirmedNames: string[]) => {
    setIsProcessing(true);
    try {
      let context = "";
      for (const name of confirmedNames) {
        context += await fetchCardContext(name) + "\n";
      }

      const systemPrompt = `Je bent Ruxa, een deskundige maar bondige Magic: The Gathering Judge. 
      
      MISSIE:
      Beantwoord regelsvragen van de gebruiker direct en trefzeker. Gebruik de meegeleverde context als bron.
      
      STIJL:
      - Antwoord in het NEDERLANDS.
      - Wees bondig. Geef het antwoord in maximaal een paar zinnen.
      - Leg de achterliggende regels (zoals specifieke CR-artikelen of Layers) ALLEEN uit als de gebruiker er specifiek naar vraagt (zoals "waarom?" of "leg uit").
      - Een subtiele humoristische opmerking of een kleine dad-joke mag, maar overdrijf het niet. 
      - Behoud een wijze, professionele uitstraling.`;
      
      const userMessage = `--- CONTEXT VAN KAARTEN ---\n${context}\n\n--- REGELSVRAAG ---\n${query}\n\nWat is je uitspraak? (Kort en bondig in het Nederlands):`;

      let modelId = "gemini-flash-latest"; // Default fallback
      // The user mentioned gen-lang-client-0386737975
      const preferredModel = "gen-lang-client-0386737975";
      
      let ruling = "";
      try {
        console.log(`Poberen met voorkeursmodel: ${preferredModel}`);
        const response = await (ai as any).models.generateContent({
          model: preferredModel,
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt
          }
        });
        ruling = response.text || "";
      } catch (e) {
        console.warn("Voorkeursmodel mislukt of niet gevonden, terugval naar flash", e);
        const response = await (ai as any).models.generateContent({
          model: modelId,
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt
          }
        });
        ruling = response.text || "";
      }

      setMessages(prev => [...prev, 
        { role: 'assistant', content: `Gevonden kaarten: ${confirmedNames.join(", ") || "Geen"}` },
        { role: 'assistant', content: ruling }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Mijn excuses, de archieven zijn tijdelijk verzegeld." }]);
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
    <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-2 sm:p-4 overflow-visible relative group/ruxa">
      {/* Peeking Ruxa effect - Moved further left and made more visible */}
      <div className="absolute -left-96 bottom-0 w-[600px] h-full pointer-events-none z-0 hidden lg:block opacity-30 group-hover/ruxa:opacity-100 transition-all duration-1000 transform -translate-x-10 group-hover/ruxa:translate-x-0">
        <img 
          src="/ruxa.png" 
          alt="Peeking Ruxa" 
          className="w-full h-full object-contain -rotate-6 scale-x-[-1]" 
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      </div>

      <div className="rune-panel flex-1 flex flex-col rounded-[2.5rem] overflow-hidden border-green-500/10 shadow-[0_0_50px_rgba(16,185,129,0.05)] bg-[#020402]/80 backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="p-6 border-b border-green-500/10 flex items-center justify-between bg-green-950/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Gavel className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="font-magic font-black text-sm uppercase tracking-[0.2em] text-green-400">Ruxa's Court</h2>
              <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Bear Judge Protocol</p>
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
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border 
                  ${msg.role === 'user' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <img src="/ruxa.png" alt="R" className="w-6 h-6 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                </div>
                <div className={`p-4 rounded-3xl text-xs font-sans leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-orange-500/5 border border-orange-500/10 text-orange-100 rounded-tr-none' 
                    : 'bg-green-500/5 border border-green-500/10 text-green-50 rounded-tl-none'}`}
                >
                   {msg.role === 'assistant' && i === 0 && (
                     <div className="mb-4 rounded-2xl overflow-hidden border border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] hidden">
                       <img src="/ruxa.png" alt="Ruxa" className="w-full h-auto object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                     </div>
                   )}
                   {msg.content}
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
                <span className="text-[9px] font-magic font-black text-green-400 uppercase tracking-widest">Verify Identifiers</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(suggestions).map(([term, choices]) => (
                  <div key={term} className="space-y-1">
                    <p className="text-[8px] font-bold text-green-500/40 uppercase pl-1">For "{term}":</p>
                    <select 
                      onChange={(e) => setSelectedCards(prev => ({ ...prev, [term]: e.target.value }))}
                      className="w-full bg-black/60 border border-green-500/20 rounded-xl px-4 py-2.5 text-[10px] text-green-100 outline-none focus:border-green-400 transition-all cursor-pointer"
                    >
                      <option value="">Select Match...</option>
                      {(choices as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                      <option value={`Negeer ${term}`}>Negeer "{term}"</option>
                    </select>
                  </div>
                ))}
             </div>
             <button 
                onClick={handleSelectionConfirm}
                className="mt-4 w-full py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
             >
               Finalize Counsel
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
             Bear Judge Ruxa is an AI assistant. Verify rulings with current Comprehensive Rules for competitive play.
           </p>
        </div>
      </div>
    </div>
  );
}

// Helper to get images from card
function get_card_images(card: Card) {
  return card.image_uris || card.card_faces?.[0]?.image_uris || { normal: '', small: '', art_crop: '' };
}
