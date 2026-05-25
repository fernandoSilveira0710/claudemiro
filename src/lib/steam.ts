const STEAM_API_KEY = process.env.STEAM_API_KEY!

export interface SteamProfile {
  steamid: string
  personaname: string
  avatarfull: string
  profileurl: string
}

export interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks?: number
  img_icon_url: string
}

export async function getSteamProfile(steamId: string): Promise<SteamProfile | null> {
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
  )
  const data = await res.json()
  return data.response?.players?.[0] || null
}

export async function getSteamGames(steamId: string): Promise<SteamGame[]> {
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
  )
  const data = await res.json()
  return data.response?.games || []
}

export async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${vanityUrl}`
  )
  const data = await res.json()
  return data.response?.steamid || null
}
