import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { 
  Sparkles, 
  Send, 
  Trash2, 
  BookOpen, 
  Layers, 
  Search, 
  Plus, 
  Bot, 
  HelpCircle, 
  Heart, 
  Eye, 
  Clock, 
  Volume2, 
  Terminal,
  ChevronRight,
  Info,
  Compass,
  Zap,
  CheckCircle,
  Gavel,
  User
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "codie";
  text: string;
  timestamp: Date;
  suggestedCards?: string[];
}

interface CodieCodexProps {
  user: any;
  onAddCardToDeckbox?: (cardName: string) => void;
  onPreviewCard?: (cardName: string) => void;
  onCreateNewDeck?: (commanderName: string, deckName: string, suggestedList?: string[]) => void;
  showMessage?: (text: string, type: "success" | "error" | "info") => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function CodieCodex({
  user,
  onAddCardToDeckbox,
  onPreviewCard,
  onCreateNewDeck,
  showMessage,
  messages,
  setMessages,
}: CodieCodexProps) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [codieData, setCodieData] = useState<any>(null);
  const [scryfallResults, setScryfallResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingScry, setSearchingScry] = useState(false);
  
  // Hover & instant preview tooltip states local to Codex
  const [hoveredCardUrl, setHoveredCardUrl] = useState<string | null>(null);
  const hoverCache = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Codie's official card data from Scryfall on mount
  useEffect(() => {
    async function fetchCodie() {
      try {
        const response = await axios.get("/api/sf/cards/named?exact=Codie,%20Vociferous%20Codex");
        if (response.data) {
          setCodieData(response.data);
        }
      } catch (err) {
        console.warn("Could not load Codie Scryfall info", err);
      }
    }
    fetchCodie();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle instant scryfall lookup on hover
  const handleHoverCard = async (cardName: string | null) => {
    if (!cardName) {
      setHoveredCardUrl(null);
      return;
    }
    const cleanName = cardName.trim();
    if (hoverCache.current[cleanName]) {
      setHoveredCardUrl(hoverCache.current[cleanName]);
      return;
    }
    try {
      const response = await axios.get(`/api/sf/cards/named?exact=${encodeURIComponent(cleanName)}`);
      if (response.data) {
        const imageUris = response.data.image_uris;
        let imgUrl = "";
        if (imageUris) {
          imgUrl = imageUris.normal || imageUris.large || imageUris.png;
        } else if (response.data.card_faces) {
          imgUrl = response.data.card_faces[0].image_uris?.normal || response.data.card_faces[0].image_uris?.large;
        }
        if (imgUrl) {
          hoverCache.current[cleanName] = imgUrl;
          setHoveredCardUrl(imgUrl);
        }
      }
    } catch (e) {
      try {
        const response2 = await axios.get(`/api/sf/cards/search?q=${encodeURIComponent(cleanName)}`);
        if (response2.data && response2.data.data && response2.data.data.length > 0) {
          const card = response2.data.data[0];
          const imgUrl = card.image_uris?.normal || card.image_uris?.large || card.card_faces?.[0]?.image_uris?.normal;
          if (imgUrl) {
            hoverCache.current[cleanName] = imgUrl;
            setHoveredCardUrl(imgUrl);
          }
        }
      } catch (err2) {
        console.error("Hover preview fetch failed for:", cleanName);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const speech = (textToSend || inputValue).trim();
    if (!speech) return;

    if (!textToSend) {
      setInputValue("");
    }

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: speech,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      // Build conversation history for Gemini context
      const contents = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));
      contents.push({
        role: "user",
        parts: [{ text: speech }],
      });

      const systemPrompt = `
You are "Codex Codie", the ultimate strategic Magic: The Gathering deck-building companion, rulebook database, and advisor.

YOUR MISSION:
- Help the user discover awesome, interesting commanders, explore highly synergistic card combinations, and research cohesive builds.
- Focus on helping the user explore creative, fresh deck-building ideas, identify hidden Gems, and conceptualize win conditions.
- Houd antwoorden beknopt, direct en krachtig (dit verhoogt de reactiesnelheid aanzienlijk!). Vermijd inleidingen en overbodig geklets.
- DO NOT use roleplay elements or action narrations in asterisks (e.g. DO NOT say "*ritselt met bladzijden*").
- You MUST speak in Dutch (Nederlands), but list and reference standard MTG terms in English when appropriate ("ramp", "board wipe", "cantrips", "color identity", "synergy", "win conditions").

CARD BRACKETS:
- Whenever you suggest cards, ALWAYS wrap their EXACT name in double brackets, like [[Card Name]] so the user can hover over them to preview instantly on our app. Keep the card list to a hard-hitting 5-8 recommendations to speed up response time.
`;

      const { data } = await axios.post("/api/gemini", {
        model: "gemini-3.5-flash",
        contents,
        systemInstruction: systemPrompt,
        config: {
          temperature: 0.7,
        },
      });

      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mijn spellenslots weigeren dienst... Probeert u het nog eens?";
      
      // Parse suggested cards from double bracket format: [[Card Name]]
      const cardPattern = /\[\[(.*?)\]\]/g;
      let match;
      const detectedCards: string[] = [];
      while ((match = cardPattern.exec(replyText)) !== null) {
        if (match[1] && !detectedCards.includes(match[1])) {
          detectedCards.push(match[1]);
        }
      }

      const codieMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "codie",
        text: replyText,
        timestamp: new Date(),
        suggestedCards: detectedCards.length > 0 ? detectedCards : undefined,
      };

      setMessages((prev) => [...prev, codieMsg]);

      // If we detected cards, let's automatically queue up a mini Scryfall search to let the user see them
      if (detectedCards.length > 0) {
        searchFirstSuggestedCard(detectedCards[0]);
      }
    } catch (error: any) {
      console.error("Codie Codex failed to reply:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "codie",
          text: "Mijn mystieke verbindingen raakten verstrikt. Probeert u het nogmaals.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const searchFirstSuggestedCard = async (cardName: string) => {
    try {
      setSearchingScry(true);
      const response = await axios.get(`/api/sf/cards/search?q=${encodeURIComponent(cardName)}`);
      if (response.data && response.data.data) {
        setScryfallResults(response.data.data.slice(0, 5));
      }
    } catch (e) {
      // Quiet fail
    } finally {
      setSearchingScry(false);
    }
  };

  const handleScryfallSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearchingScry(true);
      const response = await axios.get(`/api/sf/cards/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.data && response.data.data) {
        setScryfallResults(response.data.data);
      }
    } catch (err) {
      if (showMessage) {
        showMessage("Geen kaarten gevonden voor deze zoekopdracht", "error");
      }
    } finally {
      setSearchingScry(false);
    }
  };

  const handleAddCard = (name: string) => {
    if (onAddCardToDeckbox) {
      onAddCardToDeckbox(name);
    }
  };

  const handleCreateDeckFromCommander = (name: string, list?: string[]) => {
    if (onCreateNewDeck) {
      onCreateNewDeck(name, `${name} Strategy Deck`, list);
      if (showMessage) {
        showMessage(`Nieuw deck gecreëerd rondom ${name}!`, "success");
      }
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        sender: "codie",
        text: "Herstarten! Mijn geheugenchips zijn gewist.\n\nWat is ons volgende magische avontuur? Vertel me een Commander of kleur die je wilt verkennen!",
        timestamp: new Date(),
      },
    ]);
    setScryfallResults([]);
  };

  const formatText = (text: string) => {
    let formatted = text;
    // Highlight bracketed cards with cyan
    formatted = formatted.replace(/\[\[(.*?)\]\]/g, '<span class="text-cyan-400 font-magic font-bold cursor-pointer hover:underline" data-card="$1">[[ $1 ]]</span>');
    return formatted;
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const cardName = target.getAttribute("data-card");
    if (cardName && onPreviewCard) {
      onPreviewCard(cardName);
    }
  };

  const presetPrompts = [
    "Welke legendarische Commanders passen bij een uniek Spellslinger deck?",
    "Welke obscure kaarten hebben vette synergie met een Artifact-thema?",
    "Help me een deck bouwen rondom een ongebruikelijke, gave Commander.",
    "Bedenk 5 hoog-synergetische kaarten voor een Lands-matter strategie.",
  ];

  const codieNormalImage = codieData?.image_uris?.art_crop || "/api/sfimg?name=Codie,%20Vociferous%20Codex";

  return (
    <div className="h-full bg-transparent overflow-y-auto no-scrollbar relative p-4 lg:p-6 font-sans select-none">
      
      {/* Mystical Background Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[100px] animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto h-[78vh] grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left column: Codex Profile & Live Scryfall tool helper */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 h-full">
          
          {/* Arcane profile card */}
          <div className="rune-panel p-5 border border-pink-500/20 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group shadow-[inset_0_0_25px_rgba(236,72,153,0.05)]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-pink-400/40 to-transparent" />
            
            {/* Codie Avatar with pulsing artifact layout & background elimination effect with Rotating Runes */}
            <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
              {/* Rotating Runic Orbit Circle */}
              <svg className="absolute inset-0 w-full h-full animate-[spin_40s_linear_infinite]" viewBox="0 0 100 100">
                <path id="runeCircle" d="M 50,50 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" fill="none" />
                <text>
                  <textPath href="#runeCircle" fill="#ec4899" className="font-mono text-[5.5px] tracking-[0.22em] font-black opacity-60">
                    ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ
                  </textPath>
                </text>
              </svg>

              {/* Glowing Aura Ring */}
              <div className="absolute w-[124px] h-[124px] rounded-full border border-pink-500/30 animate-pulse shadow-[0_0_25px_rgba(236,72,153,0.15)] pointer-events-none" />

              {/* Isolate Central Archetype character via custom close-circle Vignette blend */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.25)] z-10 bg-black">
                <img 
                  src={codieNormalImage} 
                  alt="Codex Codie" 
                  className="w-full h-full object-cover scale-110 saturate-[1.1] contrast-[1.05]"
                  referrerPolicy="no-referrer"
                />
                
                {/* CSS Vignette Filter: removes the background elements of the art, focusing purely on central book */}
                <div 
                  className="absolute inset-0 opacity-80 mix-blend-multiply" 
                  style={{ background: "radial-gradient(circle close-corner, transparent 35%, rgba(3,7,18,0.98) 95%)" }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-950/40 via-transparent to-transparent" />
              </div>
            </div>

            <h3 className="text-lg font-magic font-black uppercase tracking-widest text-white leading-none">
              Codex Codie
            </h3>
            <p className="text-[10px] font-mono text-pink-400/60 uppercase tracking-widest mt-1">
              Actieve Rune Module
            </p>

            {/* Card stats */}
            {codieData && (
              <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-[9px] font-mono leading-none">
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <span className="block text-white/30 uppercase text-[7px] mb-1">Mana Cost</span>
                  <span className="text-white font-bold">{codieData.mana_cost || "{3}"}</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <span className="block text-white/30 uppercase text-[7px] mb-1">Casting CI</span>
                  <span className="text-pink-400 font-bold">W-U-B-R-G</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                  <span className="block text-white/30 uppercase text-[7px] mb-1">P / T</span>
                  <span className="text-orange-500 font-bold">1 / 4</span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/50 text-left mt-3 leading-relaxed border-t border-white/5 pt-3 w-full">
              💡 *Tip:* "Hover your cursor over card names in the text like <span className="text-pink-400 font-bold font-magic">[[Sol Ring]]</span> to instantly project a full-size image!"
            </p>
          </div>

          {/* Integrated Live Scryfall Helper */}
          <div className="flex-1 rune-panel p-4 border border-pink-500/10 rounded-2xl flex flex-col overflow-hidden shadow-[inset_0_0_20px_rgba(236,72,153,0.03)]">
            <h4 className="text-[9px] font-magic font-black text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> Live Scryfall Scanner
            </h4>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScryfallSearch()}
                placeholder="Search card (e.g., 'Korvold', 'Krenko')"
                className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all uppercase font-magic"
              />
              <button
                onClick={handleScryfallSearch}
                disabled={searchingScry}
                className="px-3 bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
              >
                {searchingScry ? <span className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {scryfallResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-25 p-4 border border-dashed border-white/5 rounded-xl">
                  <BookOpen className="w-8 h-8 text-white/40 mb-2" />
                  <span className="text-[9px] font-magic uppercase tracking-wider block">Scan results will appear here</span>
                </div>
              ) : (
                scryfallResults.slice(0, 10).map((card) => {
                  const art = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || "/api/sfimg?name=" + card?.name;
                  return (
                    <div 
                      key={card.id}
                      onMouseEnter={() => handleHoverCard(card.name)}
                      onMouseLeave={() => handleHoverCard(null)}
                      className="p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-pink-500/25 flex items-center justify-between gap-3 group transition-all duration-300"
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => onPreviewCard && onPreviewCard(card.name)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                          <img src={art} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-[10px] font-magic font-extrabold text-white uppercase tracking-wider truncate group-hover:text-pink-400 transition-colors leading-tight">
                            {card.name}
                          </p>
                          <p className="text-[8px] font-mono text-white/40 truncate uppercase font-bold mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{card.type_line}</span>
                            {(card.prices?.eur || card.prices?.eur_foil) && (
                              <>
                                <span className="text-white/20">•</span>
                                <span className="text-emerald-400">€{parseFloat(card.prices.eur || card.prices.eur_foil).toFixed(2)}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAddCard(card.name)}
                          title="Add to Deckbox"
                          className="w-7 h-7 rounded-md bg-white/5 border border-white/10 hover:bg-pink-500/10 hover:border-pink-500/30 text-white/60 hover:text-pink-400 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* If legendary creature, offer commander build button */}
                        {card.type_line?.toLowerCase().includes("legendary creature") && (
                          <button
                            onClick={() => handleCreateDeckFromCommander(card.name)}
                            title="Build deck around this"
                            className="w-7 h-7 rounded-md bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/40 text-orange-500/80 hover:text-orange-400 flex items-center justify-center transition-all active:scale-90"
                          >
                            <Gavel className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right column: Interactive Chat Area */}
        <div className="lg:col-span-8 flex flex-col rune-panel border border-pink-500/15 rounded-2xl h-[75vh] lg:h-full overflow-hidden relative shadow-[inset_0_0_30px_rgba(236,72,153,0.04)]">
          
          <header className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink-400/10 border border-pink-400/20 flex items-center justify-center relative">
                <Bot className="w-5 h-5 text-pink-400 animate-pulse" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] border border-black" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-magic font-black uppercase tracking-[0.15em] text-white">Codex Codie Adviseur</span>
                <span className="block text-[8px] font-mono text-white/30 uppercase tracking-widest font-black">Connected to Gemini intelligence</span>
              </div>
            </div>

            <button
              onClick={clearChat}
              title="Reset gesprek"
              className="px-3 py-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 text-red-500/80 hover:text-red-400 text-[8px] font-magic font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset
            </button>
          </header>

          {/* Messages History Container with mouse hover delegation */}
          <div 
            className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4"
            onClick={handleMessageClick}
            onMouseMove={(e) => {
              const target = e.target as HTMLElement;
              const cardElement = target.closest("[data-card]");
              if (cardElement) {
                const cardName = cardElement.getAttribute("data-card");
                if (cardName) {
                  handleHoverCard(cardName);
                  return;
                }
              }
              handleHoverCard(null);
            }}
            onMouseLeave={() => {
              handleHoverCard(null);
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar icon */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  msg.sender === "user" ? "border-orange-500/20 bg-orange-500/5 text-orange-400" : "border-pink-500/20 bg-pink-500/5 text-pink-400"
                }`}>
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </div>

                <div className="space-y-1.5">
                  <div className={`p-3.5 rounded-2xl border text-left text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                    msg.sender === "user" 
                      ? "bg-orange-500/5 border-orange-500/10 text-orange-200 rounded-tr-none text-right" 
                      : "bg-[#050505] border-white/5 text-white/90 rounded-tl-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
                  }`}>
                    {/* Render message with interactive scryfall links for cards */}
                    <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  </div>

                  {/* Attachment Card suggestions inside bot message */}
                  {msg.sender === "codie" && msg.suggestedCards && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                      {msg.suggestedCards.map((cName) => (
                        <div 
                          key={cName}
                          onMouseEnter={() => handleHoverCard(cName)}
                          onMouseLeave={() => handleHoverCard(null)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/5 border border-pink-400/15 text-[9px] font-magic font-black uppercase tracking-wider text-pink-400 hover:border-pink-400 hover:bg-pink-500/10 group transition-all"
                        >
                          <span className="cursor-pointer" onClick={() => onPreviewCard && onPreviewCard(cName)}>
                            {cName}
                          </span>
                          
                          <button 
                            className="hover:text-white transition-colors ml-1 border-l border-white/10 pl-1"
                            onClick={() => handleAddCard(cName)}
                            title="Add to Deckbox"
                          >
                            <Plus className="w-3 h-3 text-pink-400 group-hover:scale-110" />
                          </button>

                          {/* Instant Build Deck from this commander suggestion */}
                          <button
                            className="hover:text-white transition-colors ml-1 border-l border-white/10 pl-1"
                            onClick={() => handleCreateDeckFromCommander(cName, msg.suggestedCards)}
                            title="Build local deck around this"
                          >
                            <Gavel className="w-3 h-3 text-pink-400 group-hover:scale-110" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className={`block text-[8px] font-mono text-white/20 uppercase tracking-widest ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Pulsing loading state */}
            {loading && (
              <div className="flex gap-3 mr-auto max-w-[80%]">
                <div className="w-8 h-8 rounded-lg border border-pink-500/20 bg-pink-500/5 text-pink-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 animate-spin text-pink-500" />
                </div>
                <div className="p-3.5 bg-black/60 border border-white/5 rounded-2xl rounded-tl-none text-left flex items-center gap-2">
                  <span className="text-[10px] font-magic font-extrabold uppercase tracking-widest text-[#e49cc3] animate-pulse">Codex Codie is reading the archives...</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions area on bottom */}
          <div className="hidden md:flex p-3 border-t border-white/5 bg-black/40 gap-2 overflow-x-auto no-scrollbar justify-start items-center z-10 shrink-0 animate-fade-in w-full">
            <span className="text-[8px] font-magic font-black uppercase text-white/30 tracking-widest shrink-0 whitespace-nowrap">Quick Tips:</span>
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="text-[9px] font-magic font-bold text-[#cab6c2] text-left hover:text-pink-400 border border-white/5 bg-[#050505] hover:bg-pink-500/5 hover:border-pink-500/20 px-3 py-1.5 rounded-lg whitespace-normal max-w-[170px] sm:max-w-[240px] transition-all active:scale-95 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input control block */}
          <footer className="p-4 bg-[#050505]/95 border-t border-white/5 z-10 shrink-0 flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
              disabled={loading}
              placeholder="Ask Codex Codie about upgrades, playstyles or combinations..."
              className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/40 transition-all font-sans"
            />
            
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-magic font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-2 shadow-[0_4px_20px_rgba(236,72,153,0.3)] disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
            >
              <span>Ask</span> <Send className="w-3.5 h-3.5" />
            </button>
          </footer>

          {/* Absolute floating instantaneous hover preview card */}
          <AnimatePresence>
            {hoveredCardUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute shrink-0 z-[1200] bottom-28 left-6 w-56 sm:w-64 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(236,72,153,0.35)] border-2 border-pink-500/50 pointer-events-none"
              >
                <img 
                  src={hoveredCardUrl} 
                  className="w-full h-auto rounded-2xl" 
                  alt="Runic Preview Projector" 
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
