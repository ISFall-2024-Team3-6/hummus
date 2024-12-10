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
        host : process.env.RDS_HOSTNAME || "localhost",
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
        res.render("index");
    }
    catch (err)
    {
        console.log(err);
        res.status(500).send("An error occurred");
    }
});

app.get("/createAccount", (req, res) => 
{
    res.render("createAccount")
});

app.post("/createAccount", (req, res) =>
{
    const first_name = req.body.first_name
    const last_name = req.body.last_name
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
        first_name: first_name.toLowerCase(),
        last_name: last_name.toLowerCase(),
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
        console.error('Error Creating Account:', error);
        res.status(500).send('Internal Server Error');
    });
});

  app.get('/editAccount/:id', (req, res) => {
    let id = req.params.id;

    knex('customers')
      .where('id', id)
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
        const id = req.body.id
        const first_name = req.body.first_name
        const last_name = req.body.last_name
        const username = req.body.username
        const password = req.body.password
        const dob = req.body.dob
        const email = req.body.email
        const city = req.body.city
        const state = req.body.state
        const zip = req.body.zip
        const phone = req.body.phone
        
        knex('customers')
        .where('id', id)
        .update({
            first_name: first_name.toLowerCase(),
            last_name: last_name.toLowerCase(),
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
            res.redirect('/');
        })
    
        .catch(error => {
            console.error('Error Editing Account:', error);
            res.status(500).send('Internal Server Error');
        });
    });


app.listen(port, () => console.log(`Express App has started and server is listening on http://localhost:${port}`));