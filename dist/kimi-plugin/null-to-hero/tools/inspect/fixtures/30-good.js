const charge = (body) => fetch("/api/checkout", { method: "POST", body }).catch(showError);
