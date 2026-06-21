import { createApp } from './app'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
const app = createApp()

app.listen(PORT, () => {
  console.log(`R2P Platform running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`API base:     http://localhost:${PORT}/r2p/requests`)
})
