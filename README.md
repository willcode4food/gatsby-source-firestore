# Gatsby Firestore Source

Quick and dirty firestore source for Gatsby. Allows you to query your firestore data right into your statically generated pages with Gatsby.

Based on Ryan Florence's [gatsby-source-firebase](https://github.com/ReactTraining/gatsby-source-firebase)


## Usage

1. First you need a Private Key from firebase for privileged environments, find out how to get it here: https://firebase.google.com/docs/admin/setup (or click the settings gear > Service accounts tab > Generate New Private Key button at the bottom)

2. Place that private key .json file somewhere in your gatsby project (the root is fine).

3. Configure gatsby-config.js


```js
// the plugin options are:
{
  credential,
  databaseURL,
  types: [{
    type,
    collection,
    query,
    map
  }]
}

// Here's an example:

module.exports = {
  // the rest of your config
  plugins: [
    {
      resolve: `gatsby-source-firebase`,
      options: {
        // point to the firebase private key downloaded
        credential: require("./firebase-key.json"),

        // your firebase database root url
        databaseURL: "https://<your-database>.firebaseio.com",

        // you can have multiple "types" that point to different paths
        types: [
          {
            // this type will become `allAuthors` in graphql
            collection: "Authors",,

            // probably don't want your entire database, use the query option
            // to limit however you'd like
            query: ref => ref.limit(10)

            // This allows you to map your data to data that GraphQL likes:
            // 1. Turn your lists into actual arrays
            // 2. Fix keys that GraphQL hates. It doesn't allow number keys
            //    like "0", you'll get this error pretty often:
            //    Error: Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "0" does not
            // 3. Remove stuff you don't need.
            //
            // Feel free to mutate, we sent you a copy anyway.
            map: async node => {
              let books = []
              const db = admin.firestore()
              if(node.hasOwnProperty('books')){ // not all records in the database have a list of books
                const authorBooks = Object.keys(node.books) // grab book IDs from firsestore list see https://firebase.google.com/docs/firestore/solutions/arrays?authuser=0
                for(const key of authorBooks) {
                  const querySnapshot = await db.collection('books').doc(key).get() // query firestore 
                  if (!querySnapshot.empty) {
                    const { name, slug } = querySnapshot.data()
                    books.push({ _key: key, name, slug })
                  }
                }
                delete node['books'] // remove old books key, will replace with format better for gatsby graphql
              }
                // finally, return the node
                return {...node, books}
            },
          }
        ]
      }
    }
  ]
}
```

Enjoy!
