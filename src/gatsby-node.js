const admin = require("firebase-admin")
const crypto = require("crypto")

exports.sourceNodes = async (
  { boundActionCreators },
  { credential, databaseURL, types, quiet = false },
  done
) => {
  const { createNode } = boundActionCreators

  admin.initializeApp({
    credential: admin.credential.cert(credential),
    databaseURL: databaseURL
  })

  const db = admin.firestore()

  const start = Date.now()
  for (let t of types){
    const { query = async ref => ref, map = node => node, collection } = t
    
    try {
      const querySnapshot = await query(db.collection(collection)).get()
      if(!querySnapshot.empty) {
        console.log(
            `\n[Firestore Source] Data for ${collection} loaded in`,
            Date.now() - start,
            "ms"
        )
        const docs = querySnapshot.docs()
        for (let doc of docs) {
          const val = { id:doc.id, ...doc.data() }
          const node = map(Object.assign({}, val))
          const contentDigest = crypto
            .createHash(`md5`)
            .update(JSON.stringify(node))
            .digest(`hex`)
            
            createNode(
                Object.assign(node, {
                  id: val.id,
                  parent: "root",
                  children: [],
                  internal: {
                    type: `Firestore${collection}`,
                    contentDigest
                  }
                })
              )
        }

        done()
      }
    }
    catch(error) {
      console.log(error)
      process.exit(1)
    }
  }
}
