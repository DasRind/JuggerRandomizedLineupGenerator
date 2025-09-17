export interface Lineup {
  players: Player[];
  teamName?: string;
  teamLogo?: string;
}

export interface Player {
  name: string;
  profilePicture: string; // base 64 coded image
  quick: string[];
  spars: string[];
  chains: string[];
}
