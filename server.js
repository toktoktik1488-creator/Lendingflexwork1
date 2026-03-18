const express = require("express")
const fs = require("fs")
const path = require("path")

function loadLocalEnv() {
  const envFile = path.join(__dirname, ".env")

  if (!fs.existsSync(envFile)) {
    return
  }

  const envContent = fs.readFileSync(envFile, "utf8")

  envContent.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return
    }

    const separatorIndex = trimmedLine.indexOf("=")

    if (separatorIndex === -1) {
      return
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim()

    if (key && !process.env[key]) {
      process.env[key] = value
    }
  })
}

loadLocalEnv()

const app = express()

app.use(express.json())
app.use(express.static("public"))

const BOT_TOKEN = process.env.BOT_TOKEN
const CHAT_ID = process.env.CHAT_ID
const officeLeadsFile = "office-leads.json"

if (!fs.existsSync(officeLeadsFile)) {
  fs.writeFileSync(officeLeadsFile, "[]")
}

app.post("/office-request", async (req, res) => {
  const data = {
    name: String(req.body.name || "").trim(),
    readyForKyiv: String(req.body.readyForKyiv || "").trim(),
    age: String(req.body.age || "").trim(),
    telegram: String(req.body.telegram || "").trim(),
    phone: String(req.body.phone || "").trim(),
    salesExperience: String(req.body.salesExperience || "").trim()
  }

  if (!data.name || !data.readyForKyiv || !data.age || !data.telegram || !data.phone || !data.salesExperience) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be filled"
    })
  }

  let savedToFile = false

  try {
    const leads = JSON.parse(fs.readFileSync(officeLeadsFile))

    leads.push({
      id: Date.now(),
      date: new Date().toISOString(),
      ...data
    })

    fs.writeFileSync(officeLeadsFile, JSON.stringify(leads, null, 2))
    savedToFile = true
  } catch (error) {
    console.log("OFFICE SAVE ERROR:", error)
  }

  if (BOT_TOKEN && CHAT_ID) {
    const message =
`Нова анкета на офіс

Ім'я: ${data.name}
Готовність працювати у Києві: ${data.readyForKyiv}
Вік: ${data.age}
Telegram: ${data.telegram}
Номер телефону: ${data.phone}
Досвід у продажах: ${data.salesExperience}`

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      })

      const result = await response.json()

      console.log("OFFICE TELEGRAM RESPONSE:", result)

      if (!result.ok) {
        return res.status(502).json({
          success: false,
          message: "Telegram delivery failed"
        })
      }
    } catch (error) {
      console.log("OFFICE TELEGRAM ERROR:", error)

      return res.status(502).json({
        success: false,
        message: "Telegram delivery failed"
      })
    }
  }

  if (!savedToFile && (!BOT_TOKEN || !CHAT_ID)) {
    return res.status(500).json({
      success: false,
      message: "Lead was not saved"
    })
  }

  res.json({
    success: true,
    savedToFile
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Landing running on port", PORT)
})
