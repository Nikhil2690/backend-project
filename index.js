const express = require('express')
require('dotenv').config()


const app = express()

//const port = 4000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/nikhil', (req, res)=> {
    res.send("Hello This is Nikhil's server")
})

app.get('/login', (req, res)=> {
    res.send("Great, You are now logged in")
})

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`)
})
