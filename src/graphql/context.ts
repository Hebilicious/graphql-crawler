import { PubSub } from "apollo-server-fastify"
import { db } from "../../database"
import { dispatch } from "../services/handleCrawl"

const pubsub = new PubSub()

export interface Context {
    pubsub: PubSub
    db: typeof db
    dispatch: typeof dispatch
}

export const createContext = (): Context => ({ pubsub, db, dispatch })
