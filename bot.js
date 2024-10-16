const TelegramBot = require("node-telegram-bot-api")
require("dotenv").config()
const { GoogleGenerativeAI } = require("@google/generative-ai")
const bot = new TelegramBot(process.env.TOKEN, { polling: true })
const quote_apiurl = "https://zenquotes.io/api/random"
const fact_apiurl = "https://uselessfacts.jsph.pl/api/v2/facts/random"
const meme_url = "https://meme-api.com/gimme"

// Functions to fetch API data
async function getFact() {
    try {
        const response = await fetch(fact_apiurl)
        const data = await response.json()
        return data.text
    } catch (error) {
        console.error("Error fetching fact:", error)
        return "An error occurred while fetching the fact."
    }
}

async function getQuote() {
    try {
        const response = await fetch(quote_apiurl)
        const data = await response.json()
        return data[0].q
    } catch (error) {
        console.error("Error fetching quote:", error)
        return "An error occurred while fetching the quote."
    }
}

async function memeTitle() {
    try {
        const response = await fetch(meme_url)
        const data = await response.json()
        return data.title
    } catch (error) {
        console.error("Error fetching meme title:", error)
        return "An error occurred while fetching the meme title."
    }
}

async function memeImg() {
    try {
        const response = await fetch(meme_url)
        const data = await response.json()
        return data.url
    } catch (error) {
        console.error("Error fetching meme image:", error)
        return "An error occurred while fetching the meme image."
    }
}
// function to fetch image generator 
async function query(data) {
    const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
            headers: {
                Authorization: `Bearer ${process.env.hugging_api}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        }
    )
    const result = await response.blob()
    return result
}

async function getWeather(city) {
    try {
        const response = await fetch(
            `${weather_apiurl}?q=${city}&appid=${weather_api_key}&units=metric`
        )
        const data = await response.json()
        if (data.cod !== 200) throw new Error(data.message)
        return `Weather in ${data.name}: ${data.weather[0].description}, Temperature: ${data.main.temp}°C`
    } catch (error) {
        console.error("Error fetching weather:", error)
        return "An error occurred while fetching the weather."
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;

    const greeting = `Hello ${userName}! 👋\n\nWelcome to the bot. Here are some commands you can use:\n\n` +
        `/chat [prompt] - Generate AI content\n` +
        `/imagine [prompt] - Generate an AI image\n` +
        `$quote - Get a random quote\n` +
        `$fact - Get a random fact\n` +
        `$meme - Get a random meme\n\n` +
        `Feel free to try them out!`;

    bot.sendMessage(chatId, greeting);
});

// Command to generate AI image
bot.onText(/\/imagine (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    const prompt = match[1]

    if (!prompt) {
        return bot.sendMessage(
            chatId,
            "Please provide a prompt after the /imagine command."
        )
    }

    try {
    	bot.sendMessage(chatId,"Working my brain!")
        const final = await query({ inputs: prompt })
        const arraybuffer = await final.arrayBuffer()
        const imggen = Buffer.from(arraybuffer)
        console.log(imggen)

        bot.sendPhoto(chatId, imggen)
    } catch (error) {
        console.error("Error generating AI content:", error)
        bot.sendMessage(chatId, "An error occurred while generating content.")
    }
})

// Command to generate AI content
bot.onText(/\/chat (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    const prompt = match[1]

    if (!prompt) {
        return bot.sendMessage(
            chatId,
            "Please provide a prompt after the /chat command."
        )
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.api_key)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        const result = await model.generateContent(prompt)
        bot.sendMessage(chatId, result.response.text())
    } catch (error) {
        console.error("Error generating AI content:", error)
        bot.sendMessage(chatId, "An error occurred while generating content.")
    }
})
const weather_apiurl = "https://api.openweathermap.org/data/2.5/weather"
const weather_api_key = process.env.WEATHER_API_KEY



bot.onText(/\/weather (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    const city = match[1]

    if (!city) {
        return bot.sendMessage(
            chatId,
            "Please provide a city name after the /weather command."
        )
    }

    try {
        const weatherReport = await getWeather(city)
        bot.sendMessage(chatId, weatherReport)
    } catch (error) {
        bot.sendMessage(chatId, "An error occurred while fetching weather information.")
    }
})


// Handling other messages
bot.on("message", async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text.toLowerCase()

    if (text === "$quote") {
        const quote = await getQuote()
        bot.sendMessage(chatId, quote)
    }

    if (text === "$fact") {
        const fact = await getFact()
        bot.sendMessage(chatId, fact)
    }

    if (text === "$meme") {
        const meme = await memeImg()
        const memeTitleText = await memeTitle()
        bot.sendMessage(chatId, memeTitleText)
        bot.sendPhoto(chatId, meme)
    }
})
