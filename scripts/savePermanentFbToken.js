const mongoose = require('../server/node_modules/mongoose');
const dotenv = require('../server/node_modules/dotenv');
dotenv.config({ path: './server/.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const s = await mongoose.connection.db.collection('sitesettings').findOne();
  const inputToken = s.fbPageAccessToken;
  const appId = s.fbAppId;
  const appSecret = s.fbAppSecret;

  console.log('1. Exchanging user token to long-lived user token...');
  const exUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${inputToken}`;
  const exRes = await fetch(exUrl);
  const exData = await exRes.json();
  console.log('Exchange status:', exData.access_token ? 'SUCCESS' : exData);

  const longLivedUserToken = exData.access_token || inputToken;

  console.log('2. Fetching page access token using long-lived user token...');
  const pageRes = await fetch(`https://graph.facebook.com/v20.0/1213659151838727?fields=id,name,access_token&access_token=${longLivedUserToken}`);
  const pageData = await pageRes.json();
  console.log('Page query result:', { id: pageData.id, name: pageData.name, hasToken: !!pageData.access_token });

  if (pageData.access_token) {
    const appToken = `${appId}|${appSecret}`;
    const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${pageData.access_token}&access_token=${appToken}`);
    const debug = await debugRes.json();
    console.log('Page Token Verification:', {
      type: debug.data?.type,
      is_valid: debug.data?.is_valid,
      expires_at: debug.data?.expires_at === 0 ? 'NEVER (Permanent!)' : debug.data?.expires_at,
      profile_id: debug.data?.profile_id
    });

    console.log('3. Saving permanent page token to MongoDB...');
    await mongoose.connection.db.collection('sitesettings').updateOne(
      { _id: s._id },
      {
        $set: {
          fbPageAccessToken: pageData.access_token,
          fbPageId: pageData.id,
          updatedAt: new Date()
        }
      }
    );
    console.log('🎉 SUCCESS! Permanent Page Token saved to MongoDB!');
  }
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
