const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


//middleware 
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
            return res.status(403).send({message: 'Forbidden access'});
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })
    
    
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njbpe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){
    try{
        await client.connect();

        //collection
        const productCollection = client.db('mfct').collection('product');
        const orderCollection = client.db('mfct').collection('order');
        const userCollection = client.db('mfct').collection('users');
        const paymentCollection = client.db('mfct').collection('payments');
        const reviewCollection = client.db('mfct').collection('reviews');


        //get all product
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

        //product post
        app.post('/product', async(req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        });

        //all reviews api
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        //Review post api
        app.post('/review', async(req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send(result);
        });

        app.post('/create-payment-intent', verifyJWT, async(req,res) => {
            const product = req.body;
            const price = product.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
        });

        //get user
        app.get('/user', verifyJWT, async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        });

        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        })

        //admin api
        app.put('/user/:admin/:email', verifyJWT, async(req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAcc = await userCollection.findOne({ email: requester });
            if(requesterAcc.role === 'admin'){
                const filter = {email: email};
            const updateDoc = {
                $set: {role: 'admin'},
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
            }else{
                res.status(403).send({message: 'forbidden'});
            }
            
        });

        //users api
        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = { upsert: true};
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
            res.send({result, token});
        });


        //order post api
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        });

        app.patch('/order/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc)

        });

        // order get api

        app.get('/order', verifyJWT,  async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email === decodedEmail){
                const query = {email: email};
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                return res.send(orders);
            }else{
                return res.status(403).send({message: 'forbidden access'});
            }
           
        });

        app.get('/order/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.findOne(query);
            res.send(result)
        });

       

        //delete api
        app.delete('/order/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result);

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