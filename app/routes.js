module.exports = function (app, passport, db, stripe) {
  const YOUR_DOMAIN = "http://localhost:8092";

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get("/", function (req, res) {
    res.render("index.ejs");
  });

  // PROFILE SECTION =========================
  function formatCurrency(value) {
    value = value/100
    return `$${value.toFixed(2)}`;
  }

  app.get("/profile", isLoggedIn, function (req, res) {
    db.collection("completed")
      .find({ childEmail: req.user.local.email })
      .toArray((err, completedChores) => {
        let sum = 0;
        completedChores.forEach((chore) => {
          console.log(chore.allowance, "test");
          sum += Number(chore.allowance);
        });
        console.log(sum);
        db.collection("messages")
          .find()
          .toArray((err, result) => {
            if (err) return console.log(err);
            res.render("profile.ejs", {
              user: req.user,
              messages: result,
              completedChores: completedChores,
              totalAllowance: formatCurrency(sum),
            });
          });
      });
  });

  // LOGOUT ==============================
  app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
  });

  app.post("/messages", (req, res) => {
    console.log(req.body);
    db.collection("messages").save(
      {
        name: req.body.name,
        msg: req.body.msg,
        totalAllowance: 0,
        price: req.body.price,
      },
      (err, result) => {
        if (err) return console.log(err);
        console.log("saved to database");
        res.redirect("/profile");
      }
    );
  });

  app.post("/completed", (req, res) => {
    db.collection("completed").insertOne({
      parent: req.body.name,
      chore: req.body.msg,
      allowance: req.body.price,
      childEmail: req.user.local.email,
    });

    res.redirect("/profile");
  });

  app.delete("/messages", (req, res) => {
    db.collection("messages").findOneAndDelete(
      { name: req.body.name, msg: req.body.msg },
      (err, result) => {
        if (err) return res.send(500, err);
        res.send("Message deleted!");
      }
    );
  });

  app.delete("/completed", (req, res) => {
    db.collection("messages").findOneAndDelete(
      { name: req.body.name, msg: req.body.msg, price: req.body.price },
      (err, result) => {
        if (err) return res.send(500, err);
        res.send("Message deleted!");
      }
    );
  });

  app.post("/create-payment-intent", async (req, res) => {
    db.collection("completed")
      .find({ childEmail: req.user.local.email })
      .toArray(async (err, result) => {
        console.log(result);
        try {
          const items = result.map((chore) => {
            console.log(chore)
            return {
              quantity: 1,
              currency: "usd",
              name: chore.chore,
              amount: chore.allowance,
            };
          });
          console.log(items)
          const session = await stripe.checkout.sessions.create({
            line_items: items, 
            mode: "payment",
            success_url: `${YOUR_DOMAIN}/profile`,
            cancel_url: `${YOUR_DOMAIN}/cancel.html`,
          });
          res.redirect(session.url);
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
      });
  });

  // show the login form
  app.get("/login", function (req, res) {
    res.render("login.ejs", { message: req.flash("loginMessage") });
  });

  // process the login form
  app.post(
    "/login",
    passport.authenticate("local-login", {
      successRedirect: "/profile", // redirect to the secure profile section
      failureRedirect: "/login", // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    })
  );

  // SIGNUP =================================
  // show the signup form
  app.get("/signup", function (req, res) {
    res.render("signup.ejs", { message: req.flash("signupMessage") });
  });

  // process the signup form
  app.post(
    "/signup",
    passport.authenticate("local-signup", {
      successRedirect: "/profile", // redirect to the secure profile section
      failureRedirect: "/signup", // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    })
  );

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get("/unlink/local", isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
      res.redirect("/profile");
    });
  });
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();

  res.redirect("/");
}
