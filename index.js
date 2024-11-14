let express = require("express");

let app = express();

let path = require("path");

const port = process.env.PORT || 5001;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));

const knex = require("knex") ({
    client : "pg",
    connection : {
        host : process.env.RDS_HOSTNAME || "localhost",
        user : process.env.RDS_USERNAME || "postgres",
        password : process.env.RDS_PASSWORD || "ISGoesCrazyy",
        database : process.env.RDS_DB_NAME || "assignment3a",
        port : process.env.RDS_PORT ||  5432,
        ssl : process.env.DB_SSL ? {rejectUnauthorized : false} : false
    }
})

app.get("/", (req, res) =>
{
    knex.select().from('pokemon').orderBy('description').then( pokes => {
        res.render("index", { pokemon: pokes });
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
    });
});


app.listen(port, () => console.log(`Express App has started and server is listening on http://localhost:${port}`));