const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.json());

const MONGO_URL = "mongodb://127.0.0.1:27017"; 
const DB_NAME = "shop";

let db;
let productsCollection;

MongoClient.connect(MONGO_URL)
    .then(client => {
        db = client.db(DB_NAME);
        productsCollection = db.collection("products");
        console.log("Connected to MongoDB");
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
    });

app.get("/", (req, res) => {
    res.send(`
        <h1>Practice Task 9</h1>
        <ul>
            <li><a href="/api/products">/api/products</a></li>
            <li><a href="/api/products/1">/api/products/1</a></li>
        </ul>
    `);
});

app.get("/api/products", async (req, res) => {
    const { category, minPrice, sort, fields } = req.query;

    const filter = {};
    if (category) {
        filter.category = category;
    }
    if (minPrice) {
        filter.price = { $gte: Number(minPrice) };
    }

    let projection = {};
    if (fields) {
        fields.split(",").forEach(field => {
            projection[field] = 1;
        });
    }

    let sortOption = {};
    if (sort === "price") {
        sortOption.price = 1;
    }

    const products = await productsCollection
        .find(filter, { projection })
        .sort(sortOption)
        .toArray();

    res.json({
        count: products.length,
        products
    });
});

app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid product id" });
    }

    const product = await productsCollection.findOne({ _id: new ObjectId(id) });

    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
});

app.post("/api/products", async (req, res) => {
    const { name, price, category } = req.body;

    if (!name || price === undefined || !category) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const newProduct = {
        name,
        price,
        category
    };

    const result = await productsCollection.insertOne(newProduct);

    res.status(201).json({
        message: "Product created",
        id: result.insertedId
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
