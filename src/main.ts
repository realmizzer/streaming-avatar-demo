import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from "@heygen/streaming-avatar";

const AVATAR_NAME = 'Santa_Fireplace_Front_public';
const KNOWLEDGE_ID = '8077218ed0724a82991899b47fe66ddd'; // the avatar will speak about videogames and anime, also it likes hatsune miku
const LANGUAGE = 'ru';

// DOM elements
const videoElement = document.getElementById("avatarVideo") as HTMLVideoElement;
const startButton = document.getElementById(
  "startSession"
) as HTMLButtonElement;
const endButton = document.getElementById("endSession") as HTMLButtonElement;
const speakButton = document.getElementById("speakButton") as HTMLButtonElement;
const userInput = document.getElementById("userInput") as HTMLInputElement;

const textModeBtn = document.getElementById("textModeBtn") as HTMLButtonElement;
const voiceModeBtn = document.getElementById("voiceModeBtn") as HTMLButtonElement;
const voiceModeControls = document.getElementById("voiceModeControls") as HTMLElement;
const voiceStatus = document.getElementById("voiceStatus") as HTMLElement;

let currentMode: "text" | "voice" = "text";

let avatar: StreamingAvatar | null = null;
let sessionData: any = null;

// Helper function to fetch access token
async function fetchAccessToken(): Promise<string> {
  const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
  const response = await fetch(
    "https://api.heygen.com/v1/streaming.create_token",
    {
      method: "POST",
      headers: { "x-api-key": apiKey },
    }
  );

  const { data } = await response.json();
  return data.token;
}

async function initializeAvatarSession() {
  const token = await fetchAccessToken();
  avatar = new StreamingAvatar({ token });

  sessionData = await avatar.createStartAvatar({
    quality: AvatarQuality.High,
    avatarName: AVATAR_NAME,
    disableIdleTimeout: true,
    language: LANGUAGE,
    knowledgeId: KNOWLEDGE_ID,
  });

  console.log("Session data:", sessionData);

  // Enable end button and disable start button
  endButton.disabled = false;
  startButton.disabled = true;

  // Add voice chat event listeners
  avatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
  avatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
  avatar.on(StreamingEvents.USER_START, () => {
    voiceStatus.textContent = "Listening...";
  });
  avatar.on(StreamingEvents.USER_STOP, () => {
    voiceStatus.textContent = "Processing...";
  });
  avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
    voiceStatus.textContent = "Avatar is speaking...";
  });
  avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
    voiceStatus.textContent = "Waiting for you to speak...";
  });
}

// Handle when avatar stream is ready
function handleStreamReady(event: any) {
  if (event.detail && videoElement) {
    videoElement.srcObject = event.detail;
    videoElement.onloadedmetadata = () => {
      videoElement.play().catch(console.error);
    };

    textModeBtn.disabled = false;
    voiceModeBtn.disabled = false;
  }
}

// Handle stream disconnection
function handleStreamDisconnected() {
  console.log("Stream disconnected");
  if (videoElement) {
    videoElement.srcObject = null;
  }

  // Enable start button and disable end button
  startButton.disabled = false;
  endButton.disabled = true;

  textModeBtn.disabled = true;
  voiceModeBtn.disabled = true;
}

// End the avatar session
async function terminateAvatarSession() {
  if (!avatar || !sessionData) return;

  await avatar.stopAvatar();
  videoElement.srcObject = null;
  avatar = null;
}

// Handle speaking event
async function handleSpeak() {
  if (avatar && userInput.value) {
    await avatar.speak({
      text: userInput.value,
    });
    userInput.value = ""; // Clear input after speaking
  }
}

async function startVoiceChat() {
  if (!avatar) return;

  try {
    await avatar.startVoiceChat({
      useSilencePrompt: false
    });
    voiceStatus.textContent = "Waiting for you to speak...";
  } catch (error) {
    console.error("Error starting voice chat:", error);
    voiceStatus.textContent = "Error starting voice chat";
  }
}

async function switchMode(mode: "text" | "voice") {
  if (currentMode === mode) return;

  currentMode = mode;

  if (mode === "text") {
    textModeBtn.classList.add("active");
    voiceModeBtn.classList.remove("active");
    voiceModeControls.style.display = "none";
    if (avatar) {
      await avatar.closeVoiceChat();
    }
  } else {
    textModeBtn.classList.remove("active");
    voiceModeBtn.classList.add("active");
    voiceModeControls.style.display = "block";
    if (avatar) {
      await startVoiceChat();
    }
  }
}

// Event listeners for buttons
startButton.addEventListener("click", initializeAvatarSession);
endButton.addEventListener("click", terminateAvatarSession);
speakButton.addEventListener("click", handleSpeak);

textModeBtn.addEventListener("click", () => switchMode("text"));
voiceModeBtn.addEventListener("click", () => switchMode("voice"));
