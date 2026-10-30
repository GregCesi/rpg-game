// PROVISOIRE (à remplacer par les pièces du tronc couché).
import { Canvas } from '../lib/canvas';
import { FALL_H, FALL_W } from './normal-geometry';
export const lyingFrame = (): Canvas => new Canvas(FALL_W, FALL_H);
export const lyingFrameLeft = (): Canvas => new Canvas(FALL_W, FALL_H);
export default [];
