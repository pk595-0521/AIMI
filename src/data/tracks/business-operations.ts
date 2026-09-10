// Server/seed entry only: never import scenario solutions into applicant UI.
import tracks from '../../../server/scenarios/revised.json';
import type { TrackConfig } from '../../types';
export const businessOperationsTrack = tracks.find(t => t.id === 'business-operations') as unknown as TrackConfig;
