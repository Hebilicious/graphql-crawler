import { ApolloServer } from "apollo-server-fastify"
import { schema } from "./graphql/schema"
import { createContext } from "./graphql/context"
import fastify from "fastify"

const server = new ApolloServer({ schema, context: createContext })

const app = fastify({ logger: true })

const main = async () => {
    app.register(server.createHandler())
    server.installSubscriptionHandlers(app.server)
    try {
        await app.listen(4000, () => {
            app.log.info(`🚀 Playground ready at: http://localhost:4000/graphql ⭐️`)
            app.log.info(`🚀 Subscriptions ready at: ws://localhost:4000${server.subscriptionsPath} ⭐️`)
        })
    } catch (error) {
        app.log.error(error)
        process.exit(1)
    }
}

main()
