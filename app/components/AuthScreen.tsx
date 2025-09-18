import React, { useState } from "react";

interface AuthScreenProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string) => void;
  onGuestLogin: () => void;
  authError: string | null;
  isLoading: boolean;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onRegister,
  onGuestLogin,
  authError,
  isLoading,
  toggleDarkMode,
  isDarkMode,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      onRegister(username, password);
    } else {
      onLogin(username, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 text-center">
      <h1 className="text-5xl font-extrabold mb-4 text-blue-600 dark:text-blue-400">
        Welcome to AI Chat
      </h1>
      <p className="text-xl mb-8 max-w-md">
        Your intelligent assistant, ready to help you with anything.
        Please {isRegistering ? "register" : "log in"} or proceed as a guest.
      </p>

      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {authError && (
            <p className="text-red-500 text-sm">{authError}</p>
          )}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white text-lg font-semibold rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-300 ease-in-out"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : (isRegistering ? "Register" : "Log In")}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-blue-500 dark:text-blue-400 hover:underline text-sm"
            disabled={isLoading}
          >
            {isRegistering ? "Already have an account? Log In" : "Don't have an account? Register"}
          </button>
          {!isRegistering && (
            <a href="#" className="w-full text-blue-500 dark:text-blue-400 hover:underline text-sm block">
              Forgot Password? (Demo)
            </a>
          )}
          <hr className="border-gray-300 dark:border-gray-700 my-4" />
          <button
            onClick={onGuestLogin}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-lg font-semibold rounded-md shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all duration-300 ease-in-out"
            disabled={isLoading}
          >
            Continue as Guest
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        {/* Dark Mode Toggle on Auth Screen */}
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
      </div>
    </div>
  );
};

export default AuthScreen;
