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
}

export interface SavedDeck {
  id: string;
  name: string;
  tags: string[];
  commanders: string[];
  art_crops: string[];
  ci: string;
}
