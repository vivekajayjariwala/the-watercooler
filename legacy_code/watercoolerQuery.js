Pool = require('pg').Pool
const pool = new Pool({
          user: 'ubuntu',
          host: 'localhost',
          database: 'watercooler',
          password: '1m2n3b4v',
          port: 5432,
})
const sha256 = require('simple-sha256')
const getUsers  = (request, response) => {
          pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
                      if (error) {
                         throw error
                      }
                      response.status(200).json(results.rows)
 })
}

//const getUserQuestions = (request, response) => {
//        const id = parseInt(request.params.id)
//
//        pool.query('SELECT q1, q2, q3, q4, q5 FROM users WHERE id = $1', [id], (error, results) => {
//                    if (error) {
//                                  throw error
//                                }
//                    response.status(200).json(results.rows)
//                  })
//}

const createUser = (request, response) => {
          const { name, email, pw, r1, r2, r3, r4, r5} = request.body
          const pwHash = sha256.sync(pw.toString())

          pool.query('INSERT INTO users (name, email, pw, r1, r2, r3, r4, r5) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [name, email, pwHash,r1,r2,r3,r4,r5], (error, results) => {
                      if (error) {
                          throw error
                      }
                      response.status(201).send(`User added with ID: ${results.insertId}`)
          })
}

//const setUserResponses = (request, response) => {
//      const id = parseInt(request.params.id)
//      const { r1, r2, r3, r4, r5} = request.body
//   pool.query('INSERT INTO users (r1, r2, r3, r4, r5) VALUES ($1, $2, $3, $4, $5) WHERE id = $6', [r1, r2, r3, r4, r5, id], (error, results) => {
     // if (error) {
        //throw error
      //}
    //  response.status(201).send(`User added with ID: ${results.insertId}`)
  // })
//}

module.exports = {
          getUsers,
          createUser,
          //getUserQuestions,
          //setUserResponses
}