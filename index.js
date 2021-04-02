const express = require("express");
const app = express();
const cors = require("cors");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
const serviceAccount = require("./.configs/grocerygrow-fa17c-firebase-adminsdk-khmnz-7092d39917.json");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q0qwx.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.DB_NAME}.firebaseio.com`,
});

require("dotenv").config();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Grocery Brother!");
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const productsCollection = client.db("grocerygrow").collection("products");
  const orderCollection = client.db("grocerygrow").collection("orders");

  app.post("/addProduct", (req, res) => {
    const newProduct = req.body;
    console.log(newProduct);
    productsCollection.insertOne(newProduct).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/products", (req, res) => {
    productsCollection.find().toArray((err, items) => {
      res.send(items);
    });
  });

  app.get("/products/:id", (req, res) => {
    productsCollection
      .find({ _id: ObjectID(req.params.id) })
      .toArray((err, documents) => {
        res.send(documents[0]);
      });
  });
  app.post("/addOrder", (req, res) => {
    const newOrder = req.body;
    orderCollection.insertOne(newOrder).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });
  app.get("/orders", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const tokenEmail = decodedToken.email;
          const queryEmail = req.query.email;
          if (tokenEmail === queryEmail) {
            orderCollection
              .find({ email: queryEmail })
              .toArray((err, documents) => {
                res.status(200).send(documents);
              });
          } else {
            res.status(401).send("Unauthorized access");
          }
        })
        .catch((error) => {
          res.status(401).send("Unauthorized access");
        });
    } else {
      res.status(401).send("Unauthorized access");
    }
  });
  app.delete("/deleteProduct/:id", (req, res) => {
    const id = ObjectID(req.params.id);
    console.log("DELETING", id);
    productsCollection.findOneAndDelete({ _id: id }).then((result) => {
      res.send(result.deletedCount > 0);
    });
  });
});
app.listen(port);
