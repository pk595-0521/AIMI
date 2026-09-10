import { TrackConfig, TrackId } from '../../types';
import { consultingTrack } from './consulting';
import { investmentBankingTrack } from './investment-banking';
import { businessOperationsTrack } from './business-operations';
import { productManagementTrack } from './product-management';

export const ALL_TRACKS: Record<TrackId, TrackConfig> = {
  consulting: consultingTrack,
  'investment-banking': investmentBankingTrack,
  'business-operations': businessOperationsTrack,
  'product-management': productManagementTrack,
};

export const TRACK_LIST: TrackConfig[] = [
  consultingTrack,
  investmentBankingTrack,
  businessOperationsTrack,
  productManagementTrack,
];

export function getTrackById(trackId: TrackId): TrackConfig {
  return ALL_TRACKS[trackId] || consultingTrack;
}

export function getTrackConfig(trackId: TrackId): TrackConfig {
  return getTrackById(trackId);
}
