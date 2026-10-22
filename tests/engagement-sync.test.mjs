import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderEngagementSql } from '../scripts/lib/engagement-sync.mjs';
const params={
  start:'2026-10-01',end:'2026-10-23',now:'2026-10-23T02:00:00.000Z',
  daily:[{day:'2026-10-22',article:'bloom-energy-valuation-lab',language:'en',event:'lab_start',total:3}],
  useful:[{article:'bloom-energy-valuation-lab',active_useful:1}],
};
describe('privacy-safe Production engagement sync',()=>{
  it('copies only daily grouped counts and marks sync complete last',()=>{
    const sql=renderEngagementSql(params);
    assert.match(sql,/lab_start',3\);/);
    assert.match(sql,/analytics_useful_snapshot/);
    assert.equal(sql.trim().split('\n').at(-1).startsWith('INSERT OR REPLACE INTO analytics_engagement_sync_state'),true);
    assert.doesNotMatch(sql,/actor_hash|viewer_id|ip_address/);
  });
  it('rejects out-of-window events and invalid inputs',()=>{
    assert.throws(()=>renderEngagementSql({...params,daily:[{...params.daily[0],day:'2026-09-20'}]}));
    assert.throws(()=>renderEngagementSql({...params,daily:[{...params.daily[0],event:'page_view'}]}));
    assert.throws(()=>renderEngagementSql({...params,daily:[{...params.daily[0],total:-1}]}));
  });
});
