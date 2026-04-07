import { useQuery, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export interface AppSettings {
  backgroundImageUrl: string | null;
  titleImageUrl: string | null;
  packOpenSoundUrl: string | null;
  cardFlipSoundUrl: string | null;
  epicFlipSoundUrl: string | null;
  mythicFlipSoundUrl: string | null;
  legendaryFlipSoundUrl: string | null;
  boxOpenSoundUrl: string | null;
  figurineRevealSoundUrl: string | null;
  coinValueCommon: number;
  coinValueRare: number;
  coinValueEpic: number;
  coinValueMythic: number;
  coinValueLegendary: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  backgroundImageUrl: null,
  titleImageUrl: null,
  packOpenSoundUrl: null,
  cardFlipSoundUrl: null,
  epicFlipSoundUrl: null,
  mythicFlipSoundUrl: null,
  legendaryFlipSoundUrl: null,
  boxOpenSoundUrl: null,
  figurineRevealSoundUrl: null,
  coinValueCommon: 1,
  coinValueRare: 2,
  coinValueEpic: 4,
  coinValueMythic: 5,
  coinValueLegendary: 10,
};

async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API}/settings`);
  if (!res.ok) return DEFAULT_SETTINGS;
  const data = await res.json();
  return { ...DEFAULT_SETTINGS, ...data };
}

export function useSettings() {
  const { data } = useQuery<AppSettings>({
    queryKey: ["app-settings"],
    queryFn: fetchSettings,
    staleTime: 30_000,
  });
  return data ?? DEFAULT_SETTINGS;
}

type SettingKey =
  | "background_image_url"
  | "title_image_url"
  | "pack_open_sound_url"
  | "card_flip_sound_url"
  | "epic_flip_sound_url"
  | "mythic_flip_sound_url"
  | "legendary_flip_sound_url"
  | "box_open_sound_url"
  | "figurine_reveal_sound_url"
  | "coin_value_common"
  | "coin_value_rare"
  | "coin_value_epic"
  | "coin_value_mythic"
  | "coin_value_legendary";

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return async (key: SettingKey, value: string | null) => {
    await fetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    queryClient.invalidateQueries({ queryKey: ["app-settings"] });
  };
}
