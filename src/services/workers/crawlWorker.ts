import { expose } from "threads/worker"
import { doCrawl } from "../handleCrawl"

expose(doCrawl)
