const e = require("express");
let express = require("express");
const session = require('express-session');
let app = express();

let path = require("path");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json()); // For parsing JSON requests

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({extended: true}));

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false, // TODO Set to true if using HTTPS
      maxAge: 60 * 60 * 1000 // 1 hour
    }
  }));

const knex = require("knex") ({
    client : "pg",
    connection : {
        host : process.env.RDS_HOSTNAME || "awseb-e-94ri3wcgd2-stack-awsebrdsdatabase-5xz6zugqzser.cp6ss68iifrg.us-east-1.rds.amazonaws.com",
        user : process.env.RDS_USERNAME || "hummusUser",
        password : process.env.RDS_PASSWORD || "Thisisforproject3!",
        database : process.env.RDS_DB_NAME || "ebdb",
        port : process.env.RDS_PORT ||  5432,
        ssl : process.env.DB_SSL || {rejectUnauthorized : false},
    }
})

app.get("/", async (req, res) =>
{
    try
    {
        let hummus = await knex.select('*').from('hummus')
            .innerJoin('brand', 'hummus.brandid', 'brand.brandid');
            
        res.render("index", {hummus: hummus});
    }
    catch (err)
    {
        console.log(err);
        res.status(500).send("An error occurred");
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        // Query the user table to find the record
        const user = await knex('customers')
            .select('*')
            .where({ username }) // Find user by username
            .first(); // Returns the first matching record
  
        if (user && user.password === password) { // Replace with hashed password comparison in production
            req.session.loggedIn = true;
            req.session.username = username;
            req.session.userid = user.custid;

            res.redirect('/home');
  
        } else {
          req.session.loggedIn = false;
            res.render('login', { error: 'Invalid credentials' }); // Render login page with error
        }
    } catch (error) {
        res.status(500).send('Database query failed: ' + error.message);
    }
});

app.get('/createUser', (req, res) => {
    res.render('createAccount');
});

app.post('/createUser', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await knex('users').where({ username }).first();
        if (user) {
            return res.status(400).send('User already exists');
        }
        await knex('users').insert({ username, password });
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        res.status(500).send('An error occurred');
    }
});

app.get('/home', async (req, res) => {
    if (req.session.loggedIn) {
        // Pull out the username from the session to find the favorites
        const loggedUsername = req.session.username;

        try {
            let data = await knex.select('*')
                .from('customers')
                .innerJoin('rating', 'customers.custid', 'rating.custid')
                .where('username', loggedUsername)
                .pluck('rating.hummusid');

            let hummus = await knex.select('*').from('hummus')
                .innerJoin('brand', 'hummus.brandid', 'brand.brandid');
            
            res.render('home', { favorites: data, hummus: hummus, user: req.session.userid });
        } catch (error) {
            console.log(error);
            res.status(500).send('Database query failed: ' + error.message);
        }
    } else {
        res.redirect('/login');
    }
});

app.post('/favorite', (req, res) => {
    if (req.session.loggedIn) {
        knex('rating')
        .insert({ 
            custid: parseInt(req.body.custid), 
            hummusid: parseInt(req.body.hummusid),
            favorite: true,
            rating: 5
            })
        .then(() => {
            res.redirect('/home');
        });
    } else {
        res.redirect('/login');
    }
});


app.post('/removeFromFavorites', (req, res) => {
    const custid = req.session.userid;
    const hummusid = req.body.hummusid;

    if (req.session.loggedIn) {
        knex('rating')
        .where({ custid: custid, hummusid: hummusid })
        .del()
        .then(() => {
            res.redirect('/home');
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/');
    });
});

// ROUTE TO DISPLAY ALL FAVORTIES ON FAVORTIE PAGE
app.get




// GET ROUTE THAT WILL GRAB THE USER's FAVORITED HUMMUS WHEN THEY CLICK SAVE ON THE PAGE THAT DISPLAYS ALL THE HUMMUS FAVORTITES PAGE
app.get('/favorites', async (req, res) => {
    // Check if the user is logged in - SECURITY
    if (!req.session.loggedIn) {
        return res.redirect('/login'); // Redirect to login if user is not logged in
    }

    // Retrieve the logged-in user's ID from the session
    let userId = req.session.userid;

    // Initialize variable to hold favorite hummuses
    let favoritehummus;
    try {
        // Fetch favorite hummuses for the logged-in user
        favoritehummus = await knex('rating as r')
    .distinct('h.hummusid', 'h.name', 'h.description', 'h.servingsize', 'h.retailprice', 'b.brandname')
    .innerJoin('hummus as h', 'r.hummusid', 'h.hummusid')
    .innerJoin('brand as b', 'h.brandid', 'b.brandid') // Join the brand table
    .where('r.custid', userId)
    .select('h.hummusid', 'h.name', 'h.description', 
        'h.servingsize', 'h.retailprice', 'b.brandname'); // Select brand_name from the brand table
    } catch (error) {
        console.error('Error fetching favorite hummuses:', error);
        return res.status(500).send('Internal Server Error'); // Return 500 status code if there's an error
    }

    // Render the 'favorites' page with the user's favorite hummuses
    res.render('favorites', { favoritehummus }); 
});


// ROUTE TO DELETE A HUMMUS FROM FAVORITES LIST
app.post('/deleteFavorites/:id', (req, res) => {
    const id = req.params.id
    knex('rating')
    .where({hummusid: id, custid: req.session.userid})
    .del()
    .then(() => {
        res.redirect('/favorites'); 
    })
    // Error Handling
    .catch(error => {
        console.error('Error deleting this Favorite:', error);
        res.status(500).send('Internal Server Error');
        });
      });

app.post("/createAccount", (req, res) =>
{
    const first_name = req.body.firstname
    const last_name = req.body.lastname
    const username = req.body.username
    const password = req.body.password
    const dob = req.body.dob
    const email = req.body.email
    const city = req.body.city
    const state = req.body.state
    const zip = req.body.zip
    const phone = req.body.phone
    
    knex('customers')
    .insert({
        firstname: first_name.toLowerCase(),
        lastname: last_name.toLowerCase(),
        username: username,
        password: password,
        dob: dob,
        zip: zip,
        city: city.toLowerCase(),
        state: state.toLowerCase(),
        email: email,
        phone: phone
    })

    .then(() => {
        res.redirect('/'); // Redirect to the character list page after adding
    })

    .catch(error => {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Username already taken.' });
        } else {
            console.error('Error Creating Account:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});

app.get('/editAccount', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    let id = req.session.userid;

    knex('customers')
      .where('custid', id)
      .first()

      .then(customer => {
        if (!customer) {
          return res.status(404).send('Account not found');
        }

        res.render('editAccount', {customer})
      })

      .catch(error => {
        console.error('Error fetching Character for editing:', error);
        res.status(500).send('Internal Server Error');
      });
});

app.post("/editAccount", (req, res) =>
    {
        const id = req.session.userid
        const first_name = req.body.firstname
        const last_name = req.body.lastname
        const username = req.body.username
        const password = req.body.password
        const dob = req.body.dob
        const email = req.body.email
        const city = (req.body.city ? req.body.city : null)
        const state = (req.body.state ? req.body.state.toLowerCase() : null)
        const zip = (req.body.zip ? req.body.zip.toLowerCase() : null)
        const phone = (req.body.phone ? req.body.phone : null)
        
        knex('customers')
        .where('custid', id)
        .update({
            firstname: first_name.toLowerCase(),
            lastname: last_name.toLowerCase(),
            username: username,
            password: password,
            dob: dob,
            zip: zip,
            city: city,
            state: state,
            email: email,
            phone: phone
        })
    
        .then(() => {
            res.redirect('/home');
        })
    
        .catch(error => {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Username already taken.' });
            }
            else {
            console.error('Error Editing Account:', error);
            res.status(500).send('Internal Server Error');
            }
        });
});


app.listen(port, () => console.log(`Express App has started and server is listening on http://localhost:${port}`));