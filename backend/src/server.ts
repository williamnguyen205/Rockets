import { createServer } from "node:http"

const port = Number(process.env.PORT ?? 4000)
const host = process.env.HOST ?? "127.0.0.1"

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ status: "ok", service: "clarity-backend" }))
    return
  }

  response.writeHead(404, { "Content-Type": "application/json" })
  response.end(JSON.stringify({ error: "Not found" }))
})

server.listen(port, host, () => {
  console.log(`Clarity backend listening on http://${host}:${port}`)
})
