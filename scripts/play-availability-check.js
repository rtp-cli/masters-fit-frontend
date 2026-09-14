const crypto = require('crypto');
// Read-only: prints Play subscription base-plan regions + production country availability.
// Creates and DELETES a Play edit; writes nothing. Run: node scripts/play-availability-check.js

const sa = require('../google-play-service-account.json');
const PKG = 'com.mastersfit.ai';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

async function token() {
  const now = Math.floor(Date.now()/1000);
  const h = b64({alg:'RS256',typ:'JWT'});
  const c = b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now});
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${c}`), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${h}.${c}.${sig}`})});
  const j = await r.json();
  if(!j.access_token) throw new Error(JSON.stringify(j));
  return j.access_token;
}

(async () => {
  const t = await token();
  const api = async (path, method='GET') => {
    const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}${path}`,{method,headers:{Authorization:`Bearer ${t}`}});
    const txt = await r.text();
    try { return {status:r.status, body:JSON.parse(txt)}; } catch { return {status:r.status, body:txt}; }
  };

  // 1) subscriptions + base plan regional configs (READ ONLY)
  const subs = await api('/subscriptions?pageSize=50');
  console.log('=== SUBSCRIPTIONS ===', subs.status);
  if (subs.body.subscriptions) {
    for (const s of subs.body.subscriptions) {
      console.log(`\nproduct: ${s.productId}`);
      for (const bp of (s.basePlans||[])) {
        const regions = (bp.regionalConfigs||[]).map(r=>r.regionCode);
        console.log(`  basePlan ${bp.basePlanId} state=${bp.state} regions(${regions.length}): ${regions.join(',')||'(none)'}`);
        if (bp.otherRegionsConfig) console.log(`    otherRegionsConfig: ${JSON.stringify(bp.otherRegionsConfig)}`);
      }
    }
  } else console.log(JSON.stringify(subs.body).slice(0,800));

  // 2) country availability for production track (needs an edit; created then DELETED)
  const ed = await api('/edits','POST');
  if (ed.status !== 200) { console.log('\n=== EDIT CREATE FAILED ===', ed.status, JSON.stringify(ed.body).slice(0,400)); return; }
  const id = ed.body.id;
  try {
    const ca = await api(`/edits/${id}/countryavailability/production`);
    console.log('\n=== PRODUCTION COUNTRY AVAILABILITY ===', ca.status);
    const c = ca.body;
    if (c.countries) console.log(`syncWithProduction=${c.syncWithProduction} count=${c.countries.length}: ${c.countries.map(x=>x.countryCode).join(',')}`);
    else console.log(JSON.stringify(c).slice(0,600));
  } finally {
    const d = await api(`/edits/${id}`,'DELETE');
    console.log('\n(edit deleted, status', d.status + ')');
  }
})().catch(e=>{console.error('ERR', e.message)});
