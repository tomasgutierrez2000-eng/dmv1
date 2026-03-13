import releaseData from '@/data/release-entries.json';

export interface ReleaseEntry {
  date: string;
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  changeType: 'Added' | 'Removed' | 'Moved';
  rationale: string;
}

/** All data model changes, newest first. */
export const RELEASE_ENTRIES: ReleaseEntry[] = releaseData as ReleaseEntry[];
