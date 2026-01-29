require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;
const DB_NAME = "shop";

let db;
let itemsCollection;

MongoClient.connect(MONGO_URL)
    .then(client => {
        db = client.db(DB_NAME);
        itemsCollection = db.collection("items");
        console.log("Connected to MongoDB");
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
    });

app.get("/", (req, res) => {
    res.json({
        message: "API is running",
        endpoints: [
            "GET /api/items",
            "GET /api/items/:id",
            "POST /api/items",
            "PUT /api/items/:id",
            "PATCH /api/items/:id",
            "DELETE /api/items/:id"
        ]
    });
});

app.get("/api/items", async (req, res) => {
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

    const items = await itemsCollection
        .find(filter, { projection })
        .sort(sortOption)
        .toArray();

    res.json({
        count: items.length,
        items
    });
});

app.get("/api/items/:id", async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    const item = await itemsCollection.findOne({ _id: new ObjectId(id) });

    if (!item) {
        return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
});

app.post("/api/items", async (req, res) => {
    const { name, price, category } = req.body;

    if (!name || price === undefined || !category) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const newItem = {
        name,
        price,
        category
    };

    const result = await itemsCollection.insertOne(newItem);

    res.status(201).json({
        message: "Item created",
        id: result.insertedId
    });
});

app.put("/api/items/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, category } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    if (!name || price === undefined || !category) {
    return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await itemsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name, price, category } }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated" });
});

app.patch("/api/items/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
    }

    const result = await itemsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated (partial)" });
});

app.delete("/api/items/:id", async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    const result = await itemsCollection.deleteOne({
        _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Item not found" });
    }

    res.status(204).send();
});

app.get("/version", (req, res) => {
    res.json({
        version: "1.1",
        updatedAt: "2026-01-18"
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
