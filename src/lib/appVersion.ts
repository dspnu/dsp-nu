type ReleaseChannel = 'stable' | 'alpha' | 'beta' | 'rc' | 'dev';

type FirmwareVersionInfo = {
  raw: string;
  semver: string;
  channel: ReleaseChannel;
  channelLabel: string;
  firmwareLabel: string;
};

const FALLBACK_VERSION = '0.0.0-dev';
const VERSION_PATTERN = /^(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

function inferReleaseChannel(prerelease?: string): ReleaseChannel {
  if (!prerelease) return 'stable';

  const channelPrefix = prerelease.split('.')[0]?.toLowerCase() ?? '';
  if (channelPrefix.startsWith('alpha')) return 'alpha';
  if (channelPrefix.startsWith('beta')) return 'beta';
  if (channelPrefix.startsWith('rc')) return 'rc';
  return 'dev';
}

function getChannelLabel(channel: ReleaseChannel): string {
  switch (channel) {
    case 'alpha':
      return 'Alpha';
    case 'beta':
      return 'Beta';
    case 'rc':
      return 'Release Candidate';
    case 'dev':
      return 'Development';
    default:
      return 'Stable';
  }
}

function readAppVersion(): string {
  const candidates = [import.meta.env.VITE_APP_VERSION, __APP_VERSION__];
  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim() ?? FALLBACK_VERSION;
}

function createFirmwareVersionInfo(rawVersion: string): FirmwareVersionInfo {
  const match = rawVersion.match(VERSION_PATTERN);
  const base = match?.[1] ?? rawVersion;
  const prerelease = match?.[2];
  const build = match?.[3];
  const channel = inferReleaseChannel(prerelease);
  const channelLabel = getChannelLabel(channel);
  const semver = `v${base}${prerelease ? `-${prerelease}` : ''}${build ? `+${build}` : ''}`;

  return {
    raw: rawVersion,
    semver,
    channel,
    channelLabel,
    firmwareLabel: channel === 'stable' ? 'Firmware' : `Firmware ${channelLabel.toLowerCase()}`,
  };
}

export const firmwareVersion = createFirmwareVersionInfo(readAppVersion());
