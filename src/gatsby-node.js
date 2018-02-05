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
  let promises = []
  const start = Date.now()
  for (let t of types){
    const { query = ref => ref, map = node => node, type, collection } = t
    promises.push(query(db.collection(collection)).get().then(async querySnapshot =>{
      let nodes = []
      if(!querySnapshot.empty) {
        console.log(
            `\n[Firestore Source] Data for ${collection} loaded in`,
            Date.now() - start,
            "ms"
        )
        const { docs } = querySnapshot
        const mapStart = Date.now()
        for(const doc of docs){ // may need to map over each node asychronously
          const node = await map({ id:doc.id, ...doc.data(), graphQLType:type })
          nodes.push(node)
        }
        console.log(
          `\n[Firestore Source] Mapped over nodes for ${collection} in`,
          Date.now() - mapStart,
          "ms"
        )
      }
      return nodes
    }))
   }
   // Gatsby sourceNodes function does not assume async operations.  So bundle everyting in a Promise.all()
   // and execute
   await Promise.all(promises).then(types => {
      for (const nodes of types){
        for(let node of nodes){
          const { graphQLType } = node
          delete node['graphQLType']
          const contentDigest = crypto
              .createHash(`md5`)
              .update(JSON.stringify(node))
              .digest(`hex`)
          const decoratedNode = Object.assign(node, {
                id: node.id,
                parent: "root",
                children: [],
                internal: {
                  type: `Firestore${graphQLType}`,
                  contentDigest
                }
              })
          createNode(decoratedNode)
        }
        
      }
      done()
   })

}
