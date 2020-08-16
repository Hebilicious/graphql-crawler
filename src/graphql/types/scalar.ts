import { GraphQLJSONObject } from "graphql-type-json"
import { GraphQLDate } from "graphql-iso-date"
import { asNexusMethod } from "@nexus/schema"

export const GQLDate = asNexusMethod(GraphQLDate, "date")
export const GQLJson = asNexusMethod(GraphQLJSONObject, "json")
