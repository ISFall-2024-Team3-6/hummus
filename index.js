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


app.listen(port, () => console.log(`Express App has started and server is listening on http://localhost:${port}`));