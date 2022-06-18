module.exports = function (app, passport, db, stripe) {
  const YOUR_DOMAIN = 'http://localhost:8092';

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get('/', function (req, res) {
    res.render('index.ejs');
  });

  // PROFILE SECTION =========================
  app.get('/profile', isLoggedIn, function (req, res) {
    db.collection('completed').find({ childEmail: req.user.local.email }).toArray((err, completedChores) => {
      let sum = 0
      completedChores.forEach((chore) => {
        console.log(chore.allowance, 'test')
        sum += Number(chore.allowance)
      })
      console.log(sum)
      db.collection('messages').find().toArray((err, result) => {
        if (err) return console.log(err)
        res.render('profile.ejs', {
          user: req.user,
          messages: result,
          completedChores: completedChores,
          totalAllowance: sum
        })
      })
    })
  });

  // LOGOUT ==============================
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

 

  app.post('/messages', (req, res) => {
    console.log(req.body)
    db.collection('messages').save({ name: req.body.name, msg: req.body.msg, totalAllowance: 0, price: req.body.price }, (err, result) => {
      if (err) return console.log(err)
      console.log('saved to database')
      res.redirect('/profile')
    })
  })

  app.post('/completed', (req, res) => {
    db.collection('completed')
        .insertOne({ parent: req.body.name, chore: req.body.msg, allowance: req.body.price, childEmail: req.user.local.email })

      res.redirect('/profile')
  
  })
 

  app.delete('/messages', (req, res) => {
    db.collection('messages').findOneAndDelete({ name: req.body.name, msg: req.body.msg }, (err, result) => {
      if (err) return res.send(500, err)
      res.send('Message deleted!')
    })
  })

  app.post('/create-payment-intent', async (req, res) => {
    db.collection('completed').find({ childEmail: req.user.local }).toArray(async (err, result) => {
      console.log(result)
      try {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          result.map(chore => {
            return {
          
            price: chore.allowance,
            quantity: 1,
            currency: 'usd',
            amount: chore.allowance
          ,
            }
        }),
        ],
        mode: 'payment',
        success_url: `${YOUR_DOMAIN}/success.html`,
        cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      });
      res.json({ url: session.url })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
    });
    
  });

  // app.post("/create-payment-intent", async (req, res) => {
  //   const { items } = req.body;
  // console.log('give me monneyy')
  //   // Create a PaymentIntent with the order amount and currency
  //   const paymentIntent = await stripe.paymentIntents.create({
  //     amount: totalAllowance,
  //     currency: "usd",
  //     automatic_payment_methods: {
  //       enabled: true,
  //     },
  //   });
  //   // commented out calulculate order amount
  
  //   res.send({
  //     clientSecret: paymentIntent.client_secret,
  //   });
  // });

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function (req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function (req, res) {
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}
