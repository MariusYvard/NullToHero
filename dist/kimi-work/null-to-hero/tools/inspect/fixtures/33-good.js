const load = async (u) => {
  try { const r = await fetch(u); return await r.json(); }
  catch { return null; }
};
