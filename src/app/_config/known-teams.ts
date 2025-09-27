import { Lineup } from '../_interfaces/lineupInterface';

type BaseTeam = {
  id: string;
  label: string;
  preview?: string;
  hidden?: boolean;
};

type InlineTeam = BaseTeam & {
  source: 'inline';
  lineup: Lineup;
};

type RemoteTeam = BaseTeam & {
  source: 'remote';
  file: string;
};

export type KnownTeamConfig = InlineTeam | RemoteTeam;

export const TEAM_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="100%" height="100%" rx="12" fill="#ffffff" stroke="#1f2a37" stroke-width="4"/>
    <circle cx="80" cy="68" r="26" fill="none" stroke="#1f2a37" stroke-width="4"/>
    <path d="M36 130c10-22 34-26 44-26s34 4 44 26" fill="none" stroke="#1f2a37" stroke-width="4" stroke-linecap="round"/>
  </svg>`);

export const KNOWN_TEAMS: KnownTeamConfig[] = [
  {
    id: 'demo',
    label: 'Demo Team',
    source: 'remote',
    file: 'knownTeams/Demo.randomizer',
    preview: TEAM_PLACEHOLDER,
    hidden: true,
  },
  {
    id: 'jungle-diff',
    label: 'Jungle Diff',
    source: 'remote',
    file: 'knownTeams/Jungle_Diff.randomizer',
    preview: TEAM_PLACEHOLDER,
  },
  {
    id: 'resterampe-sued',
    label: 'Resterampe Süd',
    source: 'remote',
    file: 'knownTeams/Resterampe_S_d.randomizer',
    preview: TEAM_PLACEHOLDER,
  },
  {
    id: 'bonndage',
    label: 'BONNdage',
    source: 'remote',
    file: 'knownTeams/BONNdage.randomizer',
    preview: TEAM_PLACEHOLDER,
  },
];

export function findKnownTeam(
  id: string | null | undefined
): KnownTeamConfig | undefined {
  if (!id) return undefined;
  return KNOWN_TEAMS.find((team) => team.id === id);
}

export function cloneLineup(lineup: Lineup): Lineup {
  return JSON.parse(JSON.stringify(lineup)) as Lineup;
}
