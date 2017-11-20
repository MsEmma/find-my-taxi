const MongoClient = require('mongodb').MongoClient;

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/find-my-taxi'
const db = MongoClient.connect(mongoUrl)

// mapping "type names" to mongodb collection names
const _collections = {
  Stops: 'stops'
}

const collections = (async () => Object.entries(_collections)
  .reduce(async (accumP, [prop, coll]) => {
    const accum = await accumP
    accum[prop] = (await db).collection(coll)
    return accum
  }, Promise.resolve({})))()


exports.collections = collections