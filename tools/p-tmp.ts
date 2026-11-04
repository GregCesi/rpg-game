import { maps } from '../src/content';
import { heightAt } from '../src/world/relief';
const m = maps.ferme;
for (const [x, y] of [[2992, 159], [2992, 142], [2992, 300], [2478, 1611], [2900, 100], [3500, 50]]) console.log(x, y, Math.round(heightAt(m, x, y)));
const lv = m.relief!.levels[0];
console.log(lv.points.slice(0, 6), lv.points.length);
for (const id of Object.keys(maps)) { const r = maps[id].relief; if (r) console.log(id, r.base, r.levels.length, r.ridges.length, r.lanes.length); }
