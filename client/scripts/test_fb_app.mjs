async function test() {
  const appId = "974777838976699";
  const appSecret = "ICEpZOlbPcct0SAlR0-E_sCH0M4";
  const token = `${appId}|${appSecret}`;
  const res = await fetch(`https://graph.facebook.com/v20.0/app?access_token=${token}`);
  const data = await res.json();
  console.log("App Info:", data);
}
test();
