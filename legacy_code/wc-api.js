const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const db = require('./watercoolerQuery')


const app = express()

const port = 9000

app.use(cors())

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.get('/users', db.getUsers)
//app.get('/users/:id', db.getUserQuestions)
app.post('/users/add', db.createUser)
//app.post('/users/set/:id', db.setUserResponses)
//app.put('/users/:id', db.updateTea)
//app.delete('/users/:id', db.deleteTea)
//app.put('/teas/heart/:id/:likes', db.incrementLikes)

app.listen(port, () => console.log(`MyTeaDB listening on port ${port}!`))