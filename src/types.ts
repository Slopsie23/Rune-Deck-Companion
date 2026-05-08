/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Card {
  id: string;
  name: string;
  image_uris?: {
    normal: string;
    small: string;
    art_crop: string;
  };
  prices?: {
    eur?: string;
    usd?: string;
  };
  type_line: string;
  rarity: string;
  cmc: number;
  color_identity: string[];
  card_faces?: Array<{
    image_uris?: {
      normal: string;
      small: string;
      art_crop: string;
    };
  }>;
}

export interface DeckCard {
  name: string;
  thumb: string;
  from_deck: string;
  qty: number;
  prices?: {
    eur?: string;
  };
}

export interface SavedDeck {
  id: string;
  name: string;
  tags: string[];
  commanders: string[];
  commanderNames?: string[]; // Added to match usage
  existingNames?: string[];  // Added to persist card names in deck
  art_crops: string[];
  ci: string;
  totalCost?: number;
  ranking?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  released_at?: string;
  set_type: string;
  card_count: number;
  icon_svg_uri: string;
  digital?: boolean;
  parent_set_code?: string;
}
