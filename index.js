const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const app = express();
const port = process.env.PORT || 5000;

//database
// user: mfct
//pass: q67T0gdQ4NJGyHRs
//middleware 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njbpe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){
    try{
        await client.connect();
        const productCollection = client.db('mfct').collection('product');
        const orderCollection = client.db('mfct').collection('order');
    
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const products = await productCollection.findOne(query);
            res.send(products);
        });

        //order post api
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        });

        // order get api

        app.get('/order', async (req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        
    }finally{

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running');
})

app.listen(port, () => {
    console.log('Listening to port', port)
})