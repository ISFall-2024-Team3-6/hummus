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

app.get("/", (req, res) =>
{
    try
    {
        res.render("index", {hummus: []});
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
        const user = await knex('') // TODO change to correct table
            .select('*')
            .where({ username }) // Find user by username
            .first(); // Returns the first matching record
  
        if (user && user.password === password) { // Replace with hashed password comparison in production
            req.session.loggedIn = true;
            req.session.username = username;
            res.render('home', { user : req.session.loggedIn });
  
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

app.get('/home', (req, res) => {
    if (req.session.loggedIn) {
        knex.select('*').from('hummus').then(data => {
            res.render('home', {hummus: data});
        });
    } else {
        res.redirect('/login');
    }
});


// ROUTE TO DISPLAY ALL FAVORTIES ON FAVORTIE PAGE
app.get




// GET ROUTE THAT WILL GRAB THE USER's FAVORITED HUMMUS WHEN THEY CLICK SAVE ON THE PAGE THAT DISPLAYS ALL THE HUMMUS
app.get('/favorites', async (req, res) => {
    // Check if the user is logged in - SECURITY
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if user is not logged in
    }

    // Retrieve the logged-in user's ID from the session
    let userId = req.session.user.id;

    // Initialize variable to hold favorite hummuses
    let favoriteHummus;
    try {
        // Fetch favorite hummuses for the logged-in user
        favoriteHummus = await knex('customerFavorites as cf')
    .innerJoin('hummus as h', 'cf.hummusid', 'h.hummusid')
    .innerJoin('brand as b', 'h.brandid', 'b.brandid') // Join the brand table
    .where('cf.custid', id)
    .select('h.hummusid', 'h.hummus_name', 'h.hummus_description', 
        'h.serving_size', 'h.retail_price', 'b.brand_name'); // Select brand_name from the brand table
    } catch (error) {
        console.error('Error fetching favorite hummuses:', error);
        return res.status(500).send('Internal Server Error'); // Return 500 status code if there's an error
    }

    // Render the 'favorites' page with the user's favorite hummuses
    res.render('favorites', { favoriteHummus }); 
});


// ROUTE TO DELETE A HUMMUS FROM FAVORITES LIST
app.post('/deleteFavorites/:id', (req, res) => {
    const id = req.params.id
    knex('rating')
    .where('hummusid', id)
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

    



app.listen(port, () => console.log(`Express App has started and server is listening on http://localhost:${port}`));