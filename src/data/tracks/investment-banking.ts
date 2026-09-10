// Server/seed entry only: never import scenario solutions into applicant UI.
import tracks from '../../../server/scenarios/revised.json';
import type { TrackConfig } from '../../types';
export const investmentBankingTrack = tracks.find(t => t.id === 'investment-banking') as unknown as TrackConfig;
