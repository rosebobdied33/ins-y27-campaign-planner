export type CampaignOpeningMedia = {
  stillImage: string | null;
  videoMp4?: string;
  videoWebm?: string;
  videoEnabled: boolean;
  videoInset?: string;
  shade?: string;
};

export const openingMedia: Readonly<Partial<Record<string, CampaignOpeningMedia>>> = {
  S01: {stillImage:"./campaign-opening/2027/S01/cover.webp?v=s01-lucky-town-1",videoEnabled:false,shade:'#351c35'},
  S02: {stillImage:"./campaign-opening/2027/S02/cover.webp",videoEnabled:false},
  S03: {stillImage:"./campaign-opening/2027/S03/cover.webp",videoEnabled:false},
  S04: {stillImage:"./campaign-opening/2027/S04/cover.webp",videoEnabled:false},
  S05: {stillImage:"./campaign-opening/2027/S05/cover.webp",videoEnabled:false},
  S06: {stillImage:"./campaign-opening/2027/S06/cover.webp",videoEnabled:false},
  S07: {stillImage:"./campaign-opening/2027/S07/cover.webp",videoEnabled:false},
};
