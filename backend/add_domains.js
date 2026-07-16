const { admin } = require('./src/config/firebase');
const db = admin.firestore();

const FALLBACK_DOMAINS = [
  { domain: 'vit.ac.in', is_active: true, org_name: 'Vellore Institute of Technology', org_logo: '🏛️' },
  { domain: 'vitstudent.ac.in', is_active: true, org_name: 'VIT Student Portal', org_logo: '🎓' },
  { domain: 'vitapstudent.ac.in', is_active: true, org_name: 'VIT-AP Student Portal', org_logo: '🎓' },
  { domain: 'chennai.vit.ac.in', is_active: true, org_name: 'VIT Chennai', org_logo: '🏛️' },
  { domain: 'vitap.ac.in', is_active: true, org_name: 'VIT-AP', org_logo: '🏛️' },
  { domain: 'vitbhopal.ac.in', is_active: true, org_name: 'VIT Bhopal', org_logo: '🏛️' }
];

async function addDomains() {
  try {
    for (const d of FALLBACK_DOMAINS) {
      const existing = await db.collection('allowed_domains').where('domain', '==', d.domain).get();
      if (existing.empty) {
        await db.collection('allowed_domains').add({
          ...d,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Added ${d.domain}`);
      } else {
        console.log(`Skipped ${d.domain} (already exists)`);
      }
    }
    console.log('Done!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

addDomains();
