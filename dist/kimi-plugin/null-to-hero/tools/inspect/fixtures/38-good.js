app.use((err, req, res, next) => { report(err); res.status(500).send("Something went wrong"); });
