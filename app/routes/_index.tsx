import type { MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AuthScreen from "~/components/AuthScreen"; // Import the new AuthScreen component

export const meta: MetaFunction = () => {
  return [
    { title: "AI Chat App" },
    { name: "description", content: "A modern AI chat application" },
  ];
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
  edited?: boolean; // Add edited flag
};

// Helper component to render message content, including code blocks
const MessageContent: React.FC<{
  text: string;
  messageId: string;
  copyToClipboard: (text: string, id: string) => void;
  copiedMessageId: string | null;
  isUserMessage: boolean;
}> = ({ text, messageId, copyToClipboard, copiedMessageId, isUserMessage }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom renderer for code blocks to include the copy button
        pre: ({ children }) => {
          const codeChild = React.Children.toArray(children)[0];
          const codeText = typeof codeChild === 'object' && 'props' in codeChild ? codeChild.props.children : '';
          const lang = typeof codeChild === 'object' && 'props' in codeChild && codeChild.props.className ? codeChild.props.className.replace('language-', '') : 'plaintext';

          return (
            <div className="relative my-2 group">
              <pre className="bg-gray-800 text-white p-3 rounded-md text-sm overflow-x-auto font-mono">
                <code className={`language-${lang}`}>{codeText}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(String(codeText), `${messageId}-code-${lang}`)}
                className={`absolute top-2 right-2 p-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-opacity ${
                  copiedMessageId === `${messageId}-code-${lang}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Copy code"
              >
                {copiedMessageId === `${messageId}-code-${lang}` ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                )}
              </button>
            </div>
          );
        },
        // Default rendering for other elements will be handled by ReactMarkdown
      }}
    >
      {text}
    </ReactMarkdown>
  );
};


export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Initialize dark mode from localStorage or default to system preference
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode !== null) {
        return savedMode === "true";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastUserMessageId, setLastUserMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // New state for editing
  const [showInputMenu, setShowInputMenu] = useState(false); // State for the new input menu
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // New state for selected files
  const [isRecording, setIsRecording] = useState(false); // State for speech-to-text recording
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null); // State for text-to-speech

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);


  const fetcher = useFetcher();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputMenuRef = useRef<HTMLDivElement>(null); // Ref for the input menu
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Ref for SpeechRecognition instance

  const isLoading = fetcher.state === "submitting";

  // Effect to load messages and auth state from localStorage on initial render
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

  // Effect to save messages to localStorage whenever messages state changes
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } else if (typeof window !== "undefined" && messages.length === 0) {
      // If messages array is empty, clear localStorage as well
      localStorage.removeItem("chatMessages");
    }
  }, [messages]);

  // Effect to handle AI responses and API errors
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.response && fetcher.state === "idle") {
        const lastMessage = messages[messages.length - 1];
        const isDuplicateAIResponse = lastMessage && lastMessage.sender === "ai" && lastMessage.text === fetcher.data.response;

        // Only add AI response if it's not a duplicate and there was a user message that triggered it
        // or if it's the very first message and not a duplicate.
        if (lastUserMessageId === null && messages.length === 0 && !isDuplicateAIResponse) {
          return;
        }

        if (!isDuplicateAIResponse) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: Date.now().toString() + "-ai", text: fetcher.data.response, sender: "ai", timestamp: new Date().toISOString() },
          ]);
          setApiError(null);
          setLastUserMessageId(null); // Reset after AI responds
        }
      } else if (fetcher.data.error) {
        setApiError(fetcher.data.message || "An unknown API error occurred.");
        setLastUserMessageId(null); // Reset after API error
      }
    }
  }, [fetcher.data, fetcher.state, messages, lastUserMessageId]);

  // Effect for scrolling to the bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Effect for auto-resizing the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, selectedFiles]); // Re-evaluate height when files are added/removed

  // Effect for dark mode persistence and applying class to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  // Effect to close input menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputMenuRef.current && !inputMenuRef.current.contains(event.target as Node)) {
        setShowInputMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inputMenuRef]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Listen for a single utterance
      recognition.interimResults = true; // Get interim results
      recognition.lang = 'en-US'; // Set language

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setInput(finalTranscript || interimTranscript); // Update input with final or interim
      };

      recognition.onend = () => {
        setIsRecording(false);
        // Optionally send message automatically after speech ends
        // if (input.trim() !== "") {
        //   handleSendMessage();
        // }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setApiError(`Speech recognition error: ${event.error}`);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
      // Optionally disable the microphone button or show a message
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Stop any ongoing speech synthesis when component unmounts
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() === "" && selectedFiles.length === 0 || isLoading) return; // Allow sending only files

    setApiError(null);
    // Stop any ongoing speech synthesis when user sends a message
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    let messageText = input.trim();
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map(file => file.name).join(", ");
      messageText = messageText ? `${messageText}\n\n(Files attached: ${fileNames})` : `(Files attached: ${fileNames})`;
    }

    if (editingMessageId) {
      // Save edited message
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === editingMessageId ? { ...msg, text: messageText, edited: true } : msg
        )
      );
      setEditingMessageId(null);
      setInput("");
      setSelectedFiles([]); // Clear files after editing
    } else {
      // Send new message
      const newUserMessage: Message = {
        id: Date.now().toString() + "-user",
        text: messageText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      setLastUserMessageId(newUserMessage.id);

      // Prepare history for AI memory
      const historyForAI = messages.map(msg => ({
        text: msg.text,
        sender: msg.sender
      }));

      fetcher.submit(
        { message: messageText, history: historyForAI }, // Send current message and history
        { method: "post", action: "/api/chat", encType: "application/json" }
      );
      setInput("");
      setSelectedFiles([]); // Clear files after sending
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      setLastUserMessageId(null); // Ensure this is reset
      setEditingMessageId(null); // Clear editing state
      setInput(""); // Clear input field
      setSelectedFiles([]); // Clear selected files
      if (typeof window !== "undefined") {
        localStorage.removeItem("chatMessages"); // Clear from local storage
      }
      // Stop any ongoing speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      // Stop any ongoing speech recognition
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
      // If the deleted message was being edited, clear the editing state
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setInput("");
        setSelectedFiles([]); // Clear files if the edited message is deleted
      }
      // If the deleted message was being spoken, stop speech
      if (speakingMessageId === messageId && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    }
  }, [editingMessageId, speakingMessageId]);

  const handleEditMessage = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    // When editing, we should remove the file attachment text from the input field
    const fileAttachmentRegex = /\n\n\(Files attached: .+\)$/;
    const textWithoutFiles = text.replace(fileAttachmentRegex, '');
    setInput(textWithoutFiles);
    setSelectedFiles([]); // Clear any previously selected files when editing
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    // Stop any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, []);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const lastUserMessage = messages.slice().reverse().find(msg => msg.sender === "user");

  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
    setShowInputMenu(false); // Close menu after clicking
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  // New handlers for menu items
  const handleCreateImage = useCallback(() => {
    setShowInputMenu(false);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString() + "-ai-info",
        text: "Image generation is not supported in this WebContainer environment. Please try a text-based query.",
        sender: "ai",
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleThinkLonger = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Think longer about: ${input.trim()}` : "Think longer about the current conversation.";
    setInput(prompt);
    // Automatically send the message
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);

  const handleDeepResearch = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Perform deep research on: ${input.trim()}` : "Perform deep research on the current topic.";
    setInput(prompt);
    // Automatically send the message
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);

  const handleStudyAndLearn = useCallback(() => {
    setShowInputMenu(false);
    const prompt = input.trim() ? `Help me study and learn about: ${input.trim()}` : "Help me study and learn about the current topic.";
    setInput(prompt);
    // Automatically send the message
    setTimeout(() => handleSendMessage(), 0);
  }, [input, handleSendMessage]);

  // Toggle Speech-to-Text recording
  const handleToggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setApiError("Speech Recognition not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      // Stop any ongoing speech synthesis before starting recognition
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      recognitionRef.current.start();
      setIsRecording(true);
      setApiError(null); // Clear any previous speech recognition error
    }
  }, [isRecording]);

  // Text-to-Speech for AI responses
  const handleSpeakAIResponse = useCallback((text: string, messageId: string) => {
    if (!window.speechSynthesis) {
      setApiError("Text-to-Speech not supported in this browser.");
      return;
    }

    // If this message is already speaking, stop it
    if (speakingMessageId === messageId && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Stop any currently speaking message
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Stop any ongoing speech recognition
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Set language
    // You can choose a specific voice if available:
    // const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices.find(voice => voice.name === 'Google US English');

    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setApiError(`Text-to-Speech error: ${event.error}`);
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
    setApiError(null); // Clear any previous TTS error
  }, [speakingMessageId, isRecording]);

  // Mock Authentication Handlers
  const handleLogin = useCallback((usernameInput: string, passwordInput: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      // Mock check: any non-empty username/password is "valid" for demo
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

  const handleRegister = useCallback((usernameInput: string, passwordInput: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      // Mock registration: just "register" them and log them in
      if (usernameInput && passwordInput) {
        setIsLoggedIn(true);
        setLoggedInUsername(usernameInput);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loggedInUsername", usernameInput);
        // In a real app, you'd store credentials securely
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
      setMessages([]); // Clear chat on logout
      localStorage.removeItem("chatMessages");
      setApiError(null);
      setLastUserMessageId(null);
      setEditingMessageId(null);
      setInput("");
      setSelectedFiles([]);
      // Stop any ongoing speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      // Stop any ongoing speech recognition
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [isRecording]);


  if (!isLoggedIn) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGuestLogin={handleGuestLogin}
        authError={authError}
        isLoading={isAuthLoading}
        toggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
      />
    );
  }


  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI Chat {loggedInUsername && `(${loggedInUsername})`}</h1>
        <div className="flex space-x-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.459 4.582A2 2 0 0115 16h1a1 1 0 110 2h-1a2 2 0 01-1.732-1.036l-.003-.002zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13-3a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-6 4a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Start new chat"
            title="New Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-full bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-600 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "ai" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-700 flex items-center justify-center text-white text-sm font-bold">
                AI
              </div>
            )}
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md relative group ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              <MessageContent
                text={msg.text}
                messageId={msg.id}
                copyToClipboard={copyToClipboard}
                copiedMessageId={copiedMessageId}
                isUserMessage={msg.sender === "user"}
              />
              <div className="text-xs mt-1 opacity-75 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span>{formatTimestamp(msg.timestamp)}</span>
                  {msg.edited && <span className="italic">(edited)</span>}
                </div>
                {/* Action buttons for AI messages */}
                {msg.sender === "ai" && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSpeakAIResponse(msg.text, msg.id)}
                      className={`p-1 rounded-md hover:bg-opacity-20 hover:bg-current ${
                        speakingMessageId === msg.id ? 'text-blue-500 dark:text-blue-400' : ''
                      }`}
                      title={speakingMessageId === msg.id ? "Stop speaking" : "Speak message"}
                    >
                      {speakingMessageId === msg.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V9a1 1 0 011-1h1.586l4.707-4.707C10.923 3.647 11 4.1 11 5v14c0 .9-.077 1.353-.293 1.573L5.586 15z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className={`p-1 rounded-md hover:bg-opacity-20 hover:bg-current transition-opacity ${
                        copiedMessageId === msg.id ? 'opacity-100' : ''
                      }`}
                      title="Copy message"
                    >
                      {copiedMessageId === msg.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                {/* Action buttons for User messages */}
                {msg.sender === "user" && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {lastUserMessage?.id === msg.id && !isLoading && (
                      <button
                        onClick={() => handleEditMessage(msg.id, msg.text)}
                        className="p-1 rounded-md hover:bg-opacity-20 hover:bg-current"
                        title="Edit message"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 rounded-md hover:bg-opacity-20 hover:bg-current text-red-500"
                      title="Delete message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            {msg.sender === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-800 flex items-center justify-center text-white text-sm font-bold">
                You
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-700 flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-400 dark:bg-gray-500 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-gray-400 dark:bg-gray-500 rounded w-16 animate-pulse delay-100"></div>
                <div className="h-4 bg-gray-400 dark:bg-gray-500 rounded w-20 animate-pulse delay-200"></div>
              </div>
              <div className="text-xs mt-2 opacity-75">
                <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-12 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        {apiError && (
          <div className="flex justify-center">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100">
              Error: {apiError}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-md relative">
        {/* Disclaimer for file uploads */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
            Note: In this WebContainer environment, files are displayed but not actually uploaded or processed by the AI.
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="relative flex-1 flex items-center border border-gray-300 dark:border-gray-600 rounded-full p-1 pr-2 bg-white dark:bg-gray-700">
            {/* Plus button for menu */}
            <button
              type="button"
              onClick={() => setShowInputMenu(!showInputMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Open input options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent outline-none p-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Ask anything"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {/* Microphone button for Speech-to-Text */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleRecording}
                className={`p-2 rounded-full ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                } transition-colors`}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                title={isRecording ? "Stop recording" : "Start voice input"}
                disabled={isLoading}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <button
                type="submit" // Changed to submit button
                className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors"
                aria-label={editingMessageId ? "Save message" : "Send message"}
                title={editingMessageId ? "Save message" : "Send message"}
                disabled={isLoading || (input.trim() === "" && selectedFiles.length === 0)}
              >
                {editingMessageId ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Display selected files */}
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-800 dark:text-gray-200"
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.name)}
                  className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={`Remove file ${file.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload files"
        />

        {/* Input Menu Dropdown */}
        {showInputMenu && (
          <div
            ref={inputMenuRef}
            className="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-10 border border-gray-200 dark:border-gray-700"
          >
            <MenuItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              }
              text="Add photos & files"
              onClick={handleAddFilesClick}
            />
            <MenuItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              text="Create image"
              onClick={handleCreateImage}
            />
            <MenuItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l-7 7-7-7m7 7v10a1 1 0 01-1 1h-3" />
                </svg>
              }
              text="Think longer"
              onClick={handleThinkLonger}
            />
            <MenuItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              text="Deep research"
              onClick={handleDeepResearch}
            />
            <MenuItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.206 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.794 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.794 5 16.5 5c1.706 0 3.332.477 4.5 1.253v13C19.832 18.477 18.206 18 16.5 18s-3.332.477-4.5 1.253" />
                </svg>
              }
              text="Study and learn"
              onClick={handleStudyAndLearn}
            />
            {/* Removed "More" menu item */}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for menu items
const MenuItem: React.FC<{ icon: React.ReactNode; text: string; showArrow?: boolean; onClick?: () => void }> = ({ icon, text, showArrow = false, onClick }) => (
  <button
    className="flex items-center w-full px-4 py-2 text-left text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    onClick={onClick}
  >
    <span className="mr-3">{icon}</span>
    <span className="flex-1">{text}</span>
    {showArrow && (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    )}
  </button>
);
