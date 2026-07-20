import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import "./App.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ApiData = Record<string, unknown>;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

const analysisSteps = [
  {
    title: "Preparing your image",
    description: "Checking image quality and visible details.",
  },
  {
    title: "Identifying the appliance",
    description: "Looking for the appliance type and recognizable features.",
  },
  {
    title: "Reading controls and labels",
    description: "Examining buttons, settings, symbols, and visible text.",
  },
  {
    title: "Checking for possible issues",
    description: "Looking for warning lights, error messages, or visible problems.",
  },
  {
    title: "Preparing helpful guidance",
    description: "Creating clear and safety-aware recommendations.",
  },
  {
    title: "Finalizing your results",
    description: "Organizing the analysis into easy-to-follow instructions.",
  },
] as const;

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function fetchJson(
  path: string,
  options: RequestInit,
  controller: AbortController,
  timeoutMs = 45_000,
): Promise<ApiData> {
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    let data: ApiData = {};

    if (contentType.includes("application/json")) {
      data = (await response.json()) as ApiData;
    }

    if (!response.ok) {
      const serverError =
        typeof data.error === "string" ? data.error : null;
      throw new Error(
        serverError ?? `Request failed with status ${response.status}.`,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out or was cancelled. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const normalizeMarkdown = (content: string) => {
  const dividerChars = "[-—–_=─━═┄┅┈┉╌╍╾╼]";
  const dividerOnly = new RegExp(`^\\s*${dividerChars}{3,}\\s*$`);
  const dividerAroundTitle = new RegExp(
    `^\\s*${dividerChars}{3,}\\s*(.+?)\\s*${dividerChars}{3,}\\s*$`,
  );
  const dividerBeforeTitle = new RegExp(
    `^\\s*${dividerChars}{3,}\\s*([A-Z][A-Z0-9 &/'’(),:+-]{2,})\\s*$`,
  );
  const dividerAfterTitle = new RegExp(
    `^\\s*([A-Z][A-Z0-9 &/'’(),:+-]{2,})\\s*${dividerChars}{3,}\\s*$`,
  );

  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();

      if (dividerOnly.test(trimmedLine)) {
        return "";
      }

      const surroundedHeading = trimmedLine.match(dividerAroundTitle);
      if (surroundedHeading) {
        return `## ${surroundedHeading[1].trim()}`;
      }

      const leadingDividerHeading = trimmedLine.match(dividerBeforeTitle);
      if (leadingDividerHeading) {
        return `## ${leadingDividerHeading[1].trim()}`;
      }

      const trailingDividerHeading = trimmedLine.match(dividerAfterTitle);
      if (trailingDividerHeading) {
        return `## ${trailingDividerHeading[1].trim()}`;
      }

      return line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const analysisInFlightRef = useRef(false);
  const chatInFlightRef = useRef(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  const [chatQuestion, setChatQuestion] = useState("");
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState("");

  const openScanner = () => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setIsScannerOpen(true);
  };

  const cancelActiveRequest = () => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    analysisInFlightRef.current = false;
    chatInFlightRef.current = false;
    setIsAnalyzing(false);
    setIsChatting(false);
  };

  const closeScanner = () => {
    cancelActiveRequest();
    setIsScannerOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearChat = () => {
    setChatQuestion("");
    setConversation([]);
    setChatError("");
    setIsChatting(false);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setAnalysisError("Please choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setAnalysisError("Please choose an image smaller than 8 MB.");
      event.target.value = "";
      return;
    }

    cancelActiveRequest();

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    const imageUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setAnalysisResult("");
    setAnalysisError("");
    clearChat();
  };

  const resetImage = () => {
    cancelActiveRequest();

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    setSelectedImage(null);
    setSelectedFile(null);
    setAnalysisResult("");
    setAnalysisError("");
    setIsAnalyzing(false);
    clearChat();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("The selected image could not be read."));
        }
      };

      reader.onerror = () => {
        reject(new Error("The selected image could not be read."));
      };

      reader.readAsDataURL(file);
    });
  };

  const analyzeAppliance = async () => {
    if (!selectedFile) {
      setAnalysisError("Please choose an appliance photo first.");
      return;
    }

    if (analysisInFlightRef.current) {
      return;
    }

    cancelActiveRequest();
    analysisInFlightRef.current = true;
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult("");
    clearChat();

    try {
      const imageBase64 = await convertFileToBase64(selectedFile);
      const data = await fetchJson(
        "/api/analyze-appliance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageBase64,
            question:
              "Identify this appliance or device. Explain what is visible, describe any controls, labels, warning lights, or error messages, and provide simple safety-aware troubleshooting guidance. Clearly say when professional service is recommended.",
          }),
        },
        controller,
      );

      if (
        typeof data.analysis !== "string" ||
        !data.analysis.trim()
      ) {
        throw new Error("The server returned an invalid analysis response.");
      }

      setAnalysisResult(data.analysis);
    } catch (error) {
      if (activeRequestRef.current !== controller) {
        return;
      }

      if (error instanceof Error) {
        setAnalysisError(error.message);
      } else {
        setAnalysisError("Something went wrong while analyzing the appliance.");
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        analysisInFlightRef.current = false;
        setIsAnalyzing(false);
      }
    }
  };

  const sendChatQuestion = async (suggestedQuestion?: string) => {
    const question = (suggestedQuestion ?? chatQuestion).trim();

    if (!question) {
      setChatError("Please enter a question.");
      return;
    }

    if (!analysisResult) {
      setChatError("Please analyze an appliance before asking a follow-up question.");
      return;
    }

    if (chatInFlightRef.current) {
      return;
    }

    chatInFlightRef.current = true;
    const controller = new AbortController();
    activeRequestRef.current = controller;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: question,
    };

    const priorConversation = conversation;
    setConversation((currentConversation) => [
      ...currentConversation,
      userMessage,
    ]);
    setChatQuestion("");
    setChatError("");
    setIsChatting(true);

    try {
      const data = await fetchJson(
        "/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            applianceAnalysis: analysisResult,
            conversation: priorConversation.map(({ role, content }) => ({
              role,
              content,
            })),
          }),
        },
        controller,
      );

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The server returned an invalid chat response.");
      }

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: data.answer,
      };

      setConversation((currentConversation) => [
        ...currentConversation,
        assistantMessage,
      ]);
    } catch (error) {
      if (activeRequestRef.current !== controller) {
        return;
      }

      setConversation(priorConversation);
      setChatQuestion(question);
      if (error instanceof Error) {
        setChatError(error.message);
      } else {
        setChatError("Something went wrong while answering your question.");
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        chatInFlightRef.current = false;
        setIsChatting(false);
      }
    }
  };

  const handleChatKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendChatQuestion();
    }
  };

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setAnalysisStep((currentStep) => {
        if (currentStep >= analysisSteps.length - 1) {
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 2200);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAnalyzing, analysisSteps.length]);

  useEffect(() => {
    if (!isScannerOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeScanner();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const modal = closeButtonRef.current?.closest(".scanner-modal");
      const focusable = modal?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isScannerOpen]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [conversation, isChatting]);

  return (
    <main className="app">
      <div className="page-glow page-glow-one" aria-hidden="true" />
      <div className="page-glow page-glow-two" aria-hidden="true" />

      <nav className="navbar page-container">
        <div className="brand">
          <div className="brand-logo">AI</div>

          <div>
            <p className="brand-name">AI Appliance Helper</p>
            <p className="brand-subtitle">
              Smart support for everyday devices
            </p>
          </div>
        </div>

        <button
          className="button button-small button-primary"
          type="button"
          onClick={openScanner}
        >
          Try the Demo
        </button>
      </nav>

      <section className="hero page-container">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Powered by AI vision
          </div>

          <h1>
            Your AI expert for
            <span> every appliance.</span>
          </h1>

          <p className="hero-description">
            Point your camera at any appliance and receive simple
            troubleshooting, control explanations, maintenance guidance, and
            safety-aware assistance.
          </p>

          <div className="hero-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={openScanner}
            >
              <span>📷</span>
              Scan an Appliance
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={openScanner}
            >
              <span>💬</span>
              Chat with AI
            </button>
          </div>

          <div className="trust-row">
            <span>✓ No manuals</span>
            <span>✓ Instant guidance</span>
            <span>✓ Safety focused</span>
          </div>
        </div>

        <div className="demo-area">
          <div className="demo-glow" />

          <div className="phone">
            <div className="phone-speaker" />

            <div className="phone-screen">
              <div className="phone-header">
                <span>×</span>
                <strong>Scan Appliance</strong>
                <span>•••</span>
              </div>

              <button
                className="camera-preview"
                type="button"
                onClick={openScanner}
                aria-label="Open appliance scanner"
              >
                <span className="scan-corner scan-top-left" />
                <span className="scan-corner scan-top-right" />
                <span className="scan-corner scan-bottom-left" />
                <span className="scan-corner scan-bottom-right" />

                <div className="washer">
                  <div className="washer-panel">
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="washer-door">
                    <div className="washer-window" />
                  </div>
                </div>

                <div className="detected-label">
                  <span />
                  Washer detected
                </div>
              </button>

              <div className="diagnosis-card">
                <div className="diagnosis-heading">
                  <div className="diagnosis-icon">✨</div>

                  <div>
                    <p>AI diagnosis</p>
                    <h2>Door is not locking</h2>
                  </div>
                </div>

                <p className="diagnosis-text">
                  Check that no clothing is trapped near the door seal, then
                  close the door firmly.
                </p>

                <button
                  className="diagnosis-button"
                  type="button"
                  onClick={openScanner}
                >
                  View step-by-step help
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section page-container">
        <div className="section-heading">
          <p className="section-eyebrow">Simple by design</p>
          <h2>Get help in three easy steps</h2>

          <p>
            No model-number searches, long manuals, or confusing technical
            language.
          </p>
        </div>

        <div className="steps-grid">
          <article className="content-card">
            <span className="step-number">1</span>
            <div className="card-icon">📷</div>
            <h3>Point your camera</h3>

            <p>
              Take a clear photo of an appliance, control panel, label, or
              error message.
            </p>
          </article>

          <article className="content-card">
            <span className="step-number">2</span>
            <div className="card-icon">✨</div>
            <h3>AI understands it</h3>

            <p>
              The assistant identifies the appliance and interprets visible
              controls or problems.
            </p>
          </article>

          <article className="content-card">
            <span className="step-number">3</span>
            <div className="card-icon">🛠️</div>
            <h3>Get clear guidance</h3>

            <p>
              Receive practical instructions, explanations, and safety-aware
              recommendations.
            </p>
          </article>
        </div>
      </section>

      <section className="section page-container">
        <div className="section-heading">
          <p className="section-eyebrow">One assistant, many uses</p>
          <h2>Help for appliances, controls, and everyday technology</h2>
        </div>

        <div className="capabilities-grid">
          <article className="content-card">
            <div className="card-icon">🔎</div>
            <h3>Identify appliances</h3>
            <p>
              Recognize appliance types, controls, labels, and visible model
              details.
            </p>
          </article>

          <article className="content-card">
            <div className="card-icon">⚙️</div>
            <h3>Explain controls</h3>
            <p>
              Understand unfamiliar buttons, settings, modes, and symbols.
            </p>
          </article>

          <article className="content-card">
            <div className="card-icon">🧰</div>
            <h3>Troubleshoot issues</h3>
            <p>
              Receive guided checks for common problems and error messages.
            </p>
          </article>

          <article className="content-card">
            <div className="card-icon">🛡️</div>
            <h3>Stay safe</h3>
            <p>
              See important warnings and know when a professional is needed.
            </p>
          </article>

          <article className="content-card">
            <div className="card-icon">🌎</div>
            <h3>Use your language</h3>
            <p>
              Designed for simple multilingual and voice-based assistance.
            </p>
          </article>

          <article className="content-card">
            <div className="card-icon">🚗</div>
            <h3>Understand your car</h3>
            <p>
              Explore dashboard controls, warning indicators, and upgrades.
            </p>
          </article>
        </div>
      </section>

      <section className="final-cta page-container">
        <div>
          <p className="section-eyebrow final-eyebrow">
            Ready when you need help
          </p>

          <h2>Stop searching. Start scanning.</h2>

          <p>
            Turn any confusing appliance or control panel into a clear,
            guided conversation.
          </p>
        </div>

        <button
          className="button button-light"
          type="button"
          onClick={openScanner}
        >
          <span>📷</span>
          Scan an Appliance
        </button>
      </section>

      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleImageChange}
      />

      {isScannerOpen && (
        <div
          className="scanner-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scanner-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeScanner();
            }
          }}
        >
          <div className="scanner-modal">
            <div className="scanner-header">
              <div>
                <p>AI Appliance Helper</p>
                <h2 id="scanner-title">Scan an appliance</h2>
              </div>

              <button
                ref={closeButtonRef}
                className="scanner-close"
                type="button"
                onClick={closeScanner}
                aria-label="Close scanner"
              >
                ×
              </button>
            </div>

            {!selectedImage ? (
              <div className="upload-area">
                <div className="upload-icon">📷</div>

                <h3>Take or upload a clear photo</h3>

                <p>
                  Include the appliance, control panel, model label, or error
                  message you need help understanding.
                </p>

                <button
                  className="button button-primary"
                  type="button"
                  onClick={openFilePicker}
                >
                  Choose a Photo
                </button>

                <small>
                  Tip: Use good lighting and keep important text visible.
                </small>
              </div>
            ) : (
              <div className="preview-section">
                <div className="image-preview">
                  <img src={selectedImage} alt="Selected appliance" />
                  <div className="scan-line" aria-hidden="true" />
                </div>

                {!analysisResult && !analysisError && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`preview-status ${
                      isAnalyzing ? "preview-status-analyzing" : ""
                    }`}
                  >
                    <span />

                    <div className="analysis-progress-content">
                      <strong>
                        {isAnalyzing
                          ? analysisSteps[analysisStep].title
                          : "Photo ready"}
                      </strong>

                      <p>
                        {isAnalyzing
                          ? analysisSteps[analysisStep].description
                          : "The image is ready for AI appliance analysis."}
                      </p>

                      {isAnalyzing && (
                        <>
                          <div className="analysis-progress-bar">
                            <div
                              className="analysis-progress-fill"
                              style={{
                                width: `${
                                  ((analysisStep + 1) /
                                    analysisSteps.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>

                          <small className="analysis-progress-step">
                            Step {analysisStep + 1} of {analysisSteps.length}
                          </small>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="diagnosis-card" role="alert">
                    <div className="diagnosis-heading">
                      <div className="diagnosis-icon">⚠️</div>

                      <div>
                        <p>Analysis error</p>
                        <h2>Unable to analyze the image</h2>
                      </div>
                    </div>

                    <p className="diagnosis-text">{analysisError}</p>
                  </div>
                )}

                {analysisResult && (
                  <>
                    <div className="diagnosis-card">
                      <div className="diagnosis-heading">
                        <div className="diagnosis-icon">✨</div>

                        <div>
                          <p>AI appliance analysis</p>
                          <h2>Analysis complete</h2>
                        </div>
                      </div>

                      <div className="diagnosis-text main-response-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {normalizeMarkdown(analysisResult)}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="appliance-chat">
                      <div className="chat-heading">
                        <div className="diagnosis-icon">💬</div>

                        <div>
                          <p>Continue the conversation</p>
                          <h2>Ask about this appliance</h2>
                        </div>
                      </div>

                      {conversation.length === 0 && (
                        <div className="quick-questions">
                          <button
                            type="button"
                            onClick={() =>
                              void sendChatQuestion(
                                "Explain the visible buttons and controls.",
                              )
                            }
                            disabled={isChatting}
                          >
                            Explain the controls
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void sendChatQuestion(
                                "What maintenance should I do regularly?",
                              )
                            }
                            disabled={isChatting}
                          >
                            Maintenance help
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void sendChatQuestion(
                                "What common problem should I check first?",
                              )
                            }
                            disabled={isChatting}
                          >
                            Troubleshoot a problem
                          </button>
                        </div>
                      )}

                      {conversation.length > 0 && (
                        <div className="chat-messages" aria-live="polite">
                          {conversation.map((message) => (
                            <div
                              className={`chat-message-row ${
                                message.role === "user"
                                  ? "chat-message-row-user"
                                  : "chat-message-row-assistant"
                              }`}
                              key={message.id}
                            >
                              {message.role === "assistant" && (
                                <div
                                  className="chat-avatar chat-avatar-assistant"
                                  aria-hidden="true"
                                >
                                  AI
                                </div>
                              )}

                              <div
                                className={`chat-message ${
                                  message.role === "user"
                                    ? "chat-message-user"
                                    : "chat-message-assistant"
                                }`}
                              >
                                <strong className="chat-message-name">
                                  {message.role === "user"
                                    ? "You"
                                    : "AI Appliance Helper"}
                                </strong>

                                {message.role === "assistant" ? (
                                  <div className="markdown-message">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {normalizeMarkdown(message.content)}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <p>{message.content}</p>
                                )}
                              </div>

                              {message.role === "user" && (
                                <div
                                  className="chat-avatar chat-avatar-user"
                                  aria-hidden="true"
                                >
                                  You
                                </div>
                              )}
                            </div>
                          ))}

                          {isChatting && (
                            <div className="chat-message-row chat-message-row-assistant">
                              <div
                                className="chat-avatar chat-avatar-assistant"
                                aria-hidden="true"
                              >
                                AI
                              </div>

                              <div className="chat-message chat-message-assistant">
                                <strong className="chat-message-name">
                                  AI Appliance Helper
                                </strong>

                                <div
                                  className="typing-indicator"
                                  aria-label="AI is thinking"
                                >
                                  <span />
                                  <span />
                                  <span />
                                </div>
                              </div>
                            </div>
                          )}

                          <div ref={chatEndRef} />
                        </div>
                      )}

                      {chatError && (
                        <div className="chat-error" role="alert">
                          ⚠️ {chatError}
                        </div>
                      )}

                      <div className="chat-input-row">
                        <textarea
                          value={chatQuestion}
                          onChange={(event) =>
                            setChatQuestion(event.target.value)
                          }
                          onKeyDown={handleChatKeyDown}
                          placeholder="Ask about controls, settings, maintenance, or a problem..."
                          rows={2}
                          maxLength={1500}
                          disabled={isChatting}
                          aria-label="Ask a follow-up question"
                        />

                        <button
                          className="button button-primary"
                          type="button"
                          onClick={() => void sendChatQuestion()}
                          disabled={
                            isChatting || !chatQuestion.trim()
                          }
                        >
                          {isChatting ? "Sending..." : "Send"}
                        </button>
                      </div>

                      <small className="chat-hint">
                        Press Enter to send. Use Shift + Enter for a new
                        line.
                      </small>
                    </div>
                  </>
                )}

                <div className="preview-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={resetImage}
                    disabled={isAnalyzing || isChatting}
                  >
                    Choose Another
                  </button>

                  <button
                    className="button button-primary"
                    type="button"
                    onClick={analyzeAppliance}
                    disabled={isAnalyzing || isChatting}
                  >
                    {isAnalyzing
                      ? "Analyzing..."
                      : analysisResult
                        ? "Analyze Again"
                        : "Analyze Appliance"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
