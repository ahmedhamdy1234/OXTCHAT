import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json } from "@remix-run/node";
import { RemixServer, Outlet, Meta, Links, ScrollRestoration, Scripts, useFetcher } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
  }
];
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
async function action({ request }) {
  var _a, _b, _c, _d, _e, _f;
  if (request.method !== "POST") {
    return json({ message: "Method Not Allowed" }, 405);
  }
  const { message, history } = await request.json();
  if (!message) {
    return json({ message: "Message is required" }, 400);
  }
  const AI_API_KEY = process.env.AI_API_KEY;
  console.log("DEBUG: AI_API_KEY (first 5 chars from process.env):", AI_API_KEY ? AI_API_KEY.substring(0, 5) + "..." : "Not set");
  if (!AI_API_KEY) {
    console.error("AI_API_KEY is not set in environment variables.");
    return json({ message: "AI API key not configured on the server." }, 500);
  }
  const lowerCaseMessage = message.toLowerCase();
  const nameQueries = [
    "what is your name",
    "what's your name",
    "who are you",
    "your name",
    "do you have a name",
    "what do i call you",
    "cual es tu nombre",
    // Spanish
    "como te llamas",
    // Spanish
    "quel est ton nom",
    // French
    "comment t'appelles-tu",
    // French
    "wie heißt du",
    // German
    "dein name",
    // German
    "qual é o seu nome",
    // Portuguese
    "come ti chiami",
    // Italian
    "il tuo nome",
    // Italian
    "あなたの名前は",
    // Japanese
    "너의 이름은 무엇이니",
    // Korean
    "你叫什么名字",
    // Chinese (Mandarin)
    "你個名係乜",
    // Chinese (Cantonese)
    "как тебя зовут",
    // Russian
    "ما اسمك",
    // Arabic
    "اسمك اي",
    // Arabic (informal)
    "من أنت",
    // Arabic (Who are you?)
    "شو اسمك",
    // Arabic (Levantine informal)
    "ايش اسمك",
    // Arabic (Gulf informal)
    "هل لديك اسم",
    // Arabic (Do you have a name?)
    "بماذا أناديك",
    // Arabic (What should I call you?)
    "ماذا تدعى",
    // Arabic (What are you called?)
    "adın ne",
    // Turkish
    "आपका नाम क्या है"
    // Hindi
  ];
  const isAskingName = nameQueries.some((query) => lowerCaseMessage.includes(query));
  if (isAskingName) {
    return json({ response: "I am a large language model, trained by OXT. My name is OXT." });
  }
  const conversationContents = history.map((msg) => ({
    role: msg.sender === "user" ? "user" : "model",
    // Map 'ai' to 'model' role
    parts: [{ text: msg.text }]
  }));
  conversationContents.push({
    role: "user",
    parts: [{ text: message }]
  });
  const AI_FULL_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${AI_API_KEY}`;
  try {
    const response = await fetch(AI_FULL_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: conversationContents
        // Send the full conversation history
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("AI API error:", errorData);
      const errorMessage = ((_a = errorData.error) == null ? void 0 : _a.message) || "Failed to get response from AI API";
      return json({ message: errorMessage, error: errorData }, response.status);
    }
    const data = await response.json();
    const aiResponseText = ((_f = (_e = (_d = (_c = (_b = data.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "No response from AI.";
    return json({ response: aiResponseText });
  } catch (error) {
    console.error("Backend API error:", error);
    return json({ message: "Internal server error", error: error.message }, 500);
  }
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: "Module" }));
const AuthScreen = ({
  onLogin,
  onRegister,
  onGuestLogin,
  authError,
  isLoading,
  toggleDarkMode,
  isDarkMode
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegistering) {
      onRegister(username, password);
    } else {
      onLogin(username, password);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-5xl font-extrabold mb-4 text-blue-600 dark:text-blue-400", children: "Welcome to AI Chat" }),
    /* @__PURE__ */ jsxs("p", { className: "text-xl mb-8 max-w-md", children: [
      "Your intelligent assistant, ready to help you with anything. Please ",
      isRegistering ? "register" : "log in",
      " or proceed as a guest."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Username",
            value: username,
            onChange: (e) => setUsername(e.target.value),
            className: "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
            required: true
          }
        ) }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
          "input",
          {
            type: "password",
            placeholder: "Password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
            required: true
          }
        ) }),
        authError && /* @__PURE__ */ jsx("p", { className: "text-red-500 text-sm", children: authError }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            className: "w-full px-6 py-3 bg-blue-500 text-white text-lg font-semibold rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-300 ease-in-out",
            disabled: isLoading,
            children: isLoading ? "Processing..." : isRegistering ? "Register" : "Log In"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsRegistering(!isRegistering),
            className: "w-full text-blue-500 dark:text-blue-400 hover:underline text-sm",
            disabled: isLoading,
            children: isRegistering ? "Already have an account? Log In" : "Don't have an account? Register"
          }
        ),
        !isRegistering && /* @__PURE__ */ jsx("a", { href: "#", className: "w-full text-blue-500 dark:text-blue-400 hover:underline text-sm block", children: "Forgot Password? (Demo)" }),
        /* @__PURE__ */ jsx("hr", { className: "border-gray-300 dark:border-gray-700 my-4" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onGuestLogin,
            className: "w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-lg font-semibold rounded-md shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all duration-300 ease-in-out",
            disabled: isLoading,
            children: "Continue as Guest"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "absolute top-4 right-4", children: /* @__PURE__ */ jsx(
      "button",
      {
        onClick: toggleDarkMode,
        className: "p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors",
        "aria-label": "Toggle dark mode",
        children: isDarkMode ? /* @__PURE__ */ jsx(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: /* @__PURE__ */ jsx("path", { d: "M17.293 13.293A8 8 0 016.707 2.707a8.001 8 0 1010.586 10.586z" })
          }
        ) : /* @__PURE__ */ jsx(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: /* @__PURE__ */ jsx(
              "path",
              {
                fillRule: "evenodd",
                d: "M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.459 4.582A2 2 0 0115 16h1a1 1 0 110 2h-1a2 2 0 01-1.732-1.036l-.003-.002zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13-3a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-6 4a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z",
                clipRule: "evenodd"
              }
            )
          }
        )
      }
    ) })
  ] });
};
const meta = () => {
  return [
    { title: "AI Chat App" },
    { name: "description", content: "A modern AI chat application" }
  ];
};
const MessageContent = ({ text, messageId, copyToClipboard, copiedMessageId, isUserMessage }) => {
  return /* @__PURE__ */ jsx(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      components: {
        // Custom renderer for code blocks to include the copy button
        pre: ({ children }) => {
          const codeChild = React.Children.toArray(children)[0];
          const codeText = typeof codeChild === "object" && "props" in codeChild ? codeChild.props.children : "";
          const lang = typeof codeChild === "object" && "props" in codeChild && codeChild.props.className ? codeChild.props.className.replace("language-", "") : "plaintext";
          return /* @__PURE__ */ jsxs("div", { className: "relative my-2 group", children: [
            /* @__PURE__ */ jsx("pre", { className: "bg-gray-800 text-white p-3 rounded-md text-sm overflow-x-auto font-mono", children: /* @__PURE__ */ jsx("code", { className: `language-${lang}`, children: codeText }) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => copyToClipboard(String(codeText), `${messageId}-code-${lang}`),
                className: `absolute top-2 right-2 p-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-opacity ${copiedMessageId === `${messageId}-code-${lang}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`,
                title: "Copy code",
                children: copiedMessageId === `${messageId}-code-${lang}` ? /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4 text-green-400", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx(
                  "svg",
                  {
                    xmlns: "http://www.w3.org/2000/svg",
                    className: "h-4 w-4",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    children: /* @__PURE__ */ jsx(
                      "path",
                      {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        d: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      }
                    )
                  }
                )
              }
            )
          ] });
        }
        // Default rendering for other elements will be handled by ReactMarkdown
      },
      children: text
    }
  );
};
function Index() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [apiError, setApiError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode !== null) {
        return savedMode === "true";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [lastUserMessageId, setLastUserMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const fetcher = useFetcher();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const inputMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isLoading = fetcher.state === "submitting";
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("chatMessages");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      const savedLoggedIn = localStorage.getItem("isLoggedIn");
      const savedUsername = localStorage.getItem("loggedInUsername");
      if (savedLoggedIn === "true" && savedUsername) {
        setIsLoggedIn(true);
        setLoggedInUsername(savedUsername);
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } else if (typeof window !== "undefined" && messages.length === 0) {
      localStorage.removeItem("chatMessages");
    }
  }, [messages]);
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.response && fetcher.state === "idle") {
        const lastMessage = messages[messages.length - 1];
        const isDuplicateAIResponse = lastMessage && lastMessage.sender === "ai" && lastMessage.text === fetcher.data.response;
        if (lastUserMessageId === null && messages.length === 0 && !isDuplicateAIResponse) {
          return;
        }
        if (!isDuplicateAIResponse) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: Date.now().toString() + "-ai", text: fetcher.data.response, sender: "ai", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
          ]);
          setApiError(null);
          setLastUserMessageId(null);
        }
      } else if (fetcher.data.error) {
        setApiError(fetcher.data.message || "An unknown API error occurred.");
        setLastUserMessageId(null);
      }
    }
  }, [fetcher.data, fetcher.state, messages, lastUserMessageId]);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, selectedFiles]);
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);
  useEffect(() => {
    function handleClickOutside(event) {
      if (inputMenuRef.current && !inputMenuRef.current.contains(event.target)) {
        setShowInputMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inputMenuRef]);
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setInput(finalTranscript || interimTranscript);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        setApiError(`Speech recognition error: ${event.error}`);
      };
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  const handleSendMessage = (e) => {
    e == null ? void 0 : e.preventDefault();
    if (input.trim() === "" && selectedFiles.length === 0 || isLoading) return;
    setApiError(null);
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    let messageText = input.trim();
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map((file) => file.name).join(", ");
      messageText = messageText ? `${messageText}

(Files attached: ${fileNames})` : `(Files attached: ${fileNames})`;
    }
    if (editingMessageId) {
      setMessages(
        (prevMessages) => prevMessages.map(
          (msg) => msg.id === editingMessageId ? { ...msg, text: messageText, edited: true } : msg
        )
      );
      setEditingMessageId(null);
      setInput("");
      setSelectedFiles([]);
    } else {
      const newUserMessage = {
        id: Date.now().toString() + "-user",
        text: messageText,
        sender: "user",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      setLastUserMessageId(newUserMessage.id);
      const historyForAI = messages.map((msg) => ({
        text: msg.text,
        sender: msg.sender
      }));
      fetcher.submit(
        { message: messageText, history: historyForAI },
        // Send current message and history
        { method: "post", action: "/api/chat", encType: "application/json" }
      );
      setInput("");
      setSelectedFiles([]);
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prevMode) => !prevMode);
  }, []);
  const startNewChat = useCallback(() => {
    if (window.confirm("Are you sure you want to start a new chat? This will clear all messages.")) {
      setMessages([]);
      setApiError(null);
      setLastUserMessageId(null);
      setEditingMessageId(null);
      setInput("");
      setSelectedFiles([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("chatMessages");
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [isRecording]);
  const copyToClipboard = useCallback(async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2e3);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }, []);
  const handleDeleteMessage = useCallback((messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setInput("");
        setSelectedFiles([]);
      }
      if (speakingMessageId === messageId && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    }
  }, [editingMessageId, speakingMessageId]);
  const handleEditMessage = useCallback((messageId, text) => {
    setEditingMessageId(messageId);
    const fileAttachmentRegex = /\n\n\(Files attached: .+\)$/;
    const textWithoutFiles = text.replace(fileAttachmentRegex, "");
    setInput(textWithoutFiles);
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, []);
  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const lastUserMessage = messages.slice().reverse().find((msg) => msg.sender === "user");
  const handleAddFilesClick = () => {
    var _a;
    (_a = fileInputRef.current) == null ? void 0 : _a.click();
    setShowInputMenu(false);
  };
  const handleFileChange = (event) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };
  const handleRemoveFile = (fileName) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };
  const handleCreateImage = useCallback(() => {
    setShowInputMenu(false);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString() + "-ai-info",
        text: "Image generation is not supported in this WebContainer environment. Please try a text-based query.",
        sender: "ai",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]);
  }, []);
  const handleThinkLonger = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Think longer about: ${input.trim()}` : "Think longer about the current conversation.";
    setInput(prompt);
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);
  const handleDeepResearch = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Perform deep research on: ${input.trim()}` : "Perform deep research on the current topic.";
    setInput(prompt);
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);
  const handleStudyAndLearn = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Help me study and learn about: ${input.trim()}` : "Help me study and learn about the current topic.";
    setInput(prompt);
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);
  const handleToggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setApiError("Speech Recognition not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      recognitionRef.current.start();
      setIsRecording(true);
      setApiError(null);
    }
  }, [isRecording]);
  const handleSpeakAIResponse = useCallback((text, messageId) => {
    if (!window.speechSynthesis) {
      setApiError("Text-to-Speech not supported in this browser.");
      return;
    }
    if (speakingMessageId === messageId && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setApiError(`Text-to-Speech error: ${event.error}`);
      setSpeakingMessageId(null);
    };
    window.speechSynthesis.speak(utterance);
    setApiError(null);
  }, [speakingMessageId, isRecording]);
  const handleLogin = useCallback((usernameInput, passwordInput) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      if (usernameInput && passwordInput) {
        setIsLoggedIn(true);
        setLoggedInUsername(usernameInput);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedInUsername", usernameInput);
        setAuthError(null);
      } else {
        setAuthError("Invalid username or password.");
      }
      setIsAuthLoading(false);
    }, 500);
  }, []);
  const handleRegister = useCallback((usernameInput, passwordInput) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      if (usernameInput && passwordInput) {
        setIsLoggedIn(true);
        setLoggedInUsername(usernameInput);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedInUsername", usernameInput);
        setAuthError(null);
      } else {
        setAuthError("Username and password cannot be empty.");
      }
      setIsAuthLoading(false);
    }, 500);
  }, []);
  const handleGuestLogin = useCallback(() => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoggedInUsername("Guest");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loggedInUsername", "Guest");
      setIsAuthLoading(false);
    }, 300);
  }, []);
  const handleLogout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      setIsLoggedIn(false);
      setLoggedInUsername(null);
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("loggedInUsername");
      setMessages([]);
      localStorage.removeItem("chatMessages");
      setApiError(null);
      setLastUserMessageId(null);
      setEditingMessageId(null);
      setInput("");
      setSelectedFiles([]);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [isRecording]);
  if (!isLoggedIn) {
    return /* @__PURE__ */ jsx(
      AuthScreen,
      {
        onLogin: handleLogin,
        onRegister: handleRegister,
        onGuestLogin: handleGuestLogin,
        authError,
        isLoading: isAuthLoading,
        toggleDarkMode,
        isDarkMode
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100", children: [
    /* @__PURE__ */ jsxs("header", { className: "bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-xl font-bold", children: [
        "AI Chat ",
        loggedInUsername && `(${loggedInUsername})`
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex space-x-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: toggleDarkMode,
            className: "p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors",
            "aria-label": "Toggle dark mode",
            children: isDarkMode ? /* @__PURE__ */ jsx(
              "svg",
              {
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: /* @__PURE__ */ jsx("path", { d: "M17.293 13.293A8 8 0 016.707 2.707a8.001 8 0 1010.586 10.586z" })
              }
            ) : /* @__PURE__ */ jsx(
              "svg",
              {
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    fillRule: "evenodd",
                    d: "M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.459 4.582A2 2 0 0115 16h1a1 1 0 110 2h-1a2 2 0 01-1.732-1.036l-.003-.002zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13-3a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-6 4a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z",
                    clipRule: "evenodd"
                  }
                )
              }
            )
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: startNewChat,
            className: "p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors",
            "aria-label": "Start new chat",
            title: "New Chat",
            children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4v16m8-8H4" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleLogout,
            className: "p-2 rounded-full bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-600 transition-colors",
            "aria-label": "Log out",
            title: "Log out",
            children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }) })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar", children: [
      messages.map((msg) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`,
          children: [
            msg.sender === "ai" && /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-700 flex items-center justify-center text-white text-sm font-bold", children: "AI" }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: `max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md relative group ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    MessageContent,
                    {
                      text: msg.text,
                      messageId: msg.id,
                      copyToClipboard,
                      copiedMessageId,
                      isUserMessage: msg.sender === "user"
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "text-xs mt-1 opacity-75 flex items-center justify-between gap-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("span", { children: formatTimestamp(msg.timestamp) }),
                      msg.edited && /* @__PURE__ */ jsx("span", { className: "italic", children: "(edited)" })
                    ] }),
                    msg.sender === "ai" && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => handleSpeakAIResponse(msg.text, msg.id),
                          className: `p-1 rounded-md hover:bg-opacity-20 hover:bg-current ${speakingMessageId === msg.id ? "text-blue-500 dark:text-blue-400" : ""}`,
                          title: speakingMessageId === msg.id ? "Stop speaking" : "Speak message",
                          children: speakingMessageId === msg.id ? /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V9a1 1 0 011-1h1.586l4.707-4.707C10.923 3.647 11 4.1 11 5v14c0 .9-.077 1.353-.293 1.573L5.586 15z" }) })
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => copyToClipboard(msg.text, msg.id),
                          className: `p-1 rounded-md hover:bg-opacity-20 hover:bg-current transition-opacity ${copiedMessageId === msg.id ? "opacity-100" : ""}`,
                          title: "Copy message",
                          children: copiedMessageId === msg.id ? /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4 text-green-500", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx(
                            "svg",
                            {
                              xmlns: "http://www.w3.org/2000/svg",
                              className: "h-4 w-4",
                              fill: "none",
                              viewBox: "0 0 24 24",
                              stroke: "currentColor",
                              strokeWidth: 2,
                              children: /* @__PURE__ */ jsx(
                                "path",
                                {
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  d: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                }
                              )
                            }
                          )
                        }
                      )
                    ] }),
                    msg.sender === "user" && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
                      (lastUserMessage == null ? void 0 : lastUserMessage.id) === msg.id && !isLoading && /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => handleEditMessage(msg.id, msg.text),
                          className: "p-1 rounded-md hover:bg-opacity-20 hover:bg-current",
                          title: "Edit message",
                          children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" }) })
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => handleDeleteMessage(msg.id),
                          className: "p-1 rounded-md hover:bg-opacity-20 hover:bg-current text-red-500",
                          title: "Delete message",
                          children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) })
                        }
                      )
                    ] })
                  ] })
                ]
              }
            ),
            msg.sender === "user" && /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-800 flex items-center justify-center text-white text-sm font-bold", children: "You" })
          ]
        },
        msg.id
      )),
      isLoading && /* @__PURE__ */ jsxs("div", { className: "flex justify-start items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-700 flex items-center justify-center text-white text-sm font-bold", children: "AI" }),
        /* @__PURE__ */ jsxs("div", { className: "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-400 dark:bg-gray-500 rounded w-24 animate-pulse" }),
            /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-400 dark:bg-gray-500 rounded w-16 animate-pulse delay-100" }),
            /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-400 dark:bg-gray-500 rounded w-20 animate-pulse delay-200" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xs mt-2 opacity-75", children: /* @__PURE__ */ jsx("div", { className: "h-3 bg-gray-400 dark:bg-gray-500 rounded w-12 animate-pulse" }) })
        ] })
      ] }),
      apiError && /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs("div", { className: "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100", children: [
        "Error: ",
        apiError
      ] }) }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 p-4 shadow-md relative", children: [
      selectedFiles.length > 0 && /* @__PURE__ */ jsx("div", { className: "mb-2 p-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md text-sm", children: "Note: In this WebContainer environment, files are displayed but not actually uploaded or processed by the AI." }),
      /* @__PURE__ */ jsx("form", { onSubmit: handleSendMessage, className: "flex items-end space-x-2", children: /* @__PURE__ */ jsxs("div", { className: "relative flex-1 flex items-center border border-gray-300 dark:border-gray-600 rounded-full p-1 pr-2 bg-white dark:bg-gray-700", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowInputMenu(!showInputMenu),
            className: "p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors",
            "aria-label": "Open input options",
            children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4v16m8-8H4" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            ref: textareaRef,
            className: "flex-1 resize-none bg-transparent outline-none p-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
            placeholder: "Ask anything",
            rows: 1,
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyDown: handleKeyDown,
            disabled: isLoading
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleToggleRecording,
              className: `p-2 rounded-full ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"} transition-colors`,
              "aria-label": isRecording ? "Stop recording" : "Start voice input",
              title: isRecording ? "Stop recording" : "Start voice input",
              disabled: isLoading,
              children: isRecording ? /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" }) })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              className: "p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors",
              "aria-label": editingMessageId ? "Save message" : "Send message",
              title: editingMessageId ? "Save message" : "Send message",
              disabled: isLoading || input.trim() === "" && selectedFiles.length === 0,
              children: editingMessageId ? /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }) : /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M14 5l7 7m0 0l-7 7m7-7H3" }) })
            }
          )
        ] })
      ] }) }),
      selectedFiles.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: selectedFiles.map((file) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-800 dark:text-gray-200",
          children: [
            /* @__PURE__ */ jsx("span", { children: file.name }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleRemoveFile(file.name),
                className: "ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                "aria-label": `Remove file ${file.name}`,
                children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) })
              }
            )
          ]
        },
        file.name
      )) }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "file",
          ref: fileInputRef,
          multiple: true,
          className: "hidden",
          onChange: handleFileChange,
          "aria-label": "Upload files"
        }
      ),
      showInputMenu && /* @__PURE__ */ jsxs(
        "div",
        {
          ref: inputMenuRef,
          className: "absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-10 border border-gray-200 dark:border-gray-700",
          children: [
            /* @__PURE__ */ jsx(
              MenuItem,
              {
                icon: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }),
                text: "Add photos & files",
                onClick: handleAddFilesClick
              }
            ),
            /* @__PURE__ */ jsx(
              MenuItem,
              {
                icon: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) }),
                text: "Create image",
                onClick: handleCreateImage
              }
            ),
            /* @__PURE__ */ jsx(
              MenuItem,
              {
                icon: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l-7 7-7-7m7 7v10a1 1 0 01-1 1h-3" }) }),
                text: "Think longer",
                onClick: handleThinkLonger
              }
            ),
            /* @__PURE__ */ jsx(
              MenuItem,
              {
                icon: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }),
                text: "Deep research",
                onClick: handleDeepResearch
              }
            ),
            /* @__PURE__ */ jsx(
              MenuItem,
              {
                icon: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 6.253v13m0-13C10.832 5.477 9.206 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.794 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.794 5 16.5 5c1.706 0 3.332.477 4.5 1.253v13C19.832 18.477 18.206 18 16.5 18s-3.332.477-4.5 1.253" }) }),
                text: "Study and learn",
                onClick: handleStudyAndLearn
              }
            )
          ]
        }
      )
    ] })
  ] });
}
const MenuItem = ({ icon, text, showArrow = false, onClick }) => /* @__PURE__ */ jsxs(
  "button",
  {
    className: "flex items-center w-full px-4 py-2 text-left text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
    onClick,
    children: [
      /* @__PURE__ */ jsx("span", { className: "mr-3", children: icon }),
      /* @__PURE__ */ jsx("span", { className: "flex-1", children: text }),
      showArrow && /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4 ml-2 text-gray-500 dark:text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 5l7 7-7 7" }) })
    ]
  }
);
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BHsM5iXw.js", "imports": ["/assets/components-b7O4QMKD.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-B3FPYrtR.js", "imports": ["/assets/components-b7O4QMKD.js"], "css": ["/assets/root-3rbqfrLF.css"] }, "routes/api.chat": { "id": "routes/api.chat", "parentId": "root", "path": "api/chat", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.chat-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-BYYM8mGa.js", "imports": ["/assets/components-b7O4QMKD.js"], "css": [] } }, "url": "/assets/manifest-22fc6bfe.js", "version": "22fc6bfe" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.chat": {
    id: "routes/api.chat",
    parentId: "root",
    path: "api/chat",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route2
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
