// Server/seed entry only: never import scenario solutions into applicant UI.
import tracks from '../../../server/scenarios/revised.json';
import type { TrackConfig } from '../../types';
export const productManagementTrack = tracks.find(t => t.id === 'product-management') as unknown as TrackConfig;
