const STRIPE = "sk_live_EXAMPLE0000";
const charge = (body) => post("/pay", { key: STRIPE, body }).catch(showError);
