import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";

import { Configuration, OpenAIApi } from "openai";
import { process } from "./env";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const appSettings = {
  databaseURL: "https://tutorai-72130-default-rtdb.firebaseio.com/",
};

let selectedTopic = "none";
let instructionObj;

//making the topic bubbles work
async function topicBubbles() {
  let smallChatElements = document.querySelectorAll(".small-chat");

  for (let i = 0; i < smallChatElements.length; i++) {
    smallChatElements[i].addEventListener("click", () => {
      // console.log(smallChatElements[i].innerText)
      selectedTopic = smallChatElements[i].innerText;

      selectedTopic = selectedTopic.substring(3, selectedTopic.length);
      const container = document.getElementById("chatbot-conversation");
      container.innerHTML = "";
      console.log(`selected subject: ${selectedTopic}`);

      const newBubble = document.createElement("div");
      newBubble.classList.add("speech", "speech-ai");
      newBubble.innerHTML =
        "Great choice!👏<br> Let's dive into the world of <strong>" +
        selectedTopic +
        "</strong> and explore its key concepts and principles.";
      container.appendChild(newBubble);
      document.getElementById("topic").innerText = "Topic: " + selectedTopic;

      instructionObj = {
        role: "system",
        content: `You are InterviewGPT who helps the users to prepare for placement interviews. 
                The user wants to learn ${selectedTopic} from you. You are an expert at ${selectedTopic}. And you have to train the user on ${selectedTopic} only. If the user diverts from the ${selectedTopic}, bring him back to the topic.
                You give very brief and concise answer typically of 3-4 lines.`,
      };
    });
  }
}

topicBubbles();

const app = initializeApp(appSettings);
const database = getDatabase(app);
const conversationInDb = ref(database);
const chatbotConversation = document.getElementById("chatbot-conversation");

addEventListener("submit", (e) => {
  console.log("form submitted");
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    role: "user",
    content: userInput.value,
  });
  fetchReply();
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3,
        // max_tokens: 50
      });
      console.log(response.data.choices[0].message);

      push(conversationInDb, response.data.choices[0].message);
      // conversationArr.push()
      renderTypewriterText(response.data.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursor");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 10);
}

function renderConversationFromDb() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add(
          "speech",
          `speech-${dbObj.role === "user" ? "human" : "ai"}`
        );
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  });
}
renderConversationFromDb();

// making the startover button work
document.getElementById("clear-btn").addEventListener("click", () => {
  remove(conversationInDb);
  console.log("new button clicked!");
  chatbotConversation.innerHTML = `
    <div class="speech speech-ai">
        👋Hi I'm <strong>InterviewGPT!</strong> I'm here to help you with your interview preparation.
    </div>

    <div class="speech speech-ai">
        What do you want to learn today? <strong>Please select a subject to get started.</strong>
    </div>

    <div class="speech small-chat">
        1. Operating System
    </div>

    <div class="speech small-chat">
        2. DBMS
    </div>

    <div class="speech small-chat">
        3. Computer Networks
    </div>

    <div class="speech small-chat">
        4. OOPs
    </div>`;

  topicBubbles();
  console.log("bubbles activated!");
});
